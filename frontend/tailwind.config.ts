// frontend/tailwind.config.ts (파일 상단 부분)
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // 💡 이 줄을 꼭 추가해 주세요!
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // ... (나머지 기존 코드 유지)
  theme: {
    extend: {
      colors: {
        // LG 브랜드 컬러
        lg: {
          red: "#A50034",      // LG Active Red (포인트 컬러)
          dark: "#7B0027",     // Hover 등 조금 더 어두운 Red
          light: "#FCE8EE",    // 배경용 연한 Red
        },
        // 관제 대시보드 전용 다크 테마 컬러
        dash: {
          bg: "#0B1120",       // 대시보드 전체 배경 (Deep Navy)
          panel: "#111827",    // 카드, 네비게이션 바 등 패널 배경
          border: "#1F2937",   // 패널 테두리
        }
      },
    },
  },
  plugins: [],
};
export default config;