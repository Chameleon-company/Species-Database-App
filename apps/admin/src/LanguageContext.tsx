import React, { useState } from "react";
import { LanguageContext, type Lang } from "./useLanguage";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) || "en";
  });

  const setLang = (newLang: Lang) => {
    localStorage.setItem("lang", newLang);
    setLangState(newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}
