"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoImage from "@/components/LogoImage";

export default function SplashScreen() {
  const router = useRouter();
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => setIsFadingOut(true), 1400);
    const redirectTimer = setTimeout(() => router.push("/dashboard"), 2000);
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg)]"
      style={{
        transition: "opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        opacity: isFadingOut ? 0 : 1,
        pointerEvents: isFadingOut ? "none" : "auto",
      }}
    >
      <div className="flex flex-col items-center">
        <div
          className="mb-6 opacity-0"
          style={{
            animation: "splashLogoIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards",
          }}
        >
          <div className="relative w-20 h-20 rounded-[22px] overflow-hidden shadow-glow">
            <LogoImage width={80} height={80} className="object-cover" priority />
          </div>
        </div>
        <h1
          className="text-[32px] font-semibold tracking-tight text-[var(--text)] opacity-0"
          style={{
            animation: "splashTitleIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.35s forwards",
          }}
        >
          Saveon
        </h1>
        <div className="mt-8 w-32 h-0.5 rounded-full bg-[var(--text-tertiary)]/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent-blue)] origin-left opacity-0"
            style={{
              animation: "splashProgress 1s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards",
            }}
          />
        </div>
      </div>
    </div>
  );
}
