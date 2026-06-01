export default function MobilePage() {
  return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-lg-primary">📱 요양보호사 화면</h1>
        <p className="text-xs text-slate-500">최주임 · 담당 병실 3개</p>
      </header>
      <div className="space-y-3">
        {["601", "602", "603"].map((r) => (
          <div key={r} className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="flex justify-between">
              <span className="font-bold">{r}호</span>
              <span className="text-green-600 font-bold">🟢 안전</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">CO₂ 720 · RH 50% · 재실 6/6</div>
          </div>
        ))}
      </div>
      <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
        🚧 W4 PWA 작업 예정 · 본인 담당 병실 1초 안심 확인 · 출퇴근 알림
      </div>
    </main>
  );
}
