export const THEME_KEY = "pral_theme";

export type ThemeName = "light" | "dark";

export type Colors = {
  background: string;
  foreground: string;
  accent: string;
  accentHover: string;
  onAccent: string;
  accentSoft: string;
  surface: string;
  stroke: string;
  textMuted: string;
  textSecondary: string;
  page: string;
  authPage: string;
  overlay: string;
  hairline: string;
};

export const lightColors: Colors = {
  background: "#ffffff",
  foreground: "#000000",
  accent: "#000000",
  accentHover: "#262626",
  onAccent: "#ffffff",
  accentSoft: "#f5f5f5",
  surface: "#ffffff",
  stroke: "#e5e5e5",
  textMuted: "#767676",
  textSecondary: "#262626",
  page: "#ffffff",
  authPage: "#fafafa",
  overlay: "rgba(0,0,0,0.48)",
  hairline: "#e5e5e5",
};

export const darkColors: Colors = {
  background: "#111111",
  foreground: "#f5f5f5",
  accent: "#ffffff",
  accentHover: "#e5e5e5",
  onAccent: "#000000",
  accentSoft: "#1b1b1b",
  surface: "#1b1b1b",
  stroke: "#262626",
  textMuted: "#a3a3a3",
  textSecondary: "#d4d4d4",
  page: "#111111",
  authPage: "#111111",
  overlay: "rgba(0,0,0,0.62)",
  hairline: "#262626",
};

export const fonts = {
  body: "DM Sans, system-ui, sans-serif",
  label: "Space Grotesk, system-ui, sans-serif",
};

export function readStoredTheme(): ThemeName {
  if (typeof window === "undefined" || !window.localStorage) return "light";
  return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

export function persistTheme(next: ThemeName) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(THEME_KEY, next);
}

export function injectBrandFonts() {
  if (typeof document === "undefined") return;
  if (!document.getElementById("pral-fonts")) {
    const link = document.createElement("link");
    link.id = "pral-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Grotesk:wght@500;600&display=swap";
    document.head.appendChild(link);
  }
  if (!document.getElementById("pral-overflow")) {
    const style = document.createElement("style");
    style.id = "pral-overflow";
    style.textContent =
      "html,body,#root{max-width:100%;overflow-x:hidden;}*{box-sizing:border-box;}input,select,textarea,button{font-family:inherit;}";
    document.head.appendChild(style);
  }
}
