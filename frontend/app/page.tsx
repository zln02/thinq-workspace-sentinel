import Link from "next/link";
import TierBadge from "@/components/domain/TierBadge";
import RoomCard from "@/components/domain/RoomCard";
import FloorPlan from "@/components/domain/FloorPlan";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold text-lg-primary">ThinQ Workspace Sentinel</h1>
      <p className="text-slate-600 text-center max-w-xl">
        요양병원 RSV·인플루엔자·노로를 3주 전에 예측해 LG ThinQ 가전 8종이 자동 환경 제어하는 시스템
      </p>

      {/* 티어 배지 테스트 */}
      <div className="flex gap-2">
        <TierBadge tier="t1" />
        <TierBadge tier="t2" />
        <TierBadge tier="t3" />
        <TierBadge tier="t4" />
        <TierBadge tier="t5" />
      </div>

      {/* FloorPlan 테스트 */}
      <FloorPlan />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Link href="/admin" className="px-6 py-4 rounded-lg border bg-white hover:shadow-md transition">
          <div className="text-lg font-bold text-lg-primary">🖥 중앙 관제</div>
          <div className="text-sm text-slate-500">ICN · 원장 · 시설관리</div>
        </Link>
        <Link href="/mobile" className="px-6 py-4 rounded-lg border bg-white hover:shadow-md transition">
          <div className="text-lg font-bold text-lg-primary">📱 모바일</div>
          <div className="text-sm text-slate-500">요양보호사</div>
        </Link>
        <Link href="/demo" className="px-6 py-4 rounded-lg border bg-white hover:shadow-md transition">
          <div className="text-lg font-bold text-lg-primary">💡 75초 시연</div>
          <div className="text-sm text-slate-500">발표 자동 재생</div>
        </Link>
      </div>
    </main>
  );
}