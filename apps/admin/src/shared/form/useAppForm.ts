import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "./formContext";
import FormTextField from "./FormTextField";

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField: FormTextField },
  formComponents: {},
});

/** Field validator that returns `errorKey` for an empty or whitespace-only value. */
export const required =
  (errorKey: string) =>
  ({ value }: { value: string }) =>
    value.trim() ? undefined : errorKey;
