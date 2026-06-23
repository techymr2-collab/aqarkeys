/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand blue accent
        brand: {
          DEFAULT: "#324CE3",
          50: "#f5f6fe",
          100: "#e6eafc",
          200: "#cad0f8",
          300: "#adb7f4",
          400: "#8090ee",
          500: "#324CE3",
          600: "#2b41c1",
          700: "#23359f",
          800: "#1c2a7d",
          900: "#141e5b",
        },
        // Dark surface layers for glassmorphism depth
        ink: {
          950: "#0a0a0f",
          900: "#0f0f17",
          850: "#14141f",
          800: "#1a1a27",
          700: "#242436",
          600: "#33334a",
        },
      },
      backgroundImage: {
        "brand-glow":
          "radial-gradient(60% 50% at 50% 0%, rgba(50,76,227,0.25) 0%, rgba(50,76,227,0) 100%)",
      },
      boxShadow: {
        glass: "0 6px 24px -8px rgba(15, 23, 42, 0.12)",
        "glass-lg": "0 16px 48px -12px rgba(15, 23, 42, 0.18)",
        "brand-glow": "0 6px 20px -4px rgba(50, 76, 227, 0.45)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
