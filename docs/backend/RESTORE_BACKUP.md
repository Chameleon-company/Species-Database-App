# Restore the production backup into a new Supabase project

Ticket: SDA-S01. This guide restores the backup of the production database and Storage files into a fresh Supabase project. The steps were tested once on a scratch project on 20 Nov 2026 (results at the end).

Never run the restore commands against the production project. Every command below takes the project ref of the **new** project, so check it before each run.

## What the backup contains

The backup is one encrypted 7-Zip archive, `sda-prod-2026-11-18.7z` (about 424 MiB, 429 MiB unpacked). It was taken on 18 Nov 2026 from production, which ran Postgres 17.6.

| Item | What it is |
| --- | --- |
| `sda-prod.dump` | `pg_dump` custom-format dump of the `public` and `backup` schemas |
| `row-counts.txt` | Row counts of the main tables at dump time |
| `species_images/Photos/` | 83 `.webp` photos, one folder per species |
| `media/videos/` | 12 `.mp4` videos |
| `species_videos/` | 12 `.mp4` videos, apparently the same files as `media/videos` under different names |

Row counts at dump time:

| Table | Rows |
| --- | --- |
| `species_en` | 22 |
| `species_tet` | 27 (5 orphan rows, see SDA-S07) |
| `media` | 93 |
| `changelog` | 425 |
| `users` | 18 |

The `users` table holds password hashes and `admin_sessions` holds session tokens, so the archive must stay encrypted. Never commit the archive, the dump or the Storage files to the repo, and never upload them to a Supabase bucket.

Where to get it:

* Archive: the xPand-owned Google Drive folder (the link is on the SDA-S01 Trello card).
* Password: held by the lead and xPand. It is never written in the repo, Trello, GitHub or Teams.
* Integrity check, SHA-256 of the archive: `E3BD3F36A3222DE141623113A640ECF51BDBF811F56620A9FB52B526C56BB04E`

## What you need

* Windows PowerShell.
* Docker Desktop, running. The `postgres:17` image is used for `pg_restore` and `psql`, so Postgres does not need to be installed.
* 7-Zip.
* The repo checked out and `pnpm.cmd install` run once from the repo root. This provides the Supabase CLI (`pnpm.cmd supabase`).
* A Supabase account that is not an owner or administrator of two other active Free projects. The Free plan counts active projects per person across all organisations, so a third one is refused.

## Step 1: Check and unpack the archive

Run from any folder. Replace the paths if you saved the archive elsewhere.

```powershell
Get-FileHash -Algorithm SHA256 "C:\restore\sda-prod-2026-11-18.7z"
```

The hash must equal the SHA-256 value above. If it does not, download the file again.

Read the password at a hidden prompt, so it never appears in the command or in the PowerShell history:

```powershell
$pw = Read-Host "Archive password" -AsSecureString
```

```powershell
$plain = [System.Net.NetworkCredential]::new("", $pw).Password
```

```powershell
& "C:\Program Files\7-Zip\7z.exe" x "-p$plain" "-oC:\restore\sda-prod-2026-11-18" "C:\restore\sda-prod-2026-11-18.7z"
```

```powershell
Remove-Variable plain, pw
```

Do not use `7z x -p` without a value. The archive has encrypted file names, and without the password in the command 7-Zip fails instead of asking.

## Step 2: Create the new project

1. In the Supabase dashboard, create a project on the Free plan. Save the database password.
2. Copy the **Reference ID** from Project Settings, General.
3. Open **Connect**, choose **Session pooler**, and copy the host (it looks like `aws-0-<region>.pooler.supabase.com`). The Session pooler works over IPv4, which Docker on Windows needs. The direct host is IPv6 only.

The rest of this guide writes `<ref>` for the new project's Reference ID and `<pooler-host>` for that host.

## Step 3: Restore the database

Put the new project's database password in this window only:

```powershell
$env:PGPASSWORD = "<new-project-db-password>"
```

