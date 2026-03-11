"use client";

import { usePathname } from "next/navigation";

/** App header — hidden on the landing page for a full-screen atmospheric experience. */
export function AppHeader() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <header className="h-16 border-b border-border/50 flex items-center px-6 bg-background/80 backdrop-blur-sm z-50 relative">
      <h1 className="text-lg font-bold tracking-tight font-cinzel">
        DNDQuestAI
      </h1>
    </header>
  );
}
