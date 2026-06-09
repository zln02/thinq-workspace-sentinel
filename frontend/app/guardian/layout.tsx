import type { Metadata, Viewport } from "next";
import GuardianShell from "@/components/guardian/GuardianShell";

const BASE = process.env.NEXT_BASE_PATH || "";

export const metadata: Metadata = {
  title: "LG ThinQ 케어 · 가족 안심",
  description: "요양병원 보호자를 위한 실시간 안심 서비스",
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ThinQ 케어" },
};

export const viewport: Viewport = {
  themeColor: "#A50034",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  return <GuardianShell>{children}</GuardianShell>;
}
