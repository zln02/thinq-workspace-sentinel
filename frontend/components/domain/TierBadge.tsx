type Tier = "t1" | "t2" | "t3" | "t4" | "t5";

const TIER_CONFIG = {
  t1: { label: "Monitor",   icon: "●", fg: "#2E7D32", bg: "#E8F5E9" },
  t2: { label: "Caution",   icon: "▲", fg: "#F9A825", bg: "#FFF8E1" },
  t3: { label: "Alert",     icon: "■", fg: "#EF6C00", bg: "#FFF3E0" },
  t4: { label: "High Risk", icon: "◆", fg: "#C62828", bg: "#FFEBEE" },
  t5: { label: "Critical",  icon: "★", fg: "#FFFFFF", bg: "#1A1A1A" },
};

export default function TierBadge({ tier }: { tier: Tier }) {
  const { label, icon, fg, bg } = TIER_CONFIG[tier];
  return (
    <span
      style={{ color: fg, backgroundColor: bg }}
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
    >
      {icon} {label}
    </span>
  );
}