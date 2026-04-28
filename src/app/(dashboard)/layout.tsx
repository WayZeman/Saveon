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
          {/* Мобільна шапка: блюр без відтінку, плавний перехід знизу */}
          <div className="mobile-top-bar md:hidden" aria-hidden="true" />

          {/* Desktop sidebar */}
          <aside className="surface-panel hidden md:flex md:w-[252px] md:sticky md:top-4 md:self-start md:h-[calc(100vh-2rem)] flex-col shrink-0 m-4 mr-0">
            <div className="p-6 pb-3">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                  <LogoImage width={32} height={32} className="object-cover w-full h-full" />
                </div>
                <span className="text-[15px] font-semibold text-[var(--text)] tracking-tight">Saveon</span>
              </Link>
            </div>

            <nav className="flex flex-col gap-1 px-3 mt-4 flex-1">
              {nav.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${active
                      ? "bg-[var(--accent-blue)]/12 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20"
                      : "text-[var(--text-secondary)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]"
                      }`}
                  >
                    <Icon className="shrink-0 w-[18px] h-[18px]" strokeWidth={active ? 2 : 1.5} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 mt-auto subtle-divider">
              <button
                type="button"
                onClick={logout}
                title="Вийти"
                className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)] transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 flex flex-col min-h-screen min-h-[100dvh] pb-20 md:pb-0 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
              <div className="particle particle-1" />
              <div className="particle particle-2" />
              <div className="particle particle-3" />
              <div className="particle particle-4" />
              <div className="particle particle-5" />
              <div className="particle particle-6" />
              <div className="particle particle-7" />
              <div className="particle particle-8" />
            </div>

            <SwipeNavigation>
              <IncomingPartnerInviteGate />
              <div className="relative z-10 flex-1 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-5 md:pl-6 md:pr-6 md:py-6 lg:pl-8 lg:pr-8 lg:py-8">
                <div className="surface-panel p-4 md:p-5 lg:p-6 min-h-full">
                  {children}
                </div>
              </div>
            </SwipeNavigation>
          </main>

          {/* Mobile bottom nav */}
          <nav
            className="surface-panel md:hidden fixed bottom-2 left-2 right-2 z-20"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            aria-label={t("nav_aria")}
          >
            <div className="flex justify-around items-center h-14">
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
