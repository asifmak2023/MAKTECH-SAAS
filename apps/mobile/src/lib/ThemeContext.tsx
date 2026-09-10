import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Colors, ThemeName, darkColors, injectBrandFonts, lightColors, persistTheme, readStoredTheme } from "./theme";

type ThemeContextValue = {
  theme: ThemeName;
  dark: boolean;
  colors: Colors;
  toggle: () => void;
  setTheme: (next: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  dark: false,
  colors: lightColors,
  toggle: () => undefined,
  setTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("light");

  useEffect(() => {
    injectBrandFonts();
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      dark: theme === "dark",
      colors: theme === "dark" ? darkColors : lightColors,
      toggle,
      setTheme,
    }),
    [theme, toggle, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
