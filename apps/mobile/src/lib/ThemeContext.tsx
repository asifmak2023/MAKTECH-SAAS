import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Colors,
  PALETTES,
  PaletteId,
  ThemeName,
  applyActiveFonts,
  colorsFor,
  injectBrandFonts,
  paletteMeta,
  persistPalette,
  persistTheme,
  readStoredPalette,
  readStoredTheme,
  resolveMode,
} from "./theme";

type ThemeContextValue = {
  theme: ThemeName;
  palette: PaletteId;
  dark: boolean;
  colors: Colors;
  fonts: { body: string; label: string };
  radius: number;
  toggle: () => void;
  setTheme: (next: ThemeName) => void;
  setPalette: (next: PaletteId) => void;
  palettes: typeof PALETTES;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  palette: "fbr",
  dark: false,
  colors: colorsFor("fbr", "light"),
  fonts: PALETTES[0].fonts,
  radius: 12,
  toggle: () => undefined,
  setTheme: () => undefined,
  setPalette: () => undefined,
  palettes: PALETTES,
});

function initialPalette(): PaletteId {
  if (typeof window === "undefined") return "fbr";
  return readStoredPalette();
}

function initialTheme(): ThemeName {
  if (typeof window === "undefined") return "light";
  const palette = readStoredPalette();
  return resolveMode(palette, readStoredTheme());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);
  const [palette, setPaletteState] = useState<PaletteId>(initialPalette);

  useEffect(() => {
    injectBrandFonts();
    applyActiveFonts(paletteMeta(palette).fonts);
  }, []);

  useEffect(() => {
    applyActiveFonts(paletteMeta(palette).fonts);
  }, [palette]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const mode = resolveMode(palette, theme);
    const next = colorsFor(palette, mode);
    const root = document.documentElement;
    root.style.backgroundColor = next.page;
    root.style.colorScheme = mode;
    root.classList.toggle("dark", mode === "dark");
    if (document.body) {
      document.body.style.backgroundColor = next.page;
      document.body.style.color = next.foreground;
    }
  }, [theme, palette]);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState((prevPaletteTheme) => {
      const resolved = resolveMode(palette, next);
      persistTheme(resolved);
      return resolved || prevPaletteTheme;
    });
  }, [palette]);

  const setPalette = useCallback((next: PaletteId) => {
    setPaletteState(next);
    persistPalette(next);
    setThemeState((prev) => {
      const resolved = resolveMode(next, prev);
      persistTheme(resolved);
      return resolved;
    });
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = resolveMode(palette, prev === "dark" ? "light" : "dark");
      persistTheme(next);
      return next;
    });
  }, [palette]);

  const value = useMemo<ThemeContextValue>(() => {
    const mode = resolveMode(palette, theme);
    const colors = colorsFor(palette, mode);
    return {
      theme: mode,
      palette,
      dark: mode === "dark",
      colors,
      fonts: paletteMeta(palette).fonts,
      radius: colors.radius,
      toggle,
      setTheme,
      setPalette,
      palettes: PALETTES,
    };
  }, [theme, palette, toggle, setTheme, setPalette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