Restore. This reads from the folder you unpacked in Step 1:

```powershell
docker run --rm -e PGPASSWORD -v "C:\restore\sda-prod-2026-11-18:/backup" postgres:17 pg_restore --no-owner --no-privileges --dbname "host=<pooler-host> port=5432 user=postgres.<ref> dbname=postgres sslmode=require" /backup/sda-prod.dump
```

One error is expected and harmless: `schema "public" already exists`. Every new Supabase project already has a `public` schema, and the restore then reports `errors ignored on restore: 1`. Any other error needs investigating.

The flags are deliberate. `--no-owner` and `--no-privileges` stop the restore from trying to set ownership and grants for roles that do not exist in the new project. Do not add `--clean`, because it would drop the `public` schema that Supabase manages.

## Step 4: Check the database

Run from any folder:

```powershell
docker run --rm -e PGPASSWORD postgres:17 psql "host=<pooler-host> port=5432 user=postgres.<ref> dbname=postgres sslmode=require" -c "select 'species_en' as tbl, count(*) from species_en union all select 'species_tet', count(*) from species_tet union all select 'media', count(*) from media union all select 'changelog', count(*) from changelog union all select 'users', count(*) from users;"
```

The counts must match the table above (22, 27, 93, 425, 18). Then check that every table came across with row-level security on:

```powershell
docker run --rm -e PGPASSWORD postgres:17 psql "host=<pooler-host> port=5432 user=postgres.<ref> dbname=postgres sslmode=require" -c "select schemaname, tablename, rowsecurity from pg_tables where schemaname in ('public','backup') order by 1,2;"
```

Expect 11 tables: 3 in `backup` (`media_20261112`, `species_en_20261112`, `species_tet_20261112`, `rowsecurity` false) and 8 in `public` (`rowsecurity` true on all of them). There are no policies, which matches production: the API uses the service key, which bypasses row-level security.

Clear the password:

```powershell
Remove-Item Env:PGPASSWORD
```

## Step 5: Restore the Storage files

Production has three buckets: `species_images`, `media` and `species_videos`. All three are public, with no file size limit set (the 50 MB default applies), any file type allowed, and no policies. The dump does not contain bucket settings, so create them by hand.

1. In the new project's dashboard, open Storage and create the three buckets above.
2. Switch on **Public bucket** for each one. A private bucket answers every public URL with `Bucket not found`, and the app builds public URLs.
3. Log the CLI in with the account that owns the new project. Run from the repo root:

```powershell
Set-Location "<path-to-repo>"
```

```powershell
pnpm.cmd supabase login
```

4. Upload the files. Run these from the folder you unpacked in Step 1. Use relative source paths, because this CLI version refuses a destination or source that starts with a Windows drive letter (`Unsupported operation`). Every `storage` command needs `--experimental`, and `--remote=<ref>` selects the new project.

```powershell
Set-Location "C:\restore\sda-prod-2026-11-18"
```

```powershell
& "<path-to-repo>\node_modules\.bin\supabase.cmd" storage cp --experimental -r -j 4 --remote=<ref> ".\species_images\Photos" "ss:///species_images/Photos"
```

```powershell
& "<path-to-repo>\node_modules\.bin\supabase.cmd" storage cp --experimental -r -j 4 --remote=<ref> ".\media\videos" "ss:///media/videos"
```

```powershell
& "<path-to-repo>\node_modules\.bin\supabase.cmd" storage cp --experimental -r -j 4 --remote=<ref> ".\species_videos" "ss:///species_videos"
```

## Step 6: Check the Storage files

Each command prints one number:

```powershell
"species_images: " + (& "<path-to-repo>\node_modules\.bin\supabase.cmd" storage ls --experimental -r --remote=<ref> "ss:///species_images" | Where-Object { $_ -like '/*' }).Count
```

```powershell
"media: " + (& "<path-to-repo>\node_modules\.bin\supabase.cmd" storage ls --experimental -r --remote=<ref> "ss:///media" | Where-Object { $_ -like '/*' }).Count
```

