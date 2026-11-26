"""In-process limiter for failed sign-in attempts.

Counts failures per key (a client IP, a username) inside a sliding window.
Once a key has reached its limit, further attempts are refused until the
oldest counted failure falls out of the window.

The counts live in this worker's memory. They are not shared between gunicorn
workers and are lost on restart, so with N workers a client can make up to N
times the limit before every worker refuses it. render.yaml runs one worker,
which makes the limit exact there.
"""

import math
import threading
import time
from collections import deque


class FailedAttemptLimiter:
    def __init__(self, limits, window_seconds, max_keys=20_000, clock=time.monotonic):
        """
        limits: maximum failures per kind of key inside the window,
            for example {"ip": 30, "name": 5}.
        window_seconds: how far back failures count.
        max_keys: memory bound. Past it, keys with no failure inside the window
            are dropped first, then the keys whose last failure is oldest.
        clock: returns seconds; injectable for tests.
        """
        self.limits = dict(limits)
        self.window = window_seconds
        self.max_keys = max_keys
        self.clock = clock
        self._lock = threading.Lock()
        # key -> deque of failure times, ordered by most recent failure last
        self._failures = {}

    @staticmethod
    def _key(kind, value):
        if kind == "name":
            # names are matched exactly in the database; folding case here
            # only makes the limit stricter. The cap keeps huge names cheap.
            value = value.strip().casefold()[:256]
        return (kind, value)

    def _keys(self, values):
        return [
            self._key(kind, value)
            for kind, value in values.items()
            if value and kind in self.limits
        ]

    def _drop_expired(self, key, now):
        times = self._failures.get(key)
        if times is None:
            return None
        while times and times[0] <= now - self.window:
            times.popleft()
        if not times:
            del self._failures[key]
            return None
        return times

    def blocked_for(self, **values):
        """Seconds until every given key may try again, or 0 if none is blocked."""
        now = self.clock()
        wait = 0.0
        with self._lock:
            for key in self._keys(values):
                times = self._drop_expired(key, now)
                if times is not None and len(times) >= self.limits[key[0]]:
                    wait = max(wait, times[0] + self.window - now)
        return int(math.ceil(wait)) if wait > 0 else 0

    def record_failure(self, **values):
        now = self.clock()
        with self._lock:
            for key in self._keys(values):
                times = self._drop_expired(key, now)
                if times is None:
                    times = deque(maxlen=self.limits[key[0]])
                else:
                    # re-insert so the dict stays ordered by latest failure
                    del self._failures[key]
                times.append(now)
                self._failures[key] = times
            self._enforce_max_keys(now)

    def reset(self, **values):
        """Forget the failures for these keys, e.g. a name after a correct password."""
        with self._lock:
            for key in self._keys(values):
                self._failures.pop(key, None)

    def clear(self):
        with self._lock:
            self._failures.clear()

    def _enforce_max_keys(self, now):
        if len(self._failures) <= self.max_keys:
            return
        # oldest latest-failure first, so expired keys come first
        for key in list(self._failures):
            if len(self._failures) <= self.max_keys:
                return
            times = self._failures[key]
            if times[-1] <= now - self.window:
                del self._failures[key]
            else:
                break
        while len(self._failures) > self.max_keys:
            del self._failures[next(iter(self._failures))]


def too_many_attempts_message(seconds):
    minutes = max(1, int(math.ceil(seconds / 60)))
    unit = "minute" if minutes == 1 else "minutes"
    return f"Too many attempts, try again in {minutes} {unit}"
