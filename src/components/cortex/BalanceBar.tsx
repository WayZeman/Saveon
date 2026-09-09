"use client";

import { formatUsd } from "@/lib/cortex/money";

export function BalanceBar({ pnlUsd }: { pnlUsd: number }) {
  const up = pnlUsd >= 0;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 flex justify-center px-4">
      <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-white/15 bg-[#0c0a12]/90 px-7 py-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-transparent" />
        <p className="text-center text-[10px] uppercase tracking-[0.22em] text-zinc-400">P&L за весь час</p>
        <p className={`mt-0.5 text-center text-2xl font-semibold tracking-tight ${up ? "text-emerald-400" : "text-rose-400"}`}>
          {up ? "+" : ""}
          {formatUsd(pnlUsd)}
        </p>
      </div>
    </div>
  );
}
