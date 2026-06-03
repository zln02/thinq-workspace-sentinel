type LogItem = {
  time: string;
  tier: string;
  action: string;
  room: string;
  result: "성공" | "실패" | "진행중";
};

const LOGS: LogItem[] = [
  { time: "03:42", tier: "T3", action: "자동 환기 시작", room: "203호", result: "성공" },
  { time: "03:38", tier: "T4", action: "UV·강제환기 가동", room: "208호", result: "성공" },
  { time: "03:21", tier: "T2", action: "환기 권고 알림 발송", room: "202호", result: "성공" },
  { time: "02:55", tier: "T3", action: "공기청정기 강풍 전환", room: "203호", result: "성공" },
];

const RESULT_COLOR = {
  성공: "text-green-600",
  실패: "text-red-500",
  진행중: "text-orange-500",
};

export default function AutoActionLog() {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <h3 className="font-bold text-sm mb-3">📋 자동 대응 액션 로그</h3>
      <div className="flex flex-col gap-2">
        {LOGS.map((log, i) => (
          <div key={i} className="flex items-center gap-3 text-sm border-b pb-2 last:border-0">
            <span className="text-gray-400 w-12">{log.time}</span>
            <span className="bg-[#FCE8EE] text-[#A50034] text-xs font-bold px-2 py-0.5 rounded">{log.tier}</span>
            <span className="text-gray-500 w-16">{log.room}</span>
            <span className="flex-1 text-gray-700">{log.action}</span>
            <span className={`font-semibold ${RESULT_COLOR[log.result]}`}>{log.result}</span>
          </div>
        ))}
      </div>
    </div>
  );
}