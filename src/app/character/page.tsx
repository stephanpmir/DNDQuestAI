import { CharacterWizard } from "@/components/character/character-wizard";

export default function CharacterPage() {
  return (
    <main className="relative min-h-screen py-10 px-6 bg-[#0a0a0a]">
      {/* Dark red / crimson vignette overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(139,0,0,0.12) 70%, rgba(40,0,0,0.35) 100%)",
        }}
      />
      {/* Subtle parchment noise texture at 3% opacity */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />
      <div className="relative z-10">
        <CharacterWizard />
      </div>
    </main>
  );
}
