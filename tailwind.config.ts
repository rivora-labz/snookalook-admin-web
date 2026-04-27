import type { Config } from "tailwindcss";
import { tokens } from "@snook/shared/tokens";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: tokens.color.brand.green,
          greenHover: tokens.color.brand.greenHover,
        },
        accent: {
          gold: tokens.color.accent.gold,
          goldHover: tokens.color.accent.goldHover,
        },
        bg: {
          primary: tokens.color.bg.primary,
          secondary: tokens.color.bg.secondary,
        },
        surface: {
          card: tokens.color.surface.card,
        },
        text: {
          primary: tokens.color.text.primary,
          secondary: tokens.color.text.secondary,
          disabled: tokens.color.text.disabled,
        },
        status: tokens.color.status,
      },
      borderRadius: {
        card: `${tokens.radius.card}px`,
        button: `${tokens.radius.button}px`,
        pill: `${tokens.radius.pill}px`,
        input: `${tokens.radius.input}px`,
      },
      fontFamily: {
        display: [tokens.font.display, "sans-serif"],
        sans: [tokens.font.ui, "sans-serif"],
        mono: [tokens.font.mono, "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
