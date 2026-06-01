import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lg: { primary: "#A50034", dark: "#222", light: "#F4F4F4" },
        tier: {
          monitor: "#22C55E",
          caution: "#FACC15",
          alert: "#FB923C",
          high: "#EF4444",
          critical: "#7F1D1D",
        },
      },
    },
  },
  plugins: [],
};
export default config;
