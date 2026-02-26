"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";

const NAV_ORDER = [
  "/dashboard",
  "/transactions",
  "/categories",
  "/goals",
  "/settings",
];

const SWIPE_THRESHOLD = 60; // px minimum horizontal drag to trigger navigation
const SWIPE_RESTRAINT = 100; // px maximum vertical drift allowed
const PULL_THRESHOLD = 70; // px minimum vertical pull-down to trigger refresh

export default function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { refetchDashboard, refetchTransactions, refetchCategories, refetchGoals } = useData();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const pullingDown = useRef(false);

  useEffect(() => {
    const el = document.getElementById("swipe-container");
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      pullingDown.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX.current;
      const dy = touch.clientY - touchStartY.current;

      // Якщо користувач тягне вниз від самого верху сторінки — готуємо pull-to-refresh
      if (window.scrollY === 0 && dy > 0 && Math.abs(dy) > Math.abs(dx) && dy > PULL_THRESHOLD) {
        pullingDown.current = true;
      }
    };

    const onTouchEnd = async (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      const absDy = Math.abs(dy);
      touchStartX.current = null;
      touchStartY.current = null;

      // Якщо був жест pull-to-refresh зверху — оновлюємо дані на всіх вкладках
      if (pullingDown.current && window.scrollY === 0 && dy > PULL_THRESHOLD && absDy > Math.abs(dx)) {
        pullingDown.current = false;
        await Promise.allSettled([
          refetchDashboard(),
          refetchTransactions(),
          refetchCategories(),
          refetchGoals(),
        ]);
        router.refresh();
        return;
      }

      // Звичайний горизонтальний свайп для навігації
      if (absDy > SWIPE_RESTRAINT || Math.abs(dx) < SWIPE_THRESHOLD) return;

      const currentIdx = NAV_ORDER.indexOf(pathname);
      if (currentIdx === -1) return;

      if (dx < 0) {
        // Swipe left → go to next tab
        const next = NAV_ORDER[currentIdx + 1];
        if (next) router.push(next);
      } else {
        // Swipe right → go to previous tab
        const prev = NAV_ORDER[currentIdx - 1];
        if (prev) router.push(prev);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router, refetchDashboard, refetchTransactions, refetchCategories, refetchGoals]);

  return (
    <div id="swipe-container" className="flex-1 flex flex-col">
      {children}
    </div>
  );
}

