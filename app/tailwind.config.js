/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: "#090909",
        surface: {
          1: "#111111",
          2: "#1A1A1A",
          3: "#2A2A2A",
        },
        line: "rgba(255,255,255,0.06)",
        primary: {
          DEFAULT: "#F5F5F5",
          foreground: "#090909",
        },
        secondary: {
          DEFAULT: "#B8B8B8",
          foreground: "#2A2A2A",
        },
        muted: {
          DEFAULT: "#8A8A8A",
          foreground: "#8A8A8A",
        },
        accent: {
          DEFAULT: "#C6FF33",
          dim: "rgba(198,255,51,0.12)",
          foreground: "#090909",
        },
        success: "#4ADE80",
        warning: "#FFB224",
        danger: "#FF5C5C",
        info: "#6AB8FF",
        border: "rgba(255,255,255,0.06)",
        input: "rgba(255,255,255,0.08)",
        ring: "#C6FF33",
        background: "#090909",
        foreground: "#F5F5F5",
        card: {
          DEFAULT: "#111111",
          foreground: "#F5F5F5",
        },
        popover: {
          DEFAULT: "#1A1A1A",
          foreground: "#F5F5F5",
        },
        destructive: {
          DEFAULT: "#FF5C5C",
          foreground: "#090909",
        },
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "24px",
        xlcard: "28px",
        modal: "32px",
        input: "16px",
        lg: "24px",
        xl: "28px",
        "2xl": "32px",
        md: "16px",
        sm: "12px",
      },
      boxShadow: {
        e1: "0 8px 32px rgba(0,0,0,0.45)",
        e2: "0 16px 48px rgba(0,0,0,0.55)",
        e3: "0 24px 80px rgba(0,0,0,0.7)",
        "accent-glow": "0 0 24px rgba(198,255,51,0.35)",
      },
      transitionTimingFunction: {
        "ease-out-expo": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.8)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.4s ease-in-out infinite",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
