"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const SPARKLINE = [
  { t: "0s", v: 58 }, { t: "10s", v: 61 }, { t: "20s", v: 63 },
  { t: "30s", v: 60 }, { t: "40s", v: 65 }, { t: "50s", v: 62 }, { t: "60s", v: 64 },
];

export default function KPIPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-[#A50034] mb-6">📊 PT 대시보드</h1>

      <div className="grid grid-cols-3 gap-4">
        {/* PoI 감축율 */}
        <div className="bg-white rounded-xl border p-4 shadow-sm col-span-1">
          <p className="text-sm text-gray-500">PoI 감축율</p>
          <p className="text-5xl font-bold text-[#A50034] mt-1">80%</p>
          <p className="text-xs text-green-600 mt-1">목표 ≥ 80% ✓</p>
        </div>

        {/* API 응답 */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">API p95 응답</p>
          <p className="text-5xl font-bold text-[#A50034] mt-1">320ms</p>
          <p className="text-xs text-green-600 mt-1">목표 &lt; 500ms ✓</p>
        </div>

        {/* F1 Score */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">F1 Score (UIS)</p>
          <p className="text-5xl font-bold text-[#A50034] mt-1">0.907</p>
          <p className="text-xs text-green-600 mt-1">목표 ≥ 0.85 ✓</p>
        </div>

        {/* 시뮬 처리량 */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">시뮬 처리량 (step/s)</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={SPARKLINE}>
              <Line type="monotone" dataKey="v" stroke="#A50034" strokeWidth={2} dot={false} />
              <XAxis dataKey="t" hide />
              <YAxis domain={[50, 70]} hide />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-green-600 mt-1">현재 64 step/s ✓</p>
        </div>

        {/* LTV/CAC */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">LTV / CAC</p>
          <p className="text-5xl font-bold text-[#A50034] mt-1">5x</p>
          <p className="text-xs text-green-600 mt-1">목표 ≥ 5x ✓</p>
        </div>

        {/* 수가 회수율 */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">정부수가 회수율</p>
          <p className="text-5xl font-bold text-[#A50034] mt-1">13.3x</p>
          <p className="text-xs text-green-600 mt-1">목표 ≥ 10x ✓</p>
        </div>
      </div>
    </div>
  );
}