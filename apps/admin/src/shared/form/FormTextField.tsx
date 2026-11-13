import type { ReactNode } from "react";
import { useSelector } from "@tanstack/react-form";
import { Field, FieldError, FieldLabel } from "@sda/ui/components/field";
import { Input } from "@sda/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@sda/ui/components/select";
import { Textarea } from "@sda/ui/components/textarea";
import { useFieldContext } from "./formContext";
import { tooLongLimit } from "./validators";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";

type FormTextFieldProps = {
  label: ReactNode;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  options?: { value: string; label: ReactNode }[];
};

/**
 * shadcn Field bound to the surrounding `form.AppField`.
 *
 * Validators return translation keys. Blur runs the field's `onChange`
 * validators. The first error shows after a submit attempt, or once the
 * field was edited and then blurred. A `withinLength` error shows as "<length> / <max>". `options` renders a Select; `rows` a Textarea.
 */
export default function FormTextField({
  label,
  required,
  disabled,
  rows,
  maxLength,
  type,
  placeholder,
  autoComplete,
  options,
}: FormTextFieldProps) {
  const field = useFieldContext<string>();
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;

  const errors = useSelector(field.store, (state) => state.meta.errors);
  const editedAndLeft = useSelector(field.store, (state) => state.meta.isBlurred && state.meta.isDirty);
  const submitted = useSelector(field.form.store, (state) => state.submissionAttempts > 0);
  const error = editedAndLeft || submitted ? errors[0] : undefined;
  const invalid = Boolean(error);

  const id = field.name;
  const common = {
    id,
    name: field.name,
    disabled,
    "aria-invalid": invalid,
    onBlur: () => {
      field.handleBlur();
      field.validate("change");
    },
  };

  return (
    <Field data-invalid={invalid} data-disabled={disabled}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && " *"}
      </FieldLabel>
      {options ? (
        <Select value={field.state.value} onValueChange={field.handleChange} disabled={disabled}>
          <SelectTrigger {...common} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : rows ? (
        <Textarea
          {...common}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          className="field-sizing-fixed resize-y bg-card"
        />
      ) : (
        <Input
          {...common}
          type={type}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          className="bg-card"
        />
      )}
      {invalid && (
        <FieldError>
          {tooLongLimit(String(error)) !== null
            ? `${field.state.value.length} / ${tooLongLimit(String(error))}`
            : t(String(error))}
        </FieldError>
      )}
    </Field>
  );
}
