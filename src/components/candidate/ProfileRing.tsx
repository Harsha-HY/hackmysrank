interface Props {
  percentage: number;
  size?: number;
  stroke?: number;
}

export default function ProfileRing({ percentage, size = 120, stroke = 10 }: Props) {
  const pct = Math.max(0, Math.min(100, percentage));
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const offset = c - (pct / 100) * c;
  const color = pct >= 80 ? "hsl(var(--primary))" : pct >= 50 ? "rgb(234 179 8)" : "rgb(239 68 68)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{pct}%</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}
