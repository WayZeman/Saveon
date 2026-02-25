import dynamic from "next/dynamic";

const HomePageContent = dynamic(() => import("../HomePageContent"), {
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="w-8 h-8 border-2 border-[var(--text-tertiary)]/30 border-t-[var(--accent-blue)] rounded-full animate-spin" style={{ animationDuration: "0.8s" }} />
    </div>
  ),
});

export default function DashboardPage() {
  return <HomePageContent />;
}
