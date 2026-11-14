import Page from "../../shared/ui/Page";
import { useLanguage } from "../../useLanguage";
import SpeciesTable from "../species/SpeciesTable";

export default function HomePage() {
  const { lang, t } = useLanguage();

  return (
    <Page title={t("dashboardTitle")} subtitle={t("dashboardSubtitle")}>
      <h2 className="text-label text-brand-text uppercase">
        {t(lang === "tet" ? "tetumDatabase" : "englishDatabase")}
      </h2>
      <SpeciesTable />
    </Page>
  );
}
