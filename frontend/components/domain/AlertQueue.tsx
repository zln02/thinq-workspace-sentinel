import AlertToast from "./AlertToast";

const ALERTS = [
  { tier: "t3" as const, roomId: "203", message: "자동 환기 시작 ✓", time: "03:42" },
  { tier: "t4" as const, roomId: "208", message: "UV·환기 가동 ✓", time: "03:38" },
  { tier: "t2" as const, roomId: "202", message: "주의 — 환기 권고", time: "03:21" },
];

export default function AlertQueue() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">🔔 알림 큐</h2>
      {ALERTS.map((a, i) => (
        <AlertToast key={i} {...a} />
      ))}
    </div>
  );
}