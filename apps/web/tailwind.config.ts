import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#000000",
        "on-primary": "#ffffff",
        secondary: "#5f5e5e",
        surface: {
          DEFAULT: "#ffffff",
          stark: "#ffffff",
          subtle: "#f5f5f5",
          muted: "#e5e5e5",
          dark: "#111111",
        },
        ink: {
          DEFAULT: "#000000",
          secondary: "#262626",
          muted: "#767676",
        },
        win: {
          50: "#f5f5f5",
          100: "#e5e5e5",
          200: "#d4d4d4",
          300: "#a3a3a3",
          400: "#737373",
          500: "#262626",
          600: "#000000",
          700: "#111111",
          800: "#0a0a0a",
          900: "#000000",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        display: ['"DM Sans"', "system-ui", "sans-serif"],
        label: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"DM Sans"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        label: "0.12em",
        eyebrow: "0.18em",
      },
      maxWidth: {
        editorial: "1440px",
      },
      borderRadius: {
        none: "0",
      },
    },
  },
  plugins: [],
};
export default config;
