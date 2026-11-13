import type { MessageKey } from "@sda/i18n/translate";

export type ErrorContext = "fetch" | "save" | "delete";

type ErrorRule = {
  context: ErrorContext;
  status?: number;
  key: MessageKey;
};

const ERROR_RULES: ErrorRule[] = [
  { context: "save", status: 400, key: "errorMediaRequiredFields" },
  { context: "save", status: 409, key: "errorMediaAlreadyRegistered" },
  { context: "save", key: "errorUploadFailed" },
  { context: "fetch", key: "errorFailedToLoadMedia" },
  { context: "delete", key: "errorDeleteFailed" },
];

const DEFAULT_ERROR_KEY: MessageKey = "errorGeneric";

/**
 * Translation key for a failed media request, chosen by operation and HTTP
 * status only, never by the response text (which the API may localise).
 * A rule without `status` is the fallback for its context. See ./ERRORS.md.
 */
export function resolveErrorKey(context: ErrorContext, status?: number): MessageKey {
  return (
    ERROR_RULES.find((rule) => rule.context === context && rule.status === status)?.key ??
    ERROR_RULES.find((rule) => rule.context === context && rule.status === undefined)?.key ??
    DEFAULT_ERROR_KEY
  );
}
