/** Field validator that returns `errorKey` for an empty or whitespace-only value. */
export const required =
  (errorKey: string) =>
  ({ value }: { value: string }) =>
    value.trim() ? undefined : errorKey;

/** Error value of `withinLength`. FormTextField shows it as "<length> / <max>". */
export const TOO_LONG = "tooLong";

/** Field validator that fails when the value is longer than `max` characters. */
export const withinLength =
  (max: number) =>
  ({ value }: { value: string }) =>
    value.length > max ? TOO_LONG : undefined;

/** Runs validators in order and returns the first error. */
export const firstError =
  (...validators: ((input: { value: string }) => string | undefined)[]) =>
  (input: { value: string }) =>
    validators.reduce<string | undefined>((error, validate) => error ?? validate(input), undefined);
