// frontend/app/page.tsx — 통합 로그인 v9 (Stitch 하이테크 다크글래스 · 감염관리 통합 관제 센터)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HOSPITALS, ROLE_HOME, authenticate, setSession, bindRegion } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [hospitalId, setHospitalId] = useState(HOSPITALS[0].id);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const acc = authenticate(id, pw);
    if (!acc) { setError("아이디 또는 비밀번호가 올바르지 않습니다."); return; }
    const hospital = HOSPITALS.find((h) => h.id === hospitalId) ?? HOSPITALS[0];
    setBusy(true);
    setSession({
      account: acc.role, role: acc.role, name: acc.name,
      hospital: hospital.name, hospitalId: hospital.id, region: hospital.region,
    });
    if (acc.role !== "GUARDIAN") await bindRegion(hospital.region);
    router.push(ROLE_HOME[acc.role]);
  };

  return (
    <main className="bg-[#0a0508] h-screen w-screen overflow-hidden flex">
      {/* 배경: 하이테크 관제 센터 + 그리드/스캔 오버레이 */}
      <div className="w-full h-full relative flex items-center justify-center p-6 sm:p-12 overflow-hidden">
        {/* 배경: Spline 3D 맵 — 자동 회전(90s/바퀴) + 워터마크 가림. iframe은 클릭 비활성(데코 전용) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* 정적 스케일(회전 시 코너 클리핑 방지) → 그 안에서 회전 */}
          <div className="absolute inset-0 scale-[2.1]">
            <div className="absolute inset-0 animate-spin [animation-duration:90s] will-change-transform">
              <iframe
                src="https://my.spline.design/cascadeinteractivemap-QcQ8qFkPFEslxwAmhVJFUtuV/"
                title="ThinQ Sentinel 3D 관제 맵"
                loading="lazy"
                className="absolute inset-0 w-full h-full border-0"
              />
              {/* Spline 워터마크(우하단) 가림 — 회전 래퍼 안이라 함께 돌며 코너 추적, 가장자리 페이드 */}
              <div className="absolute bottom-0 right-0 w-56 h-16 bg-[radial-gradient(ellipse_at_bottom_right,#0a0508_50%,transparent_78%)]" />
            </div>
          </div>
        </div>
        {/* 가독성 오버레이 — Spline 은은히 비치게 + 그리드/스캔. 클릭은 맵으로 통과(인터랙티브 유지) */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-[#7a0024]/25 pointer-events-none z-0" />
        <div className="absolute inset-0 login-grid-overlay pointer-events-none z-0" />
        <div className="absolute inset-0 login-scan-overlay pointer-events-none z-0 w-full h-[200vh] -top-[50vh]" />

        {/* 다크 글래스 카드 */}
        <form
          onSubmit={onSubmit}
          className="dark-glass rounded-2xl w-full max-w-md p-8 sm:p-12 relative z-10 flex flex-col border-t-4 border-t-[#7a0024] shadow-2xl animate-in fade-in zoom-in-95 duration-500"
        >
          <div className="mb-8 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined fill text-[#7a0024] text-3xl">coronavirus</span>
              <h1 className="text-xl font-bold text-white tracking-tight">ThinQ Sentinel</h1>
            </div>
          </div>

          <div className="mb-9">
            <h2 className="text-2xl font-bold text-white mb-1 leading-snug">감염관리 통합 관제 센터</h2>
            <p className="text-sm text-gray-400 font-normal">Infection Control Command Center</p>
          </div>

          <div className="flex flex-col gap-5">
            {/* 관제 거점 (병원) */}
            <div>
              <label className="block text-[12px] font-semibold tracking-wider text-gray-400 mb-2">관제 거점</label>
              <div className="relative">
                <select
                  value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}
                  className="input-glass w-full rounded-lg px-4 py-3 appearance-none text-sm cursor-pointer [&>option]:bg-[#160c11]"
                >
                  {HOSPITALS.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.region}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* 보안 인가 ID */}
            <div>
              <label className="block text-[12px] font-semibold tracking-wider text-gray-400 mb-2">보안 인가 ID</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">badge</span>
                <input
                  value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="관리자 ID 입력" required
                  className="input-glass w-full rounded-lg pl-12 pr-4 py-3 text-sm placeholder-gray-500 transition-all"
                />
              </div>
            </div>

            {/* 인증 키 */}
            <div>
              <label className="block text-[12px] font-semibold tracking-wider text-gray-400 mb-2">인증 키</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">enhanced_encryption</span>
                <input
                  type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)}
                  autoComplete="current-password" placeholder="••••••••" required
                  className="input-glass w-full rounded-lg pl-12 pr-12 py-3 text-sm placeholder-gray-500 transition-all"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{showPw ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-300 font-semibold bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={busy}
              className="mt-2 text-white font-semibold text-sm py-4 rounded-lg flex items-center justify-center gap-2 transition-all group shadow-[0_4px_14px_rgba(122,0,36,0.4)] bg-gradient-to-r from-[#5e001b] to-[#7a0024] hover:from-[#7a0024] hover:to-[#92002c] disabled:opacity-60 relative overflow-hidden"
            >
              <span className="material-symbols-outlined text-[18px]">lock_person</span>
              {busy ? "세션 생성 중…" : "암호화 세션 시작"}
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}
