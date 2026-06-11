"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, FolderTree, Target, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const navItems = [
  { href: "/dashboard", labelKey: "nav_home" as const, Icon: Home },
  { href: "/transactions", labelKey: "nav_transactions" as const, Icon: Wallet },
  { href: "/categories", labelKey: "nav_categories" as const, Icon: FolderTree },
  { href: "/goals", labelKey: "nav_goals" as const, Icon: Target },
  { href: "/settings", labelKey: "nav_settings" as const, Icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const nav = navItems.map((item) => ({ ...item, label: t(item.labelKey) }));

  useEffect(() => {
    setMounted(true);
  }, []);

  const bar = (
    <nav className="mobile-bottom-nav md:hidden" aria-label={t("nav_aria")}>
      <div className="mobile-bottom-nav__inner mx-auto w-full px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <div className="flex justify-around items-center h-[58px]">
          {nav.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={label}
                className={`flex-1 flex items-center justify-center py-1.5 transition-colors ${
                  active
                    ? "text-[var(--accent-blue)]"
                    : "text-[var(--text-tertiary)] active:text-[var(--text-secondary)]"
                }`}
              >
                <Icon className="w-[24px] h-[24px]" strokeWidth={active ? 2 : 1.5} />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(bar, document.body);
}
