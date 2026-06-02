import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#A50034",
          dark: "#7B0027",
          tint: "#FCE8EE",
        },
        tier: {
          t1: { fg: "#2E7D32", bg: "#E8F5E9" },
          t2: { fg: "#F9A825", bg: "#FFF8E1" },
          t3: { fg: "#EF6C00", bg: "#FFF3E0" },
          t4: { fg: "#C62828", bg: "#FFEBEE" },
          t5: { fg: "#FFFFFF", bg: "#1A1A1A" },
        },
        neutral: {
          900: "#1B1B1B",
          700: "#4A4A4A",
          400: "#9B9B9B",
          200: "#E5E5E5",
          100: "#F5F5F5",
        },
      },
    },
  },
  plugins: [],
};
export default config;