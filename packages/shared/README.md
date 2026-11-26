# @sda/shared

Species, media and bundle types for the admin, the field app and the API.

```
packages/shared/
  src/database.ts   Generated from the database. Do not edit it by hand
  src/species.ts    Species row and its text field names
  src/media.ts      Media row, with media_type limited to image or video
  src/bundle.ts     Body of GET /api/bundle
```

Import each type from its own file with `import type`, for example `import type { Species } from "@sda/shared/species"`.

## Change the database schema

`services/flask-api/TableSchema.sql` is the source of the schema.
After you change it, generate the types again:

1. Run `pnpm supabase db start`.
2. Run `pnpm gen:types`.
3. Commit `src/database.ts` with the schema change.

The Database types workflow fails a pull request when `src/database.ts` does not match `TableSchema.sql`.
