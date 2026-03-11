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
      <div className="relative z-10">
        <CharacterWizard />
      </div>
    </main>
  );
}
