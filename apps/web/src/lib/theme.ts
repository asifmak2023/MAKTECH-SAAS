"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "pral_theme";

export function readTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Live "dark mode" flag. Observes the class list on <html> so any toggle
 * (theme button, persisted localStorage on boot, admin console switch) is
 * reflected immediately without prop drilling.
 */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(readTheme() === "dark");
    const el = document.documentElement;
    const observer = new MutationObserver(() => setDark(el.classList.contains("dark")));
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

export function applyTheme(next: boolean): void {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  } catch {
    /* storage unavailable — class toggle still applies for the session */
  }
}
