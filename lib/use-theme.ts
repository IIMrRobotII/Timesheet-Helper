import { useEffect, useState } from "react";
import { getSettings, setSettings } from "./storage";
import { applyTheme } from "./theme";
import type { ThemePref } from "./types";

export function useTheme(): { theme: ThemePref; setTheme: (next: ThemePref) => void; resetTheme: () => void } {
  const [theme, setThemeState] = useState<ThemePref>("system");

  useEffect(() => {
    let active = true;
    void getSettings().then(settings => {
      if (!active) return;
      setThemeState(settings.currentTheme);
      applyTheme(settings.currentTheme);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (next: ThemePref) => {
    setThemeState(next);
    applyTheme(next);
    void setSettings({ currentTheme: next }).catch(() => {});
  };

  const resetTheme = () => {
    setThemeState("system");
    applyTheme("system");
  };

  return { theme, setTheme, resetTheme };
}
