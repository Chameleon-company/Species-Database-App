// Central place for mapping backend error RESPONSES to translation keys.
//
// IMPORTANT: we match on HTTP status + which operation was in flight -
// never on the error message text itself. Backend error text can come
// back already localized (English vs Tetum), so pattern-matching on it
// breaks the moment the UI language changes. Status codes don't change
// with language, so they're the only safe thing to match on.
//
// When the backend adds a new validation case, add one rule here
// (and the matching key in translations.ts) - no other file changes.

export type ErrorContext = "fetch" | "save" | "delete";

type ErrorRule = {
  context: ErrorContext;
  status?: number; // omit to match "any status" for that context (fallback)
  key: string;
};

const ERROR_RULES: ErrorRule[] = [
  { context: "save", status: 400, key: "errorMediaRequiredFields" },
  { context: "save", status: 409, key: "errorMediaAlreadyRegistered" },
  { context: "save", key: "errorUploadFailed" }, // any other save failure
  { context: "fetch", key: "errorFailedToLoadMedia" },
  { context: "delete", key: "errorDeleteFailed" },
];

const DEFAULT_ERROR_KEY = "errorGeneric";

/**
 * Resolves an error into a translation key based on the operation
 * (context) and the HTTP status returned, NOT the message text.
 */
export function resolveErrorKey(
  context: ErrorContext,
  status?: number
): string {
  const exact = ERROR_RULES.find(
    (r) => r.context === context && r.status === status
  );
  if (exact) return exact.key;

  const fallbackForContext = ERROR_RULES.find(
    (r) => r.context === context && r.status === undefined
  );
  if (fallbackForContext) return fallbackForContext.key;

  console.warn(
    `[errorMessages] Unmapped error (context: ${context}, status: ${status})`
  );
  return DEFAULT_ERROR_KEY;
}