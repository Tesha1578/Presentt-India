/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        line: "var(--line)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-fg)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--surface-3)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
          foreground: "var(--accent-fg)",
        },
        success: "#4ADE80",
        warning: "#FFB224",
        danger: "#FF5C5C",
        info: "#6AB8FF",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--accent)",
        background: "var(--canvas)",
        foreground: "var(--primary)",
        card: {
          DEFAULT: "var(--surface-1)",
          foreground: "var(--primary)",
        },
        popover: {
          DEFAULT: "var(--surface-2)",
          foreground: "var(--primary)",
        },
        destructive: {
          DEFAULT: "#FF5C5C",
          foreground: "#FFFFFF",
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
        e1: "0 8px 32px rgba(0,0,0,0.25)",
        e2: "0 16px 48px rgba(0,0,0,0.35)",
        e3: "0 24px 80px rgba(0,0,0,0.45)",
        "accent-glow": "0 0 24px var(--accent-dim)",
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
