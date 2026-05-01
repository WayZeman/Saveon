"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Wallet, FolderTree, Target, Settings, LogOut } from "lucide-react";
import LogoImage from "@/components/LogoImage";
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
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useData();
  const nav = navItems.map((item) => ({ ...item, label: t(item.labelKey) }));

  // На мобільній при перемиканні вкладок показувати сторінку з початку
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col md:flex-row bg-[var(--bg)]">
          <div className="mobile-top-bar md:hidden" aria-hidden="true" />

          {/* Desktop sidebar */}
          <aside className="glass-panel hidden md:flex md:w-[252px] md:sticky md:top-0 md:self-start md:h-screen flex-col border-r border-[var(--border)] shrink-0">
            <div className="p-6 pb-3">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
                  <LogoImage width={32} height={32} className="object-cover w-full h-full" />
                </div>
                <span className="text-[16px] font-semibold text-[var(--text)] tracking-tight">Saveon</span>
              </Link>
            </div>

            <nav className="flex flex-col gap-1 px-3 mt-4 flex-1">
              {nav.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[0.9rem] text-[14px] font-medium transition-all duration-200 ${active
                      ? "bg-[var(--accent-blue)]/14 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20"
                      : "text-[var(--text-secondary)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                      }`}
                  >
                    <Icon className="shrink-0 w-[18px] h-[18px]" strokeWidth={active ? 2 : 1.5} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 mt-auto border-t border-[var(--border)]">
              <button
                type="button"
                onClick={logout}
                title="Вийти"
                className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)] transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 flex flex-col min-h-screen min-h-[100dvh] pb-20 md:pb-0 relative">
            <SwipeNavigation>
              <IncomingPartnerInviteGate />
              <div className="relative z-10 flex-1 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-5 md:pl-[max(1.75rem,env(safe-area-inset-left))] md:pr-[max(1.75rem,env(safe-area-inset-right))] md:py-7 lg:pl-[max(2.25rem,env(safe-area-inset-left))] lg:pr-[max(2.25rem,env(safe-area-inset-right))] lg:py-8">
                {children}
              </div>
            </SwipeNavigation>
          </main>

          {/* Mobile bottom nav */}
          <nav
            className="glass-panel md:hidden fixed bottom-0 left-0 right-0 border-t border-[var(--border)] z-20"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            aria-label={t("nav_aria")}
          >
            <div className="flex justify-around items-center h-[58px]">
              {nav.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${active
                      ? "text-[var(--accent-blue)]"
                      : "text-[var(--text-tertiary)] active:text-[var(--text-secondary)]"
                      }`}
                  >
                    <Icon className="w-[20px] h-[20px]" strokeWidth={active ? 2 : 1.5} />
                    {label}
                  </Link>
                );
              })}
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
