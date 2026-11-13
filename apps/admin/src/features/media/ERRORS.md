# Media error messages

`errorMessages.ts` maps a failed media request to a translation key.
It matches on the operation (fetch, save or delete) and the HTTP status.
It never matches on the error text.

The API can return its error text already translated into English or Tetum.
Text matching would break as soon as the UI language changes.
Status codes stay the same in every language, so they are safe to match.

When the API adds a new validation case, add one rule to `ERROR_RULES` and the matching key to the translations.
