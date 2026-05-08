"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, FolderTree, Target, Settings } from "lucide-react";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DataProvider, useData } from "@/contexts/DataContext";
import SwipeNavigation from "@/components/SwipeNavigation";
import { PartnerInviteModal } from "@/components/PartnerInviteModal";

const navItems = [
  { href: "/dashboard", labelKey: "nav_home" as const, Icon: Home },
  { href: "/transactions", labelKey: "nav_transactions" as const, Icon: Wallet },
  { href: "/categories", labelKey: "nav_categories" as const, Icon: FolderTree },
  { href: "/goals", labelKey: "nav_goals" as const, Icon: Target },
  { href: "/settings", labelKey: "nav_settings" as const, Icon: Settings },
];

function IncomingPartnerInviteGate() {
  const { incomingPartnerInvite, partner, refetchPartner, refetchUser, refetchDashboard } = useData();

  if (partner || !incomingPartnerInvite) return null;

  return (
    <PartnerInviteModal
      invite={incomingPartnerInvite}
      onResolved={async () => {
        await Promise.all([refetchPartner(), refetchUser(), refetchDashboard()]);
      }}
    />
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useData();
  const nav = navItems.map((item) => ({ ...item, label: t(item.labelKey) }));

  // На мобільній при перемиканні вкладок показувати сторінку з початку
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-[var(--bg)]">
          <div className="mobile-top-bar" aria-hidden="true" />

          {/* Main content */}
          <main className="flex-1 flex flex-col min-h-screen min-h-[100dvh] pb-20 relative">
            <div className="pointer-events-none absolute inset-0 -z-[1] hidden md:block">
              <div className="absolute -top-24 -right-20 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-25 bg-[var(--accent-blue)]" />
              <div className="absolute top-1/3 -left-32 w-[26rem] h-[26rem] rounded-full blur-3xl opacity-20 bg-[var(--accent-purple)]" />
              <div className="absolute -bottom-24 left-1/3 w-[22rem] h-[22rem] rounded-full blur-3xl opacity-15 bg-[var(--accent-teal)]" />
            </div>
            <SwipeNavigation>
              <IncomingPartnerInviteGate />
              <div className="relative z-10 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-5 md:pl-[max(1.75rem,env(safe-area-inset-left))] md:pr-[max(1.75rem,env(safe-area-inset-right))] md:py-7 lg:pl-[max(2.25rem,env(safe-area-inset-left))] lg:pr-[max(2.25rem,env(safe-area-inset-right))] lg:pt-8 lg:pb-7">
                {children}
              </div>
            </SwipeNavigation>
          </main>

          {/* Bottom nav for all screen sizes */}
          <nav
            className="mobile-bottom-nav glass-panel fixed bottom-0 left-0 right-0 border-t border-[var(--border)] z-20"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            aria-label={t("nav_aria")}
          >
            <div className="mx-auto w-full max-w-[72rem] md:max-w-none px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
              <div className="flex justify-around items-center h-[58px]">
              {nav.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    title={label}
                    className={`flex-1 flex items-center justify-center py-1.5 transition-colors ${active
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
        </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <DataProvider>
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </DataProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
