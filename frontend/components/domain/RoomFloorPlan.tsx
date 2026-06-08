"use client";
// 방 평면도 + 가전 가동현황 (키오스크 openRoom → React 포팅)
//   space_type별 가구 차별화(다인실·음압격리·식당·휴게실) + tier별 가전 글로우
import { APPLIANCES, appOn, TIER_HEX, ROOM_TYPE_LABEL, type Tier } from "@/lib/appliances";

function Furniture({ type, occ }: { type: string; occ: number }) {
  if (type === "ISOLATION")
    return (
      <>
        <rect x="190" y="92" width="80" height="52" rx="7" fill="#fff" stroke="#c4b5fd" />
        <rect x="190" y="92" width="80" height="15" rx="7" fill="#f3e8ff" />
        <text x="230" y="126" textAnchor="middle" fontSize="9" fill="#9333ea">격리병상 1</text>
        <text x="230" y="62" textAnchor="middle" fontSize="11" fontWeight="800" fill="#9333ea">⊖ 음압 유지 · 단독공조</text>
        <line x1="110" y1="175" x2="155" y2="155" stroke="#9333ea" strokeWidth="2" markerEnd="url(#ar)" />
        <line x1="350" y1="175" x2="305" y2="155" stroke="#9333ea" strokeWidth="2" markerEnd="url(#ar)" />
      </>
    );
  if (type === "DINING") {
    const els: React.ReactNode[] = [];
    let n = 0;
    [100, 210, 320].forEach((x) =>
      [78, 158].forEach((y) => {
        if (n++ < 6)
          els.push(
            <g key={`t${x}-${y}`}>
              <circle cx={x} cy={y} r="23" fill="#fff" stroke="#cdd6e6" />
              <circle cx={x} cy={y} r="9" fill="#fef3e8" />
              <circle cx={x - 29} cy={y} r="5" fill="#e8edf5" />
              <circle cx={x + 29} cy={y} r="5" fill="#e8edf5" />
              <circle cx={x} cy={y - 29} r="5" fill="#e8edf5" />
              <circle cx={x} cy={y + 29} r="5" fill="#e8edf5" />
            </g>
          );
      })
    );
    return (
      <>
        {els}
        <text x="230" y="206" textAnchor="middle" fontSize="9" fill="#94a3b8">{occ || 50}인 식당 · 식사시간 밀집</text>
      </>
    );
  }
  if (type === "LOUNGE")
    return (
      <>
        <rect x="75" y="58" width="100" height="28" rx="9" fill="#fff" stroke="#cdd6e6" />
        <rect x="75" y="98" width="28" height="80" rx="9" fill="#fff" stroke="#cdd6e6" />
        <rect x="210" y="135" width="130" height="32" rx="9" fill="#fff" stroke="#cdd6e6" />
        <ellipse cx="185" cy="118" rx="38" ry="22" fill="#eef5fc" stroke="#cdd6e6" />
        <text x="230" y="206" textAnchor="middle" fontSize="9" fill="#94a3b8">휴게 라운지 · 소파/탁자</text>
      </>
    );
  // WARD 다인실 — 병상
  const cap = Math.min(occ || 4, 6);
  const bx = [70, 150, 230, 310];
  return (
    <>
      {Array.from({ length: cap }).map((_, b) => {
        const x = bx[b % 4] ?? 70;
        const y = b < 4 ? 52 : 150;
        return (
          <g key={b}>
            <rect x={x} y={y} width="58" height="40" rx="5" fill="#fff" stroke="#cdd6e6" />
            <rect x={x} y={y} width="58" height="13" rx="5" fill="#e8edf5" />
            <text x={x + 29} y={y + 30} textAnchor="middle" fontSize="9" fill="#94a3b8">병상{b + 1}</text>
          </g>
        );
      })}
    </>
  );
}

export function RoomFloorPlan({
  tier, spaceType = "WARD", occupancy = 4, areaM2,
}: { tier: Tier; spaceType?: string; occupancy?: number; areaM2?: number }) {
  const i = TIER_HEX[tier] ?? TIER_HEX.MONITOR;
  const pos: [number, number, string][] = [
    [62, 206, "공기청정기"], [230, 30, "에어컨(천장)"], [404, 118, "환기구"], [404, 206, "가습/제습"],
  ];
  return (
    <div>
      <div className="text-xs text-slate-400 font-semibold mb-1 ml-1">
        {ROOM_TYPE_LABEL[spaceType] ?? spaceType}{areaM2 ? ` · ${Math.round(areaM2)}㎡` : ""}
      </div>
      <svg viewBox="0 0 460 240" className="w-full">
        <defs>
          <marker id="ar" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#9333ea" />
          </marker>
        </defs>
        <rect x="40" y="22" width="380" height="196" rx="10" fill="#f7f9fc" stroke="#cdd6e6" strokeWidth="2" />
        <rect x="200" y="214" width="60" height="6" fill="#fff" />
        <text x="230" y="232" textAnchor="middle" fontSize="9" fill="#94a3b8">출입문</text>
        <Furniture type={spaceType} occ={occupancy} />
        {APPLIANCES.slice(0, 4).map((a, k) => {
          const act = a.act(tier);
          const on = appOn(act);
          const [x, y, label] = pos[k];
          const Icon = a.icon;
          return (
            <g key={a.n}>
              {on && (
                <circle cx={x} cy={y} r="20" fill={i.c} opacity="0.16">
                  <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={x} cy={y} r="13" fill={on ? i.c : "#cbd5e1"} />
              <g transform={`translate(${x - 8},${y - 8})`}>
                <Icon size={16} color="#fff" />
              </g>
              <text x={x} y={y + 25} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#475569">{label}</text>
            </g>
          );
        })}
      </svg>
      {/* 가전 전체 가동현황 */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {APPLIANCES.map((a) => {
          const act = a.act(tier);
          const on = appOn(act);
          const Icon = a.icon;
          return (
            <div key={a.n} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${on ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/15" : "border-slate-200 bg-slate-50 dark:bg-slate-800/30 dark:border-slate-700"}`}>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${on ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700"}`}>
                <Icon size={15} />
              </span>
              <span className="flex-1 min-w-0">
                <b className="text-[12.5px] font-bold block text-slate-700 dark:text-slate-200">{a.n}</b>
                <small className="text-[10px] text-slate-400">{a.lever}</small>
              </span>
              <span className={`text-[11px] font-extrabold ${on ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
                {a.live ? "🟢 " : ""}{on ? act : "대기"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
