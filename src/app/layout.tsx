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
      <head>
        {/* Cinzel + Cinzel Decorative from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Cinzel+Decorative:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">
        <header className="h-16 border-b border-border/50 flex items-center px-6 bg-background/80 backdrop-blur-sm z-50 relative">
          <h1 className="text-lg font-bold tracking-tight font-cinzel">
            DNDQuestAI
          </h1>
        </header>
        {children}
      </body>
    </html>
  );
}
