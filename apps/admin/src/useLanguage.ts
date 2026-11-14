import { createContext, useContext } from "react";
import type { Locale, MessageKey, MessageParams } from "@sda/i18n/translate";

export type Lang = Locale;

export type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
};

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
