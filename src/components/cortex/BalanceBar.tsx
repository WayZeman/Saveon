"use client";

import { formatUsd } from "@/lib/cortex/money";

export function BalanceBar({ pnlUsd, hidden = false }: { pnlUsd: number; hidden?: boolean }) {
  const up = pnlUsd >= 0;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-[max(1.1rem,env(safe-area-inset-bottom))] z-10 flex justify-center px-16 transition-opacity duration-200 sm:px-20 ${
        hidden ? "pointer-events-none opacity-0 md:opacity-100" : "opacity-100"
      }`}
    >
      <div className="pointer-events-auto relative max-w-[min(100%,16rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#0c0a12]/90 px-5 py-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:max-w-none sm:px-7 sm:py-3.5">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-transparent" />
        <p className="text-center text-[10px] uppercase tracking-[0.18em] text-zinc-400 sm:tracking-[0.22em]">
          P&L за весь час
        </p>
        <p
          className={`mt-0.5 text-center text-xl font-semibold tracking-tight sm:text-2xl ${
            up ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {up ? "+" : ""}
          {formatUsd(pnlUsd)}
        </p>
      </div>
    </div>
  );
}
