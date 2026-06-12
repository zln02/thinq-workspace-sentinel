"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const DATA = [
  { time: "00:00", co2: 620 },
  { time: "00:10", co2: 750 },
  { time: "00:20", co2: 900 },
  { time: "00:30", co2: 1100 },
  { time: "00:40", co2: 1350 },
  { time: "00:50", co2: 1510 },
  { time: "01:00", co2: 1850 },
];

export default function LiveSensorChart() {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <h3 className="font-bold text-sm mb-3">📈 실시간 CO₂ (ppm)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={DATA}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[500, 2000]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <ReferenceLine y={1000} stroke="#F9A825" strokeDasharray="4 4" label={{ value: "주의", fontSize: 11 }} />
          <ReferenceLine y={1500} stroke="#C62828" strokeDasharray="4 4" label={{ value: "위험", fontSize: 11 }} />
          <Line type="monotone" dataKey="co2" stroke="#7a0024" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}