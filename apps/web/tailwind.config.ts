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
        win: {
          50: "#e9f1fd",
          100: "#d6e6fb",
          200: "#adccf7",
          300: "#7faeef",
          400: "#4d8fe4",
          500: "#2171d6",
          600: "#0067c0",
          700: "#0059a6",
          800: "#004a8a",
          900: "#003a6b",
        },
      },
      fontFamily: {
        sans: [
          '"Segoe UI Variable"',
          '"Segoe UI"',
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
