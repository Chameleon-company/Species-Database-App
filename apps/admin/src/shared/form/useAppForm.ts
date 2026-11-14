import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "./formContext";
import FormTextField from "./FormTextField";

const { useAppForm: useBaseAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField: FormTextField },
  formComponents: {},
});

/**
 * `useAppForm` with `canSubmitWhenInvalid: true`, so every submit validates
 * all fields. Without it, a field that already failed on blur makes the first
 * submit return before the other fields are validated. `onSubmit` still runs
 * only when every field is valid.
 */
export const useAppForm = ((options) =>
  useBaseAppForm({ canSubmitWhenInvalid: true, ...options })) as typeof useBaseAppForm;
