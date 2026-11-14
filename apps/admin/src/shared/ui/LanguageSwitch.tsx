import { cn } from "@sda/ui/lib/utils";
import { useLanguage, type Lang } from "../../useLanguage";

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: "en", label: "EN" },
  { lang: "tet", label: "TET" },
];

export default function LanguageSwitch() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex gap-0.5 rounded-full border bg-accent p-0.75">
      {OPTIONS.map((option) => {
        const active = option.lang === lang;
        return (
          <button
            key={option.lang}
            type="button"
            onClick={() => setLang(option.lang)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-3.5 py-1.25 text-label tracking-[0.03em] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active ? "bg-primary text-primary-foreground" : "bg-card text-brand-text hover:text-primary"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
