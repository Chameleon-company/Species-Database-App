import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@sda/ui/components/button";
import { Card, CardContent } from "@sda/ui/components/card";
import { Field, FieldLabel } from "@sda/ui/components/field";
import { Input } from "@sda/ui/components/input";
import { useAppForm, required } from "../../shared/form/useAppForm";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { useTranslateToTetum } from "./api";
import { MAX_LENGTH, SPECIES_FIELDS, emptySpeciesForm, type SpeciesFieldName, type SpeciesFormValues } from "./species";

type SpeciesFormProps = {
  mode: "create" | "edit";
  initialValues: SpeciesFormValues;
  onSubmit: (values: SpeciesFormValues) => Promise<unknown>;
  onDelete?: () => void;
  deleting?: boolean;
};

const REQUIRED_FIELDS = SPECIES_FIELDS.filter((field) => field.requiredKey);
const OPTIONAL_FIELDS = SPECIES_FIELDS.filter((field) => !field.requiredKey);

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card className="gap-0 rounded-2xl py-6 shadow-card">
      <CardContent className="mx-auto w-full max-w-250 px-4 sm:px-6">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="mt-1 text-compact text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * English and Tetum species form. In create mode the Tetum section appears
 * after the first successful translation; in edit mode it shows from the start.
 * Translation overwrites every translated Tetum field and keeps the Tetum definition.
 */
export default function SpeciesForm({ mode, initialValues, onSubmit, onDelete, deleting = false }: SpeciesFormProps) {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;

  const [showTetum, setShowTetum] = useState(mode === "edit");
  const [translated, setTranslated] = useState(false);
  const translate = useTranslateToTetum();

  const form = useAppForm({
    defaultValues: initialValues,
    onSubmit: ({ value }) => onSubmit(value),
  });

  const handleTranslate = async () => {
    const errors = await Promise.all(
      REQUIRED_FIELDS.map(({ name }) => {
        form.setFieldMeta(`en.${name}`, (meta) => ({ ...meta, isBlurred: true }));
        return form.validateField(`en.${name}`, "change");
      })
    );
    if (errors.some((fieldErrors) => fieldErrors.length > 0)) return;

    translate.mutate(form.state.values.en, {
      onSuccess: (tetum) => {
        Object.entries(tetum).forEach(([name, value]) =>
          form.setFieldValue(`tet.${name as SpeciesFieldName}`, value ?? "")
        );
        setShowTetum(true);
        setTranslated(true);
      },
      onError: () => toast.error(t("errorGeneric")),
    });
  };

  const handleClear = () => {
    form.reset(emptySpeciesForm());
    setShowTetum(false);
    setTranslated(false);
  };

  const renderFields = (language: "en" | "tet") => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 justify-center gap-4 sm:grid-cols-[repeat(2,minmax(0,17.5rem))]">
        {REQUIRED_FIELDS.map(({ name, labelKey, requiredKey }) =>
          language === "tet" && name === "scientific_name" ? (
            <form.Subscribe key={name} selector={(state) => state.values.en.scientific_name}>
              {(scientificName) => (
                <Field data-disabled>
                  <FieldLabel htmlFor="tet.scientific_name">{t(labelKey)}</FieldLabel>
                  <Input id="tet.scientific_name" value={scientificName} disabled readOnly />
                </Field>
              )}
            </form.Subscribe>
          ) : (
            <form.AppField key={name} name={`${language}.${name}`} validators={{ onChange: required(requiredKey!) }}>
              {(field) => <field.TextField label={t(labelKey)} required />}
            </form.AppField>
          )
        )}
      </div>

      <p className="text-center text-compact font-semibold text-brand-text">{t("optional")}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {OPTIONAL_FIELDS.map(({ name, labelKey, rows }) => (
          <div key={name} className={name === "definition" ? "md:col-span-2" : undefined}>
            <form.AppField name={`${language}.${name}`}>
              {(field) => <field.TextField label={t(labelKey)} rows={rows} maxLength={MAX_LENGTH[language]} />}
            </form.AppField>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      noValidate
      className="flex flex-col gap-6"
    >
      <Section title={t("englishEntry")}>
        {renderFields("en")}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Button type="button" onClick={handleTranslate} disabled={translate.isPending}>
            {translate.isPending ? t("loading") : t("translateToTetum")}
          </Button>
          {mode === "create" && (
            <Button type="button" variant="outline" onClick={handleClear}>
              {t("clearEntry")}
            </Button>
          )}
        </div>
      </Section>

      {showTetum && (
        <Section
          title={
            mode === "create" ? t("tetumTranslation") : t(translated ? "translatedTetumEntry" : "originalTetumEntry")
          }
          subtitle={mode === "create" ? t("reviewTetumText") : t("pleaseCheckFields")}
        >
          {renderFields("tet")}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <Button type="submit" disabled={isSubmitting || translate.isPending || deleting}>
                  {mode === "create"
                    ? t(isSubmitting ? "adding" : "addEntry")
                    : t(isSubmitting ? "editing" : "saveChanges")}
                </Button>
                {onDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDelete}
                    disabled={isSubmitting || deleting}
                    className="border-destructive/40 text-destructive hover:bg-destructive-soft hover:text-destructive-hover"
                  >
                    {t(deleting ? "deleting" : "deleteEntry")}
                  </Button>
                )}
              </div>
            )}
          </form.Subscribe>
        </Section>
      )}
    </form>
  );
}
