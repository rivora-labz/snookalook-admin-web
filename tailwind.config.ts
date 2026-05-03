import type { Config } from "tailwindcss";
import { tokens } from "@rivora-labz/snook-shared";

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
        // Theme-aware tokens (CSS vars). Toggle via .theme-dark / .theme-light on <html>.
        th: {
          bg: "var(--th-bg)",
          card: "var(--th-card)",
          elevated: "var(--th-elevated)",
          input: "var(--th-input)",
          divider: "var(--th-divider)",
          text: "var(--th-text)",
          "text-secondary": "var(--th-text-secondary)",
          "text-tertiary": "var(--th-text-tertiary)",
          "text-muted": "var(--th-text-muted)",
          border: "var(--th-border)",
          "border-medium": "var(--th-border-medium)",
          gold: "var(--th-gold)",
          "gold-hover": "var(--th-gold-hover)",
          "gold-bg": "var(--th-gold-bg)",
          hover: "var(--th-hover)",
          active: "var(--th-active)",
        },
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
