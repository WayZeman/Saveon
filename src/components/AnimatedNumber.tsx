"use client";

import { useEffect, useRef, useState } from "react";

const APPLE_EASE = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

type Props = {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
  prefix?: string;
  delay?: number;
};

export function AnimatedNumber({ value, format, duration = 700, className = "", prefix = "", delay = 0 }: Props) {
  const [display, setDisplay] = useState(0);
  const [mounted, setMounted] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplay(Math.abs(value));
      setMounted(true);
      return;
    }
    hasAnimated.current = true;
    const start = performance.now();
    const absValue = Math.abs(value);

    const tick = (now: number) => {
      const elapsed = now - start - delay;
      if (elapsed < 0) {
        requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, elapsed / duration);
      const eased = APPLE_EASE(t);
      setDisplay(eased * absValue);
      if (t < 1) requestAnimationFrame(tick);
      else setMounted(true);
    };
    requestAnimationFrame(tick);
  }, [value, duration, delay]);

  const absDisplay = Math.round(display * 100) / 100;
  const formatted = format(absDisplay);

  return (
    <span className={className} data-animated={mounted ? "done" : "running"}>
      {prefix}
      {formatted}
    </span>
  );
}
