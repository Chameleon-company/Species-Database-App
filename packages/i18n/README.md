# @sda/i18n

English and Tetum interface text.
The admin reads its text from this package.

```
packages/i18n/
  messages/en.json         English text, one flat key per string
  messages/tet.json        Tetum text, the same keys as en.json
  src/translate.ts         Typed keys and translate(locale, key, params)
  src/catalogs.test.ts     Fails when the two files drift apart
```

`en.json` is the source.
Its keys set the `MessageKey` type.
`translate` and the admin `t` accept only a `MessageKey`.
An unknown key in a call to them fails the TypeScript build.

## Fix or add a Tetum translation

You only edit `messages/tet.json`.
You do not need to read or change any TypeScript.

1. Open `packages/i18n/messages/tet.json` on GitHub and select the pencil icon.
2. Find the key.
   `messages/en.json` has the English text for the same key.
3. Change only the text on the right of the colon.
4. Keep each `{name}` placeholder exactly as it is in English.
   You can move it inside the sentence.
5. Commit the change to a new branch and open a pull request.

The CI check tells you if the file has a problem.
For example, `tet has every English key` lists each key that is missing from `tet.json`.

Keep these rules:

- Do not change or remove a key, the text on the left of the colon.
- Keep the straight double quotes around the key and the text.
- Put a comma after each line, except the last one.
- Do not leave a value empty.
  Ask for help if you do not know the Tetum text.

## Add a string

1. Add the key and the English text to `messages/en.json`.
2. Add the same key and the Tetum text to `messages/tet.json`.
3. Use the key in the app.

Use a camelCase key that names what the text is for, such as `deleteEntry`.

In the admin, `useLanguage()` gives `t` for the current language:

```tsx
const { t } = useLanguage();

t("deleteEntry");
```

Outside React, call `translate` directly:

```ts
import { translate } from "@sda/i18n/translate";

translate("tet", "deleteEntry");
```

### Add a string with a variable

Write each variable as `{name}` in the text.
Pass its value in the params object, the last argument of `t` or `translate`.

For example, add this line to `messages/en.json`:

```json
"photoCount": "{count} photos",
```

Add this line to `messages/tet.json`:

```json
"photoCount": "Foto {count}",
```

Then call the key with a `count` param:

```tsx
t("photoCount", { count: 12 });
```

The call gives "12 photos" in English and "Foto 12" in Tetum.
A param value must be a string or a number.
TypeScript rejects `undefined` or `null`, so check the value before the call.

If you do not know the Tetum text, do not copy the English text into `tet.json`.
Ask a Tetum speaker on the team first.

## Checks

`pnpm --filter @sda/i18n test` runs the catalog test.
CI runs it through `pnpm test`.
The test fails when:

- a key is in one file and not in the other
- a key occurs two times in one file
- a value is empty
- the `{placeholders}` of a key are different in English and Tetum

`pnpm --filter @sda/i18n build` type-checks the package.
It also fails when `tet.json` does not have a key from `en.json`.

## Plurals and dates

The catalog has no plural forms.
Tetum nouns do not change in the plural.
One text per key works for Tetum.
Node 24 has no `Intl` plural or number data for `tet`, and falls back to English rules.
Test any `Intl` formatting in the browser before you use it for Tetum.
