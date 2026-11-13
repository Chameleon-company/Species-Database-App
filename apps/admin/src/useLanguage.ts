import { createContext, useContext } from "react";

export type Lang = "en" | "tet";

export type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
