"use client";

import { PROJECT_HORIZONS, type ProjectHorizon } from "@/lib/cortex/project";

export function HorizonChips({
  value,
  onChange,
  className = "",
}: {
  value: ProjectHorizon | 0;
  onChange: (years: ProjectHorizon | 0) => void;
  className?: string;
}) {
  const options: Array<ProjectHorizon | 0> = [0, ...PROJECT_HORIZONS];
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {options.map((years) => {
        const active = value === years;
        return (
          <button
            key={years}
            type="button"
            onClick={() => onChange(years)}
            className={`min-h-8 rounded-lg border px-2.5 text-xs font-medium transition ${
              active
                ? "border-violet-400/60 bg-violet-500/20 text-violet-100"
                : "border-white/10 bg-white/5 text-zinc-400 active:bg-white/10"
            }`}
          >
            {years === 0 ? "зараз" : `${years} р`}
          </button>
        );
      })}
    </div>
  );
}
