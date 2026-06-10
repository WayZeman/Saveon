"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { PwaViewport } from "@/components/PwaViewport";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <PwaViewport />
      {children}
    </LanguageProvider>
  );
}
