"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "pral_theme";
export const PALETTE_KEY = "pral_palette";

export type ThemeMode = "dark" | "light";
export type PaletteId = "fbr" | "asifent" | "editorial" | "glacier" | "mehndi" | "karachi" | "rosewood" | "indigo";

export type PaletteMeta = {
  id: PaletteId;
  label: string;
  hint: string;
  swatch: string;
  modes: ThemeMode[];
};

export const PALETTES: PaletteMeta[] = [
  { id: "fbr", label: "FBR Mono", hint: "Material 3 neutral", swatch: "#1C1B1F", modes: ["light", "dark"] },
  { id: "asifent", label: "Asifent", hint: "Material 3 blue", swatch: "#0061A4", modes: ["light", "dark"] },
  { id: "editorial", label: "Editorial", hint: "Material 3 financial", swatch: "#005FAF", modes: ["light"] },
  { id: "glacier", label: "Glacier", hint: "Material 3 frost", swatch: "#7DD3FC", modes: ["dark"] },
  { id: "mehndi", label: "Mehndi", hint: "Material 3 gold", swatch: "#7A5900", modes: ["light", "dark"] },
  { id: "karachi", label: "Karachi", hint: "Material 3 teal", swatch: "#006A6A", modes: ["light", "dark"] },
  { id: "rosewood", label: "Rosewood", hint: "Material 3 rose", swatch: "#9C4146", modes: ["light", "dark"] },
  { id: "indigo", label: "Indigo", hint: "Material 3 indigo", swatch: "#4355B9", modes: ["light", "dark"] },
];

const PALETTE_IDS: PaletteId[] = PALETTES.map((p) => p.id);

export function isPaletteId(value: string | null | undefined): value is PaletteId {
  return Boolean(value && PALETTE_IDS.includes(value as PaletteId));
}

export function paletteMeta(id: PaletteId): PaletteMeta {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

export function readTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  const mode = document.documentElement.getAttribute("data-mode");
  if (mode === "dark" || mode === "light") return mode;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function readPalette(): PaletteId {
  if (typeof document === "undefined") return "fbr";
  const attr = document.documentElement.getAttribute("data-palette");
  return isPaletteId(attr) ? attr : "fbr";
}

export function isDarkDocument(): boolean {
  if (typeof document === "undefined") return false;
  const palette = readPalette();
  if (palette === "glacier") return true;
  if (palette === "editorial") return false;
  return readTheme() === "dark";
}

export function useIsDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(isDarkDocument());
    sync();
    const el = document.documentElement;
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["class", "data-palette", "data-mode"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

export function usePalette(): PaletteId {
  const [palette, setPalette] = useState<PaletteId>("fbr");

  useEffect(() => {
    setPalette(readPalette());
    const el = document.documentElement;
    const observer = new MutationObserver(() => setPalette(readPalette()));
    observer.observe(el, { attributes: true, attributeFilter: ["data-palette"] });
    return () => observer.disconnect();
  }, []);

  return palette;
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function applyTheme(nextDark: boolean): void {
  const palette = readPalette();
  const meta = paletteMeta(palette);
  const dark = meta.modes.length === 1 ? meta.modes[0] === "dark" : nextDark;
  const root = document.documentElement;
  root.setAttribute("data-mode", dark ? "dark" : "light");
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  persist(THEME_KEY, dark ? "dark" : "light");
}

export function applyPalette(next: PaletteId): void {
  const meta = paletteMeta(next);
  document.documentElement.setAttribute("data-palette", next);
  persist(PALETTE_KEY, next);
  if (meta.modes.length === 1) {
    applyTheme(meta.modes[0] === "dark");
    return;
  }
  const stored = (() => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  })();
  applyTheme(stored === "dark");
}

export function ThemeBoot() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PALETTE_KEY);
      applyPalette(isPaletteId(stored) ? stored : readPalette());
    } catch {
      applyTheme(isDarkDocument());
    }
  }, []);
  return null;
}
