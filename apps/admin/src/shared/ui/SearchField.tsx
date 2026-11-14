import { Search, X } from "lucide-react";
import { Input } from "@sda/ui/components/input";
import { useLanguage } from "../../useLanguage";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export default function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  const { t } = useLanguage();

  return (
    <div className="relative w-full max-w-95">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-brand-accent" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 rounded-xl bg-card pr-9 pl-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label={t("clearSearch")}
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm p-1 text-faint hover:text-body"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
