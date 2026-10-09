/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#006948",
        "on-primary": "#ffffff",
        "primary-container": "#00855d",
        "on-primary-container": "#f5fff7",
        "primary-fixed": "#85f8c4",
        "primary-fixed-dim": "#68dba9",
        "on-primary-fixed": "#002114",
        "on-primary-fixed-variant": "#005137",
        "inverse-primary": "#68dba9",

        "secondary": "#904d00",
        "on-secondary": "#ffffff",
        "secondary-container": "#fe932c",
        "on-secondary-container": "#663500",
        "secondary-fixed": "#ffdcc3",
        "secondary-fixed-dim": "#ffb77d",
        "on-secondary-fixed": "#2f1500",
        "on-secondary-fixed-variant": "#6e3900",

        "tertiary": "#4b41e1",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#645efb",
        "on-tertiary-container": "#fffbff",
        "tertiary-fixed": "#e2dfff",
        "tertiary-fixed-dim": "#c3c0ff",
        "on-tertiary-fixed": "#0f0069",
        "on-tertiary-fixed-variant": "#3323cc",

        "surface": "#f8f9ff",
        "on-surface": "#0b1c30",
        "surface-variant": "#d3e4fe",
        "on-surface-variant": "#3d4a42",
        "surface-dim": "#cbdbf5",
        "surface-bright": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container": "#e5eeff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "surface-tint": "#006c4a",

        "inverse-surface": "#213145",
        "inverse-on-surface": "#eaf1ff",
        "background": "#f8f9ff",
        "on-background": "#0b1c30",

        "outline": "#6d7a72",
        "outline-variant": "#bccac0",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a"
      },
      borderRadius: {
        "sm": "0.5rem",
        "DEFAULT": "1rem",
        "md": "1.5rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      spacing: {
        "gutter": "0.75rem",
        "margin": "1rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.25rem"
      },
      fontFamily: {
        headline: ["'Plus Jakarta Sans'", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'Inter'", "monospace"]
      },
      boxShadow: {
        "golden": "0 4px 20px -2px rgba(245, 158, 11, 0.25), 0 1px 4px 0 rgba(16, 185, 129, 0.15)",
        "subtle": "0 1px 2px -1px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.04)",
        "card": "0 8px 20px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.03)",
        "modal": "0 20px 32px -8px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.04)"
      }
    },
  },
  plugins: [],
}
