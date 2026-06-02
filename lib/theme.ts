import type { ThemePref } from "./types";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function prefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

export function applyTheme(pref: ThemePref): void {
  const dark = pref === "dark" || (pref === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
}
