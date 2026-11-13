import React, { useCallback, useEffect, useMemo, useState } from "react";
import { defaultLocale, isLocale, translate, type MessageKey, type MessageParams } from "@sda/i18n/translate";
import { LanguageContext, type Lang } from "./useLanguage";

const STORAGE_KEY = "lang";

const readStoredLang = (): Lang => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : defaultLocale;
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((newLang: Lang) => {
    localStorage.setItem(STORAGE_KEY, newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: MessageParams) => translate(lang, key, params),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
