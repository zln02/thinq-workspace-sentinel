"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const DATA = [
  { feature: "CO₂ 농도",    value: 0.42, positive: true },
  { feature: "재호흡률 f",   value: 0.31, positive: true },
  { feature: "재실 인원",    value: 0.18, positive: true },
  { feature: "외기질(KOWAS)", value: 0.12, positive: true },
  { feature: "환기 가동시간", value: -0.09, positive: false },
  { feature: "습도",         value: -0.05, positive: false },
];

export default function SHAPExplainer() {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <h3 className="font-bold text-sm mb-1">🔍 왜 이렇게 판단했나? (SHAP)</h3>
      <p className="text-xs text-gray-500 mb-3">각 요인이 위험도 판단에 미친 영향</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={DATA} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis type="number" domain={[-0.2, 0.5]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} width={100} />
          <Tooltip />
          <Bar dataKey="value" radius={4}>
            {DATA.map((entry, i) => (
              <Cell key={i} fill={entry.positive ? "#7a0024" : "#9B9B9B"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}