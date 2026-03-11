import { create } from "zustand";
import { persist } from "zustand/middleware";

/** All translatable UI string keys */
export interface UITranslations {
  // Landing page
  "landing.newAdventure": string;
  "landing.continueAdventure": string;
  "landing.loadGame": string;
  "landing.tagline": string;
  "landing.subtitle": string;
  // Welcome step
  "welcome.title": string;
  "welcome.description": string;
  "welcome.createCharacter": string;
  "welcome.helpMeChoose": string;
  "welcome.quickStart": string;
  "welcome.helpText": string;
  "welcome.stepsIntro": string;
  "welcome.step1": string;
  "welcome.step2": string;
  "welcome.step3": string;
  "welcome.step4": string;
  "welcome.step5": string;
  // Identity step
  "identity.title": string;
  "identity.nameLabel": string;
  "identity.namePlaceholder": string;
  "identity.genderLabel": string;
  "identity.next": string;
  "identity.back": string;
  // Common buttons
  "common.next": string;
  "common.back": string;
  "common.save": string;
  "common.load": string;
  "common.cancel": string;
  "common.delete": string;
  // Appearance step
  "appearance.title": string;
  "appearance.description": string;
  "appearance.generate": string;
  "appearance.skip": string;
  // Game UI
  "game.characterSheet": string;
  "game.saveGame": string;
  "game.loadGame": string;
  "game.dmThinking": string;
  "game.sendAction": string;
  "game.shortRest": string;
  "game.longRest": string;
  // Sidebar
  "sidebar.hp": string;
  "sidebar.xp": string;
  "sidebar.ac": string;
  "sidebar.gold": string;
  "sidebar.karma": string;
  "sidebar.fame": string;
  "sidebar.location": string;
  "sidebar.worn": string;
  "sidebar.backpack": string;
  "sidebar.quests": string;
  "sidebar.companions": string;
}

/** Default English strings */
export const EN_STRINGS: UITranslations = {
  "landing.newAdventure": "New Adventure",
  "landing.continueAdventure": "Continue Adventure",
  "landing.loadGame": "Load Game",
  "landing.tagline": "Create a character, choose your path, and let the AI weave your story.",
  "landing.subtitle": "AI Dungeon Master",
  "welcome.title": "Welcome, Adventurer!",
  "welcome.description": "You're about to create a character for a solo D&D adventure with an AI Dungeon Master. Don't worry if you're new — we'll walk you through each step.",
  "welcome.createCharacter": "Create My Character",
  "welcome.helpMeChoose": "I'm New — Help Me Choose",
  "welcome.quickStart": "Quick Start — Surprise Me!",
  "welcome.helpText": "\"Help Me Choose\" asks a few quick questions to suggest a character. Quick Start generates one randomly.",
  "welcome.stepsIntro": "Here's what we'll set up:",
  "welcome.step1": "Your character's name and identity",
  "welcome.step2": "Race — determines special abilities and stat bonuses",
  "welcome.step3": "Class — your role in combat and exploration",
  "welcome.step4": "Ability scores — your character's core stats",
  "welcome.step5": "Skills and spells — what you're good at",
  "identity.title": "Identity",
  "identity.nameLabel": "Character Name",
  "identity.namePlaceholder": "Enter your character's name",
  "identity.genderLabel": "Gender",
  "identity.next": "Next",
  "identity.back": "Back",
  "common.next": "Next",
  "common.back": "Back",
  "common.save": "Save",
  "common.load": "Load",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "appearance.title": "Describe Your Hero",
  "appearance.description": "Fill in as many or as few details as you like. Your race, class, and gender are already part of the portrait — these fields add the finishing touches.",
  "appearance.generate": "Generate My Portrait",
  "appearance.skip": "Skip — Use Random Portrait",
  "game.characterSheet": "Character Sheet",
  "game.saveGame": "Save",
  "game.loadGame": "Load",
  "game.dmThinking": "The Dungeon Master is thinking...",
  "game.sendAction": "Send",
  "game.shortRest": "Short Rest",
  "game.longRest": "Long Rest",
  "sidebar.hp": "HP",
  "sidebar.xp": "XP",
  "sidebar.ac": "AC",
  "sidebar.gold": "Gold",
  "sidebar.karma": "Karma",
  "sidebar.fame": "Fame",
  "sidebar.location": "Location",
  "sidebar.worn": "Worn",
  "sidebar.backpack": "Backpack",
  "sidebar.quests": "Quests",
  "sidebar.companions": "Companions",
};

interface LanguageStore {
  /** Language name as typed by the user (e.g. "Español", "日本語", "English") */
  language: string;
  /** Translated UI strings; null until translations load */
  translations: UITranslations;
  /** Whether translations are currently being fetched */
  isTranslating: boolean;

  setLanguage: (lang: string) => void;
  setTranslations: (t: UITranslations) => void;
  setIsTranslating: (v: boolean) => void;
  /** Get a translated string by key, falling back to English */
  t: (key: keyof UITranslations) => string;
  reset: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: "English",
      translations: EN_STRINGS,
      isTranslating: false,

      setLanguage: (language) => set({ language }),
      setTranslations: (translations) => set({ translations, isTranslating: false }),
      setIsTranslating: (isTranslating) => set({ isTranslating }),

      t: (key) => {
        const val = get().translations[key];
        return val || EN_STRINGS[key] || key;
      },

      reset: () => set({ language: "English", translations: EN_STRINGS, isTranslating: false }),
    }),
    {
      name: "dndquest-language",
      partialize: (s) => ({
        language: s.language,
        translations: s.translations,
      }),
    }
  )
);
