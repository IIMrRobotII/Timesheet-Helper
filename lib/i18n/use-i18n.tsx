import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSettings, setSettings } from "@/lib/storage";
import type { LanguagePref } from "@/lib/types";
import { CATALOGS, type Messages } from "./messages";

type Locale = "en" | "he";

function systemLocale(): Locale {
  try {
    return chrome.i18n.getUILanguage().split("-")[0] === "he" ? "he" : "en";
  } catch {
    return "en";
  }
}

function resolveLocale(pref: LanguagePref): Locale {
  return pref === "system" ? systemLocale() : pref;
}

interface I18n {
  t: Messages;
  lang: LanguagePref;
  dir: "rtl" | "ltr";
  setLang: (pref: LanguagePref) => void;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguagePref>("system");

  useEffect(() => {
    let active = true;
    void getSettings().then(settings => {
      if (active) setLangState(settings.currentLanguage);
    });
    return () => {
      active = false;
    };
  }, []);

  const locale = resolveLocale(lang);
  const dir = locale === "he" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  const setLang = useCallback((pref: LanguagePref) => {
    setLangState(pref);
    void setSettings({ currentLanguage: pref }).catch(() => {});
  }, []);

  const value = useMemo<I18n>(() => ({ t: CATALOGS[locale], lang, dir, setLang }), [locale, lang, dir, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
