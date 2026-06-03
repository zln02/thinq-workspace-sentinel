type Level = "안심" | "주의" | "위험";

interface SafetyScoreProps {
  score: number;
}

function getLevel(score: number): { level: Level; color: string; border: string } {
  if (score >= 80) return { level: "안심", color: "#2E7D32", border: "#4CAF50" };
  if (score >= 50) return { level: "주의", color: "#F9A825", border: "#FFC107" };
  return { level: "위험", color: "#C62828", border: "#EF5350" };
}

export default function SafetyScore({ score }: SafetyScoreProps) {
  const { level, color, border } = getLevel(score);
  return (
    <div
      style={{ borderColor: border }}
      className="w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center bg-white shadow-sm"
    >
      <span style={{ color }} className="text-4xl font-bold">{score}</span>
      <span style={{ color }} className="text-sm font-semibold">{level}</span>
    </div>
  );
}