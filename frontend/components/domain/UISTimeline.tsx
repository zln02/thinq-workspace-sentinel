"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const DATA = [
  { week: "-8주", otc: 10, kowas: 8,  search: 6  },
  { week: "-7주", otc: 12, kowas: 9,  search: 7  },
  { week: "-6주", otc: 15, kowas: 11, search: 9  },
  { week: "-5주", otc: 20, kowas: 14, search: 12 },
  { week: "-4주", otc: 28, kowas: 18, search: 15 },
  { week: "-3주", otc: 38, kowas: 25, search: 20 },
  { week: "-2주", otc: 52, kowas: 35, search: 28 },
  { week: "-1주", otc: 68, kowas: 48, search: 38 },
  { week: "현재", otc: 85, kowas: 62, search: 50 },
];

export default function UISTimeline() {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <h3 className="font-bold text-sm mb-1">📡 UIS 외부 신호 타임라인</h3>
      <p className="text-xs text-gray-500 mb-3">8주 선행 지표 추이</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={DATA}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <ReferenceLine x="현재" stroke="#7a0024" strokeDasharray="4 4" label={{ value: "현재", fontSize: 11 }} />
          <Line type="monotone" dataKey="otc"    stroke="#7a0024" strokeWidth={2} dot={false} name="💊 OTC" />
          <Line type="monotone" dataKey="kowas"  stroke="#EF6C00" strokeWidth={2} dot={false} name="🧪 KOWAS" />
          <Line type="monotone" dataKey="search" stroke="#F9A825" strokeWidth={2} dot={false} name="🔍 검색" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}