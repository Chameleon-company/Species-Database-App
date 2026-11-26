# @sda/shared

Species, media and bundle types for the admin and the field app.
The Flask API is Python and does not use this package.

```
packages/shared/
  src/database.ts   Generated from the database by pnpm gen:types. Do not edit it by hand
  src/species.ts    Species row and its text field names
  src/media.ts      Media row, with media_type limited to image or video
  src/bundle.ts     Body of GET /api/bundle
```

Import each type from its own file with `import type`, for example `import type { Species } from "@sda/shared/species"`.
The package holds types only.
Do not add a value export, because it would ship in the field app's first-load bundle.

## Change the database schema

`services/flask-api/TableSchema.sql` is the snapshot of the intended schema, and the local database loads it.
Each migration in `services/flask-api/migrations/` updates the snapshot in the same commit.
The types describe this snapshot, not the state of the production database.

After you change the snapshot, generate the types again:

1. Run `pnpm supabase db reset`, or `pnpm supabase db start` when the database is not running.
2. Run `pnpm gen:types`.
3. Commit `src/database.ts` and `apps/api/src/db/schema.ts` with the schema change.

The Database types workflow fails a pull request when `src/database.ts` does not match the snapshot.
It does not check the `media_type` narrowing in `src/media.ts`.
Change that narrowing by hand when you change the `media_media_type_check` constraint.
