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
};

export type PaletteMeta = {
  id: PaletteId;
  label: string;
  hint: string;
  swatch: string;
  modes: ThemeName[];
  fonts: { body: string; label: string };
};

export const PALETTES: PaletteMeta[] = [
  {
    id: "fbr",
    label: "FBR Mono",
    hint: "Current product chrome",
    swatch: "#000000",
    modes: ["light", "dark"],
    fonts: { body: "DM Sans, system-ui, sans-serif", label: "Space Grotesk, system-ui, sans-serif" },
  },
  {
    id: "asifent",
    label: "Asifent",
    hint: "Fluent blue workspace",
    swatch: "#0067c0",
    modes: ["light", "dark"],
    fonts: { body: "Segoe UI, system-ui, sans-serif", label: "Segoe UI, system-ui, sans-serif" },
  },
  {
    id: "editorial",
    label: "Editorial",
    hint: "Financial precision",
    swatch: "#005da7",
    modes: ["light"],
    fonts: { body: "Inter, system-ui, sans-serif", label: "Inter, system-ui, sans-serif" },
  },
  {
    id: "glacier",
    label: "Glacier",
    hint: "Frozen glass dark",
    swatch: "#7dd3fc",
    modes: ["dark"],
    fonts: { body: "Inter, system-ui, sans-serif", label: "Inter, system-ui, sans-serif" },
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
  radius: 0,
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
  radius: 0,
};

const asifentLight: Colors = {
  background: "#f3f3f3",
  foreground: "#1b1b1b",
  accent: "#0067c0",
  accentHover: "#0059a6",
  onAccent: "#ffffff",
  accentSoft: "#e9f1fd",
  surface: "#ffffff",
  stroke: "#e0e0e0",
  textMuted: "#64748b",
  textSecondary: "#334155",
  page: "#f3f3f3",
  authPage: "#f3f3f3",
  overlay: "rgba(0,0,0,0.4)",
  hairline: "#e0e0e0",
  radius: 6,
};

const asifentDark: Colors = {
  background: "#1e1e1e",
  foreground: "#f2f2f2",
  accent: "#4c9aff",
  accentHover: "#6fb0ff",
  onAccent: "#0b1220",
  accentSoft: "rgba(0,103,192,0.28)",
  surface: "#2b2b2b",
  stroke: "rgba(255,255,255,0.12)",
  textMuted: "#a6a6a6",
  textSecondary: "#d1d1d1",
  page: "#1e1e1e",
  authPage: "#1e1e1e",
  overlay: "rgba(0,0,0,0.62)",
  hairline: "rgba(255,255,255,0.12)",
  radius: 6,
};

const editorialColors: Colors = {
  background: "#f9f9ff",
  foreground: "#161c27",
  accent: "#005da7",
  accentHover: "#004883",
  onAccent: "#ffffff",
  accentSoft: "#e8eeff",
  surface: "#ffffff",
  stroke: "#e6edf3",
  textMuted: "#414751",
  textSecondary: "#161c27",
  page: "#f9f9ff",
  authPage: "#f1f3ff",
  overlay: "rgba(22,28,39,0.45)",
  hairline: "#e6edf3",
  radius: 8,
};

const glacierColors: Colors = {
  background: "#0a0e1a",
  foreground: "#e8f4ff",
  accent: "#7dd3fc",
  accentHover: "#bae6fd",
  onAccent: "#0a0e1a",
  accentSoft: "rgba(125,211,252,0.16)",
  surface: "#101726",
  stroke: "rgba(125,211,252,0.22)",
  textMuted: "#94a3b8",
  textSecondary: "#cbd5e1",
  page: "#0a0e1a",
  authPage: "#0a0e1a",
  overlay: "rgba(4,8,18,0.78)",
  hairline: "rgba(125,211,252,0.22)",
  radius: 12,
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
      "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500;600;700&display=swap";
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
