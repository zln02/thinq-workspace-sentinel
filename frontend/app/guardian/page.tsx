"use client";
// 스플래시 → 로그인 여부에 따라 홈/로그인으로
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/guardian";

export default function GuardianEntry() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(getSession() ? "/guardian/home" : "/guardian/login");
    }, 1100);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#A50034] to-[#7a0027] text-white">
      <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center animate-pulse">
        <ShieldCheck size={44} />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">LG ThinQ 케어</h1>
        <p className="text-sm text-white/80 mt-1">가족 안심 서비스</p>
      </div>
      <p className="absolute bottom-8 text-[11px] text-white/60">LG 디지털요양병원 · 감염관리 연동</p>
    </div>
  );
}
