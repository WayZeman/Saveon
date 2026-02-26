"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { Users } from "lucide-react";

export default function ComparisonPage() {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const { dashboardData: data, user, initialLoadDone } = useData();

  if (!initialLoadDone || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-[var(--text-tertiary)] border-t-[var(--text-secondary)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data.hasPartner || !data.comparison) {
    return (
      <div className="section-spacing max-w-5xl mx-auto">
        <div className="card text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          <h1 className="text-xl font-semibold mb-2">{t("comparison_unavailable")}</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mb-6">{t("comparison_addPartner")}</p>
          <Link href="/settings" className="inline-block rounded-xl bg-[var(--accent-blue)] text-white px-6 py-3 text-[14px] font-semibold hover:brightness-110 transition">
            {t("nav_settings")}
          </Link>
        </div>
      </div>
    );
  }

  const c = data.comparison;
  const myLabel = user?.role === "husband" ? t("settings_roleHusband") : user?.role === "wife" ? t("settings_roleWife") : t("comparison_me");
  const partnerLabel = user?.role === "husband" ? t("settings_roleWife") : user?.role === "wife" ? t("settings_roleHusband") : t("settings_partner");

  const chartData = [
    { name: t("comparison_income"), you: c.myIncome ?? 0, partner: c.partnerIncome ?? 0 },
    { name: t("comparison_balanceMonth"), you: c.mySaved, partner: c.partnerSaved },
  ];

  const diffSaved = c.mySaved - c.partnerSaved;

  return (
    <div className="section-spacing max-w-5xl mx-auto">
      <div className="opacity-0 animate-slide-up">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("comparison_title")}</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5">{t("comparison_subtitle", partnerLabel)}</p>
      </div>

      <section className="card opacity-0 animate-slide-up animate-stagger-1">
        <div className="h-72 md:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={13} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: "#1c1c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} formatter={(value: number) => [formatMoney(value), ""]} />
              <Legend />
              <Bar dataKey="you" fill="#0a84ff" name={`${t("comparison_you")} (${myLabel})`} radius={[8, 8, 0, 0]} />
              <Bar dataKey="partner" fill="#bf5af2" name={`${t("settings_partner")} (${partnerLabel})`} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] mt-4 text-center">
          {t("comparison_whoSavedMore")} <span className="text-[var(--text)] font-medium">{diffSaved >= 0 ? t("comparison_youShort") : partnerLabel}</span> — {formatMoney(Math.abs(diffSaved))}
        </p>
      </section>

      <p className="text-[13px] text-[var(--text-secondary)]">
        <Link href="/dashboard" className="text-[var(--accent-blue)] font-medium hover:underline">{t("comparison_backHome")}</Link>
      </p>
    </div>
  );
}
