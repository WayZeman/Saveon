"use client";

import { useEffect } from "react";

export default function InvestmentsLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  return (
    <div className="cortex-root fixed inset-0 z-50 h-[100dvh] overflow-hidden overscroll-none bg-[#07060b] text-[#ece8f5]">
      {children}
    </div>
  );
}