```powershell
"species_videos: " + (& "<path-to-repo>\node_modules\.bin\supabase.cmd" storage ls --experimental -r --remote=<ref> "ss:///species_videos" | Where-Object { $_ -like '/*' }).Count
```

Expect 83, 12 and 12. Then open one photo and one video from the public URL and check both load (each should return HTTP 200):

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" "https://<ref>.supabase.co/storage/v1/object/public/species_images/Photos/Tectona_grandis/01.webp"
```

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" "https://<ref>.supabase.co/storage/v1/object/public/species_videos/Albizia_lebbeck.mp4"
```

## After the restore

The new project is a copy, not a replacement, until the apps are pointed at it.

* **New URL and keys.** The new project has its own URL, publishable key and secret key. Set `SUPABASE_URL` and `SUPABASE_KEY` for the API, and the matching values for the admin and field apps. Keys are never committed.
* **Media links still point at the old project.** The `media` rows store full public URLs in `download_link` and `streaming_link`, as written by the upload route. After a restore they still name the old project's host, so the new Storage files are not used until the rows are rewritten. Check what they hold first:

```powershell
docker run --rm -e PGPASSWORD postgres:17 psql "host=<pooler-host> port=5432 user=postgres.<ref> dbname=postgres sslmode=require" -c "select media_id, download_link from media order by media_id limit 5;"
```

  If the links name the old host, rewrite them with the old and new hosts filled in:

```sql
update public.media
set download_link = replace(download_link, 'https://<old-ref>.supabase.co', 'https://<ref>.supabase.co'),
    streaming_link = replace(streaming_link, 'https://<old-ref>.supabase.co', 'https://<ref>.supabase.co');
```

  Writing `media` directly does not create a `changelog` entry. That is fine for a disaster recovery where every phone has to be pointed at the new project anyway. In any other case, route the change through the API so it calls `log_change`, otherwise phones never receive it.
* **Admin sign-in.** The `users` table is restored, so the current admin sign-in works. Supabase Auth (`auth` schema) was not part of the backup. Admin sign-in moves to Supabase Auth in SDA-B05, so after that card the Auth users have to be recreated separately.
* **Bucket settings are not in the dump.** Keep Step 5 in step with the production bucket settings if they change.
* **The `backup` schema** holds the pre-migration copies (the table names end in `20261112`) and is dropped only after SDA-R03 is merged and verified. It is in this backup so a restore matches production exactly.

## Troubleshooting

| Message | Cause and fix |
| --- | --- |
| `schema "public" already exists` | Expected, ignore it |
| `password authentication failed` | Wrong database password, or the project is still starting. Wait a minute |
| `Tenant or user not found` | Wrong `<ref>` or `<pooler-host>`. Copy both again from Connect |
| `Cannot open encrypted archive. Wrong password?` | Wrong password, or `-p` was used without a value (see Step 1) |
| `Unsupported operation` from `storage cp` | A path starts with a drive letter. Use relative paths from the unpacked folder |
| `must set the --experimental flag` | Add `--experimental` to every `storage` command |
| `Bucket not found` on a public URL | The bucket is private. Switch on Public bucket |
| Cannot create a project | Free plan limit per person across all organisations. Use another account |

## Restore test result (20 Nov 2026)

The backup of production was restored into a new Free project (Postgres 17.12) following this guide.

| Check | Result |
| --- | --- |
| `pg_restore` | One ignored error, `schema "public" already exists` |
| Row counts | 22 / 27 / 93 / 425 / 18, identical to production |
| Tables | 11 present, row-level security on for all 8 `public` tables |
| `species_images` | 83 files, same names as production |
| `media` | 12 files, same names as production |
| `species_videos` | 12 files, same names as production |
| Public URLs | A photo and a video loaded after the buckets were set to public |

Screenshots are attached to the SDA-S01 Trello card.
