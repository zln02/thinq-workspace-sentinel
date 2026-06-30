// frontend/tailwind.config.ts (파일 상단 부분)
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // 💡 이 줄을 꼭 추가해 주세요!
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",   // tier 토큰 등 lib 내 className 문자열 스캔(누락 시 bg-tier-* 미생성)
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
        },
        // 5단계 위험 티어 — 단일 색 토큰(임상 대시보드 UX 리서치 반영).
        //  · 긴급도 단조 증가: 정상(그린)→심각(크림슨), 명도↓·채도↑
        //  · 순수 red 는 '위험/심각'에만 예약(ISA-101). 색맹 대비: 이모지+라벨 중복 인코딩(lib/tier).
        //  · base=솔리드 배경(흰 글자 AA), -bg=연한 틴트, -fg=흰 배경 위 텍스트(AA ≥4.5:1)
        tier: {
          monitor: "#15803d",      caution: "#facc15",      alert: "#ea580c",      high: "#dc2626",      critical: "#9f1239",
          "monitor-bg": "#ecfdf3", "caution-bg": "#fefbeb", "alert-bg": "#fff4ec", "high-bg": "#fdecec", "critical-bg": "#fbe9ee",
          "monitor-fg": "#15803d", "caution-fg": "#a16207", "alert-fg": "#c2410c", "high-fg": "#b91c1c", "critical-fg": "#9f1239",
        },
        // 보호자 앱(LG ThinQ 케어) — globals.css :root 토큰 참조
        care: {
          red: "var(--care-red)",
          "red-press": "var(--care-red-press)",
          "red-soft": "var(--care-red-soft)",
          bg: "var(--care-bg)",
          card: "var(--care-card)",
          ink: "var(--care-ink)",
          "ink-2": "var(--care-ink-2)",
          "ink-3": "var(--care-ink-3)",
          line: "var(--care-line)",
        },
      },
    },
  },
  plugins: [],
};
export default config;