import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold text-[#A50034]">ThinQ Workspace Sentinel</h1>
      <p className="text-slate-600 text-center max-w-xl">
        요양병원 RSV·인플루엔자·노로를 3주 전에 예측해 LG ThinQ 가전 8종이 자동 환경 제어하는 시스템
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Link href="/executive" className="px-6 py-4 rounded-lg border bg-white hover:shadow-md transition">
          <div className="text-lg font-bold text-[#A50034]">🖥 시설장</div>
          <div className="text-sm text-slate-500">Executive 대시보드</div>
        </Link>
        <Link href="/operations" className="px-6 py-4 rounded-lg border bg-white hover:shadow-md transition">
          <div className="text-lg font-bold text-[#A50034]">⚡ 운영자</div>
          <div className="text-sm text-slate-500">Operations 콘솔</div>
        </Link>
        <Link href="/family" className="px-6 py-4 rounded-lg border bg-white hover:shadow-md transition">
          <div className="text-lg font-bold text-[#A50034]">💚 가족</div>
          <div className="text-sm text-slate-500">Family 안심 뷰</div>
        </Link>
      </div>
    </main>
  );
}