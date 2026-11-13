import Page from "../../shared/ui/Page";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import SpeciesTable from "../species/SpeciesTable";

export default function HomePage() {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;

  return (
    <Page title={t("dashboardTitle")} subtitle={t("dashboardSubtitle")}>
      <h2 className="text-label text-brand-text uppercase">
        {t(lang === "tet" ? "tetumDatabase" : "englishDatabase")}
      </h2>
      <SpeciesTable />
    </Page>
  );
}
