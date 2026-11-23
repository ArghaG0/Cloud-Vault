/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand & Primary
        "primary": "var(--primary)",
        "on-primary": "var(--on-primary)",
        "primary-container": "var(--primary-container)",
        "on-primary-container": "var(--on-primary-container)",
        "primary-fixed": "#e5e2e1",
        "primary-fixed-dim": "#c8c6c5",
        "on-primary-fixed": "#1c1b1b",
        "on-primary-fixed-variant": "#474646",
        "inverse-primary": "#c8c6c5",

        // Backgrounds & Surfaces
        "background-base": "var(--background-base)",
        "background": "var(--background)",
        "surface": "var(--surface)",
        "surface-bright": "var(--surface-bright)",
        "surface-dim": "var(--surface-dim)",
        "surface-variant": "var(--surface-variant)",
        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface-variant)",
        "inverse-surface": "var(--inverse-surface)",
        "inverse-on-surface": "var(--inverse-on-surface)",
        "surface-tint": "#5f5e5e",

        // Specialized Surfaces & Borders
        "card-surface": "var(--card-surface)",
        "panel-surface": "var(--panel-surface)",
        "border-subtle": "var(--border-subtle)",
        "accent-emerald": "#10B981",

        // Surface Container Hierarchy
        "surface-container-lowest": "var(--surface-container-lowest)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",

        // Secondary & Muted
        "secondary": "var(--secondary)",
        "secondary-container": "var(--secondary-container)",
        "on-secondary": "var(--on-secondary)",
        "on-secondary-container": "var(--on-secondary-container)",
        "secondary-fixed": "#e4e2e2",
        "secondary-fixed-dim": "#c7c6c6",
        "on-secondary-fixed": "#1b1c1c",
        "on-secondary-fixed-variant": "#464747",

        // Tertiary
        "tertiary": "var(--tertiary)",
        "tertiary-container": "var(--tertiary-container)",
        "on-tertiary": "var(--on-tertiary)",
        "on-tertiary-container": "var(--on-tertiary-container)",
        "tertiary-fixed": "#e6e1df",
        "tertiary-fixed-dim": "#cac6c3",
        "on-tertiary-fixed": "#1d1b1a",
        "on-tertiary-fixed-variant": "#484645",

        // Outlines
        "outline": "var(--outline)",
        "outline-variant": "var(--outline-variant)",

        // Errors & Alerts
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
      },
      borderRadius: {
        "DEFAULT": "1rem", // 16px
        "lg": "2rem",      // 32px
        "xl": "3rem",      // 48px
        "full": "9999px",
      },
      spacing: {
        "space-xs": "0.5rem",       // 8px
        "space-sm": "0.75rem",      // 12px
        "space-md": "1rem",         // 16px
        "space-lg": "1.5rem",       // 24px
        "space-xl": "2rem",         // 32px
        "space-2xl": "3.5rem",      // 56px
        "space-section": "8.75rem", // 140px
        "gutter": "2rem",
        "margin": "2rem",
      },
      fontFamily: {
        sans: ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "monospace"],
        "body-md": ["Geist", "sans-serif"],
        "body-sm": ["Geist", "sans-serif"],
        "body-lg": ["Geist", "sans-serif"],
        "headline-sm": ["Geist", "sans-serif"],
        "headline-md": ["Geist", "sans-serif"],
        "headline-lg": ["Geist", "sans-serif"],
        "display-hero": ["Geist", "sans-serif"],
        "label-caps": ["Geist", "sans-serif"],
        "mono-metric": ["Geist", "monospace"],
        "micro-caption": ["Geist", "sans-serif"],
      },
      fontSize: {
        "display-hero": ["84px", { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "600" }],
        "display-hero-mobile": ["44px", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "600" }],
        "headline-lg": ["64px", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "600" }],
        "headline-lg-mobile": ["36px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-md": ["48px", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "600" }],
        "headline-md-mobile": ["28px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", letterSpacing: "-0.01em", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1.0", letterSpacing: "0.1em", fontWeight: "600" }],
        "mono-metric": ["12px", { lineHeight: "1.2", letterSpacing: "0.02em", fontWeight: "700" }],
        "micro-caption": ["10px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      boxShadow: {
        "subtle": "0 1px 8px rgba(0, 0, 0, 0.04)",
        "card": "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        "modal": "0 20px 50px rgba(0, 0, 0, 0.12)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        zoomIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "zoom-in-95": "zoomIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
