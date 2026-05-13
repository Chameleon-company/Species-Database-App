import { useEffect, useRef } from "react";
import { pushHardwareBackHandler } from "./hardwareBackStack";

/**
 * Register a handler for the Android hardware / gesture back button (via Capacitor).
 * Return true if the event was consumed (e.g. closed a dialog).
 */
export function useHardwareBack(handler: () => boolean, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled) return;
    return pushHardwareBackHandler(() => ref.current());
  }, [enabled]);
}
