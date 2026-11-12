# Merge review: `backend` into `master`

**Prepared by:** Byron Ehrhardt (s224341683), Backend Lead
**For:** Keane Lafourcade, Project Leader
**Branch:** `backend` · **Target:** `master`
**Date:** 10 August 2026

This is the page to read before approving. It says what is in the merge, what
I checked and how, what I did not fix, and the one thing that has to happen in
the right order or the app breaks on deploy.

Everything below can be re-run. None of it needs my machine and none of it
touches Supabase.

---

## What you are approving

Six backend features that have been sitting on this branch since the April
fork, plus the work that came out of getting them ready.

| | |
|---|---|
| Review diff against `master` | 12 files, +1,957 / −31 |
| Commits the PR will list | 20, being the branch history since the 1 April fork |
| Of those, mine | 7 |
| New endpoints | 6 |
| Endpoints lost | 0 |
| Tests | 32, all offline |

The branch already contains `master`, so you are reviewing the features, not
four months of drift. The 20 commits look like a lot for a 12 file diff, and
that is just the fork showing: 13 of them are other people's work that was
merged into this branch back in April and May and never reached `master`.
The files are the thing to read, not the commit list.

---

## The four checks

### 1. Do the features still work

Not just "does the route exist". `backend/tests/test_feature_behaviour.py`
drives each endpoint through Flask's test client against a fake Supabase that
records every write, then asserts on what was actually written.

- `definition` and `definition_tetum` reach both language tables on create,
  and survive an edit through the English and Tetum update endpoints
- new media starts at `storage_version` 1
- replacing the stored file bumps the version, a caption edit does not
- the read endpoints return the version so the PWA can see it

That middle pair matters more than it looks. A version that bumps on every
edit still passes a naive test, and it would quietly make every field device
re-download its whole media bundle.

### 2. Do the bug fixes still hold, and do they conflict

Three fixes, all in code originally written by Antony20070228, credited to his
commits in the history.

- **Filter injection** in `GET /api/species/search`. A query of
  `x,species_id.gte.0` used to append its own OR term and return the whole
  table, unauthenticated. Values are quoted and escaped, the query is length
  capped, results capped at 50.
- **SSRF** in `validate_media_url`. It would fetch any URL it was handed,
  including `169.254.169.254`. Now http/https only, resolved address must be
  public, redirects refused.
- **Error disclosure** on `GET /health`, which returned `str(e)` to anyone.

And one of my own, added after the first review pass. The two video endpoints
are mine, they take `download_link` and `streaming_link` straight from the
request body, and they were never wired up to the URL checking above, so they
would happily store an address on the server's own network. Being admin only
makes that less severe than the search hole, not acceptable. The scheme and
destination half of `validate_media_url` is now `validate_url_target` and both
routes call it. The content-type half is deliberately left out, because these
links are share pages rather than direct video files and would fail it.

Plus the one that is live on `master` right now: `POST /upload-species` is an
admin-only bulk import with its `get_admin_user` guard commented out. PR #203
fixed it in April and never landed. `master` has 5 active guards in `app.py`,
this branch has 6.

No conflict with anything currently on `master`. `git merge-tree` reports a
clean merge, and `backend/auth_authz.py` is byte identical on both sides
(`ef41b17`), so your auth build-out is untouched by this.

### 3. Compatibility with what has changed since

`master` moved 90 commits between the fork and now. Those are merged in
already, and `master` has not moved since, so there is nothing to re-sync.

The check that actually answers "did we lose anything" is the route table,
because a route table is something the app produces at runtime and reading the
source will not tell you:

| | Routes |
|---|---|
| `master` alone | 29 |
| `backend` before the sync | 32, missing 3 of master's auth routes |
| this branch | 35 |

35 is master's 29 plus the 6 new ones, with none of master's lost. The three
the old branch was missing were `/api/admin/session-audit`,
`/api/auth/admin-logout` and `/api/auth/admin-refresh`, and all three are
present now. Counts exclude Flask's built-in `static` route.

`backend/docs/API.md` documents all 35, and I checked that list against the
live route table rather than against my memory of it. No undocumented
endpoints, no documented endpoints that do not exist.

### 4. Tested

```bash
python -m unittest discover -s backend/tests -v     # 32 tests
bash backend/migrations/test_migration.sh           # 12 checks, needs local psql
```

32 pass here. Run the same suite against `master` and it fails, which is the
point: `test_merge_readiness` gives 2 failures and 15 errors there, and
`test_feature_behaviour` gives 9 failures and 1 error. A suite that has never
failed has not been shown capable of failing.

The migration harness builds its own throwaway PostgreSQL cluster, seeds it
from master's schema, applies, checks the backfill and the constraints,
re-applies for idempotency, rolls back twice and confirms no rows were lost.
12 of 12 on PostgreSQL 14.22. It never reads `.env`.

---

## Do this in order

**Apply `backend/migrations/001` to the target database before merging the
code.** The code reads three columns that do not exist yet:
`species_en.definition`, `species_tet.definition` and `media.storage_version`.
Migration 001 is additive, idempotent and transactional, so applying it early
is safe and the app keeps running.

For a rollback, reverse it. Revert the code first, then the schema.

---

## Yours to decide, not mine

Two calls in this are yours, and I have deliberately not made either even
though I hold a key that would let me.

1. **Which database receives migration 001.** I cannot currently name whether
   our shared Supabase project is production, staging or shared development,
   which is exactly why I tested against a throwaway cluster instead.
2. **When it merges.**

---

## Not fixed, on purpose

These are unauthenticated on `master` today. They are byte identical to
master, this merge does not introduce them, and they are worse than anything
it fixes:

- `/api/users`, all four methods. `GET` discloses every user's name, role and
  status. `DELETE` removes accounts.
- the analytics endpoints
- `POST /species` and `POST /audit-species`
- `GET /api/auth/user-state`, which takes `user_id` from the query string

I left them out so this review stays small enough to actually get reviewed.
Fixing them means touching several people's code and changing the
authorisation model, which is a different decision and deserves its own PR.
They are written up under Known gaps in `backend/docs/API.md` so the finding
survives whether or not I do.

---

## If you want to check it yourself

```bash
git fetch upstream
git checkout -b review upstream/backend

# nothing of master's was lost
git diff upstream/master...HEAD --stat

# your auth module is untouched
git diff upstream/master HEAD -- backend/auth_authz.py    # empty

python -m unittest discover -s backend/tests -v
bash backend/migrations/test_migration.sh
```
