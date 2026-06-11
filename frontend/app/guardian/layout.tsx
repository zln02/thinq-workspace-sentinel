import type { Metadata, Viewport } from "next";
import GuardianShell from "@/components/guardian/GuardianShell";

const BASE = process.env.NEXT_BASE_PATH || "";

export const metadata: Metadata = {
  title: "LG ThinQ 케어 · 가족 안심",
  description: "요양병원 보호자를 위한 실시간 안심 서비스",
  manifest: `${BASE}/manifest.webmanifest`,
  // iOS 홈화면 추가 시 네이티브 앱처럼: 화이트 헤더 → 상태바 검은 글씨(default) + 전용 아이콘
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ThinQ 케어" },
  icons: {
    icon: `${BASE}/icon-192.png`,
    apple: `${BASE}/icon-192.png`,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // 노치/홈인디케이터 영역까지 콘텐츠를 채우고 safe-area로 회피 (네이티브 풀스크린 느낌)
  viewportFit: "cover",
};

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  return <GuardianShell>{children}</GuardianShell>;
}
