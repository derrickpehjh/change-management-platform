import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface-canvas": "#F8FAFC",
        "surface-card": "#FFFFFF",
        "surface-subtle": "#F1F5F9",
        primary: "#0F2042",
        "primary-light": "#1E3A8A",
        secondary: "#2563EB",
        "border-subtle": "#E2E8F0",
        "border-strong": "#CBD5E1",
        "on-surface": "#0F172A",
        "on-surface-variant": "#64748B",
        outline: "#94A3B8",
        "status-draft": "#64748B",
        "status-submitted": "#2563EB",
        "status-review": "#6366F1",
        "status-approved": "#059669",
        "status-rejected": "#DC2626",
        "status-scheduled": "#D97706",
        "status-implemented": "#0D9488",
        "status-closed": "#334155",
        "risk-high": "#EF4444",
        "risk-medium": "#F59E0B",
        "risk-low": "#10B981",
        "conflict-warning": "#F59E0B",
        "role-htx": "#1E3A8A",
        "role-vendor": "#0D9488",
      },
      fontFamily: {
        headline: ["var(--font-headline)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        code: ["var(--font-code)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
