import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DNDQuestAI — AI Dungeon Master",
  description:
    "A solo AI-powered D&D 5e adventure with an AI Dungeon Master.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans">
        <header className="h-16 border-b flex items-center px-6">
          <h1 className="text-lg font-bold tracking-tight">
            DNDQuestAI
          </h1>
        </header>
        {children}
      </body>
    </html>
  );
}
