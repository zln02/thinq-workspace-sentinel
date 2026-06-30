// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ThinQ Space Sentinel",
  description: "LG 스마트 요양병원 감염 관리 시스템",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        {/* Material Symbols — Stitch v2 디자인(사이드바·로그인) 아이콘 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-200 flex min-h-screen transition-colors duration-300`}>
        <ThemeProvider>
          {/* 💡 사이드바 메뉴(LayoutNav)를 완전히 삭제하고 전체 화면을 사용합니다! */}
          <div className="flex-1 flex flex-col h-screen overflow-y-auto">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}