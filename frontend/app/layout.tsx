// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutNav } from "./layout-nav";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ThinQ Workspace Sentinel",
  description: "LG 스마트 요양병원 감염 관리 시스템",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      {/* 💡 라이트모드(bg-slate-50)와 다크모드(dark:bg-[#0B1120]) 전환 적용 */}
      <body className={`${inter.className} bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-200 flex min-h-screen transition-colors duration-300`}>
        <ThemeProvider>
          <LayoutNav />
          <div className="flex-1 flex flex-col h-screen overflow-y-auto">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}