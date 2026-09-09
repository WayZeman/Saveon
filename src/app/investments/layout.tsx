export default function InvestmentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cortex-root h-[100dvh] overflow-hidden bg-[#07060b] text-[#ece8f5]">
      {children}
    </div>
  );
}
