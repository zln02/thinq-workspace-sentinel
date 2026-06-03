import "./globals.css";
import type { Metadata } from "next";
import NavSidebar from "./layout-nav";

export const metadata: Metadata = {
  title: "ThinQ Workspace Sentinel — 요양병원 중앙 관제",
  description: "RSV·인플루엔자·노로 3주 전 예측 + LG ThinQ 가전 8종 자동 환경 제어",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-slate-50 text-slate-900 antialiased flex">
        <NavSidebar />
        <main className="ml-48 flex-1 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}