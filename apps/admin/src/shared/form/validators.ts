import type { MessageKey } from "@sda/i18n/translate";

/** Field validator that returns `errorKey` for an empty or whitespace-only value. */
export const required =
  (errorKey: MessageKey) =>
  ({ value }: { value: string }) =>
    value.trim() ? undefined : errorKey;

const TOO_LONG_PREFIX = "tooLong:";

/** Field validator that fails with `tooLong:<max>` when the value is longer than `max` characters. */
export const withinLength =
  (max: number) =>
  ({ value }: { value: string }) =>
    value.length > max ? `${TOO_LONG_PREFIX}${max}` : undefined;

/** The limit inside a `withinLength` error, or null for any other error. */
export const tooLongLimit = (error: string): number | null =>
  error.startsWith(TOO_LONG_PREFIX) ? Number(error.slice(TOO_LONG_PREFIX.length)) : null;

/** Runs validators in order and returns the first error. */
export const firstError =
  (...validators: ((input: { value: string }) => string | undefined)[]) =>
  (input: { value: string }) =>
    validators.reduce<string | undefined>((error, validate) => error ?? validate(input), undefined);
