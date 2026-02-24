import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          900: "#0a0a0a",
          800: "#1c1c1e",
          700: "#2c2c2e",
          600: "#3a3a3c",
          500: "#48484a",
        },
        accent: {
          green: "#30d158",
          red: "#ff453a",
          blue: "#0a84ff",
          purple: "#bf5af2",
          orange: "#ff9f0a",
          teal: "#64d2ff",
        },
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      backgroundImage: {
        "gradient-hero": "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 2px 16px rgba(0, 0, 0, 0.3)",
        modal: "0 24px 80px rgba(0, 0, 0, 0.6)",
        glow: "0 0 40px rgba(10, 132, 255, 0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in-right": "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
