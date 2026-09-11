export const THEME_KEY = "pral_theme";
export const PALETTE_KEY = "pral_palette";

export type ThemeName = "light" | "dark";
export type PaletteId = "fbr" | "asifent" | "editorial" | "glacier";

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
  radius: number;
  radiusBtn: number;
};

export type PaletteMeta = {
  id: PaletteId;
  label: string;
  hint: string;
  swatch: string;
  modes: ThemeName[];
  fonts: { body: string; label: string };
};

const roboto = { body: "Roboto, system-ui, sans-serif", label: "Roboto, system-ui, sans-serif" };

export const PALETTES: PaletteMeta[] = [
  {
    id: "fbr",
    label: "FBR Mono",
    hint: "Material 3 neutral",
    swatch: "#1C1B1F",
    modes: ["light", "dark"],
    fonts: roboto,
  },
  {
    id: "asifent",
    label: "Asifent",
    hint: "Material 3 blue",
    swatch: "#0061A4",
    modes: ["light", "dark"],
    fonts: roboto,
  },
  {
    id: "editorial",
    label: "Editorial",
    hint: "Material 3 financial",
    swatch: "#005FAF",
    modes: ["light"],
    fonts: roboto,
  },
  {
    id: "glacier",
    label: "Glacier",
    hint: "Material 3 frost",
    swatch: "#7DD3FC",
    modes: ["dark"],
    fonts: roboto,
  },
];

const PALETTE_IDS: PaletteId[] = PALETTES.map((p) => p.id);

export function isPaletteId(value: string | null | undefined): value is PaletteId {
  return Boolean(value && PALETTE_IDS.includes(value as PaletteId));
}

export function paletteMeta(id: PaletteId): PaletteMeta {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

export const lightColors: Colors = {
  background: "#FFFBFE",
  foreground: "#1C1B1F",
  accent: "#1C1B1F",
  accentHover: "#313033",
  onAccent: "#FFFFFF",
  accentSoft: "#E6E1E5",
  surface: "#FFFBFE",
  stroke: "#CAC4D0",
  textMuted: "#49454F",
  textSecondary: "#1C1B1F",
  page: "#F3EDF7",
  authPage: "#F3EDF7",
  overlay: "rgba(28,27,31,0.48)",
  hairline: "#CAC4D0",
  radius: 12,
  radiusBtn: 20,
};

export const darkColors: Colors = {
  background: "#1C1B1F",
  foreground: "#E6E1E5",
  accent: "#E6E1E5",
  accentHover: "#CAC4D0",
  onAccent: "#1C1B1F",
  accentSoft: "#313033",
  surface: "#211F26",
  stroke: "#49454F",
  textMuted: "#CAC4D0",
  textSecondary: "#E6E1E5",
  page: "#1C1B1F",
  authPage: "#1C1B1F",
  overlay: "rgba(0,0,0,0.62)",
  hairline: "#49454F",
  radius: 12,
  radiusBtn: 20,
};

const asifentLight: Colors = {
  background: "#FDFCFF",
  foreground: "#1A1C1E",
  accent: "#0061A4",
  accentHover: "#00497D",
  onAccent: "#FFFFFF",
  accentSoft: "#D1E4FF",
  surface: "#FDFCFF",
  stroke: "#C3C7CF",
  textMuted: "#43474E",
  textSecondary: "#1A1C1E",
  page: "#EDEDF4",
  authPage: "#EDEDF4",
  overlay: "rgba(26,28,30,0.4)",
  hairline: "#C3C7CF",
  radius: 12,
  radiusBtn: 20,
};

const asifentDark: Colors = {
  background: "#1A1C1E",
  foreground: "#E2E2E6",
  accent: "#9ECAFF",
  accentHover: "#C4DFFF",
  onAccent: "#003258",
  accentSoft: "rgba(158,202,255,0.18)",
  surface: "#1E2022",
  stroke: "#8D9199",
  textMuted: "#C3C7CF",
  textSecondary: "#E2E2E6",
  page: "#1A1C1E",
  authPage: "#1A1C1E",
  overlay: "rgba(0,0,0,0.62)",
  hairline: "#8D9199",
  radius: 12,
  radiusBtn: 20,
};

const editorialColors: Colors = {
  background: "#F9F9FF",
  foreground: "#191C20",
  accent: "#005FAF",
  accentHover: "#004883",
  onAccent: "#FFFFFF",
  accentSoft: "#D4E3FF",
  surface: "#F9F9FF",
  stroke: "#C3C6CF",
  textMuted: "#43474E",
  textSecondary: "#191C20",
  page: "#EEEDF4",
  authPage: "#EEEDF4",
  overlay: "rgba(25,28,32,0.45)",
  hairline: "#C3C6CF",
  radius: 12,
  radiusBtn: 20,
};

const glacierColors: Colors = {
  background: "#0A0E1A",
  foreground: "#D6E3FF",
  accent: "#7DD3FC",
  accentHover: "#BAE6FD",
  onAccent: "#00344A",
  accentSoft: "rgba(125,211,252,0.16)",
  surface: "#101726",
  stroke: "rgba(125,211,252,0.28)",
  textMuted: "#A4C8E0",
  textSecondary: "#D6E3FF",
  page: "#0A0E1A",
  authPage: "#0A0E1A",
  overlay: "rgba(4,8,18,0.78)",
  hairline: "rgba(125,211,252,0.28)",
  radius: 12,
  radiusBtn: 20,
};

export function colorsFor(palette: PaletteId, mode: ThemeName): Colors {
  if (palette === "asifent") return mode === "dark" ? asifentDark : asifentLight;
  if (palette === "editorial") return editorialColors;
  if (palette === "glacier") return glacierColors;
  return mode === "dark" ? darkColors : lightColors;
}

export function resolveMode(palette: PaletteId, requested: ThemeName): ThemeName {
  const meta = paletteMeta(palette);
  if (meta.modes.length === 1) return meta.modes[0];
  return requested;
}

export const fonts = { ...PALETTES[0].fonts };

export function applyActiveFonts(next: { body: string; label: string }) {
  fonts.body = next.body;
  fonts.label = next.label;
}

export function readStoredTheme(): ThemeName {
  if (typeof window === "undefined" || !window.localStorage) return "light";
  return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

export function readStoredPalette(): PaletteId {
  if (typeof window === "undefined" || !window.localStorage) return "fbr";
  const value = window.localStorage.getItem(PALETTE_KEY);
  return isPaletteId(value) ? value : "fbr";
}

export function persistTheme(next: ThemeName) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(THEME_KEY, next);
}

export function persistPalette(next: PaletteId) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(PALETTE_KEY, next);
}

export function injectBrandFonts() {
  if (typeof document === "undefined") return;
  if (!document.getElementById("pral-fonts")) {
    const link = document.createElement("link");
    link.id = "pral-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap";
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
