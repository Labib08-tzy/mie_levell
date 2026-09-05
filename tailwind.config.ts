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
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        cream: {
          50: "#fffbf7",
          100: "#faf8f5",
          200: "#f5f0eb",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4": "4px",
        "12": "12px",
        "14": "14px",
        "16": "16px",
        "20": "20px",
        "24": "24px",
      },
      boxShadow: {
        "card": "0 4px 20px -4px rgba(0,0,0,0.04)",
        "card-hover": "0 20px 30px -10px rgba(0,0,0,0.08)",
        "orange": "0 10px 20px -5px rgba(249,115,22,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
