import { useId } from "react";

type GoalProgressRingProps = {
  percent: number;
  size?: number;
  stroke?: number;
  accent?: "blue" | "purple" | "teal";
};

const ACCENTS = {
  blue: { from: "var(--accent-blue)", to: "var(--accent-teal)" },
  purple: { from: "var(--accent-purple)", to: "var(--accent-blue)" },
  teal: { from: "var(--accent-teal)", to: "var(--accent-green)" },
} as const;

export function GoalProgressRing({
  percent,
  size = 46,
  stroke = 3.5,
  accent = "blue",
}: GoalProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent ?? 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const { from, to } = ACCENTS[accent];
  const gradId = useId();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--input-bg)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-[var(--text)]"
        aria-label={`${clamped.toFixed(0)}%`}
      >
        {clamped.toFixed(0)}
      </span>
    </div>
  );
}
