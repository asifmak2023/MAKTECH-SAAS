"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "pral_theme";
export const PALETTE_KEY = "pral_palette";

export type ThemeMode = "dark" | "light";
export type PaletteId = "fbr" | "asifent" | "editorial" | "glacier";

export type PaletteMeta = {
  id: PaletteId;
  label: string;
  hint: string;
  swatch: string;
  modes: ThemeMode[];
};

export const PALETTES: PaletteMeta[] = [
  { id: "fbr", label: "FBR Mono", hint: "Current product chrome", swatch: "#000000", modes: ["light", "dark"] },
  { id: "asifent", label: "Asifent", hint: "Fluent blue workspace", swatch: "#0067c0", modes: ["light", "dark"] },
  { id: "editorial", label: "Editorial", hint: "Financial precision", swatch: "#005da7", modes: ["light"] },
  { id: "glacier", label: "Glacier", hint: "Frozen glass dark", swatch: "#7dd3fc", modes: ["dark"] },
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
  if (palette === "asifent") return document.documentElement.getAttribute("data-mode") === "dark";
  return document.documentElement.classList.contains("dark");
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
  document.documentElement.setAttribute("data-mode", dark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", palette === "fbr" && dark);
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
