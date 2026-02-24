"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV_ORDER = [
    "/dashboard",
    "/transactions",
    "/categories",
    "/goals",
    "/settings",
];

const SWIPE_THRESHOLD = 60; // px minimum horizontal drag to trigger navigation
const SWIPE_RESTRAINT = 100; // px maximum vertical drift allowed

export default function SwipeNavigation({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    useEffect(() => {
        const el = document.getElementById("swipe-container");
        if (!el) return;

        const onTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (touchStartX.current === null || touchStartY.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
            touchStartX.current = null;
            touchStartY.current = null;

            // Ignore if primarily a vertical scroll or not long enough
            if (dy > SWIPE_RESTRAINT || Math.abs(dx) < SWIPE_THRESHOLD) return;

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
        el.addEventListener("touchend", onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchend", onTouchEnd);
        };
    }, [pathname, router]);

    return (
        <div id="swipe-container" className="flex-1 flex flex-col">
            {children}
        </div>
    );
}
