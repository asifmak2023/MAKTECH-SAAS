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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("light");
  const [palette, setPaletteState] = useState<PaletteId>("fbr");

  useEffect(() => {
    injectBrandFonts();
    const storedPalette = readStoredPalette();
    const storedTheme = resolveMode(storedPalette, readStoredTheme());
    setPaletteState(storedPalette);
    setThemeState(storedTheme);
    applyActiveFonts(paletteMeta(storedPalette).fonts);
  }, []);

  useEffect(() => {
    applyActiveFonts(paletteMeta(palette).fonts);
  }, [palette]);

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
