import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Flexible string map — any key can be added */
export type UITranslations = Record<string, string>;

/** Default English strings */
export const EN_STRINGS: UITranslations = {
  // Landing page
  "landing.newAdventure": "New Adventure",
  "landing.continueAdventure": "Continue Adventure",
  "landing.loadGame": "Load Game",
  "landing.tagline": "Create a character, choose your path, and let the AI weave your story.",
  "landing.subtitle": "AI Dungeon Master",

  // Welcome step
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

  // Identity step
  "identity.title": "Who Are You?",
  "identity.description": "Give your character a name and choose their gender.",
  "identity.nameLabel": "Character Name",
  "identity.namePlaceholder": "Enter a name...",
  "identity.nameValidation": "Name must be at least 2 characters.",
  "identity.random": "Random",
  "identity.genderLabel": "Gender",
  "identity.next": "Next — Choose Race",

  // Race step
  "race.title": "Choose Your Race",
  "race.tip": "Your race determines your character's species — like human, elf, or dwarf. Each race gets special abilities and stat bonuses that help in different ways.",
  "race.description": "Each race has unique traits and ability bonuses. Tap any race to select it.",
  "race.halfElfTitle": "Half-Elf Bonus: Choose two abilities to gain +1",
  "race.halfElfTip": "Half-Elves get +2 Charisma automatically, plus +1 to two other abilities of your choice. Pick stats that help your class.",
  "race.firstBonus": "First +1",
  "race.secondBonus": "Second +1",
  "race.choose": "Choose...",
  "race.next": "Next — Choose Class",

  // Class step
  "class.title": "Choose Your Class",
  "class.tip": "Your class is your character's profession and fighting style. It determines what weapons you use, what spells you can cast, and how you approach combat.",
  "class.description": "Your class defines your abilities in combat and exploration.",
  "class.hitDie": "Hit Die",
  "class.primary": "Primary",
  "class.saves": "Saves",
  "class.next": "Next — Roll Abilities",

  // Abilities step
  "abilities.title": "Roll Your Ability Scores",
  "abilities.tip": "Ability scores are your character's core stats (like Strength and Intelligence). Higher scores make you better at related tasks. We roll 4 dice and drop the lowest for each stat.",
  "abilities.description": "Click \"Roll Dice\" to generate your stats. You get 1 full reroll and 2 individual rerolls.",
  "abilities.rollDice": "Roll Dice",
  "abilities.rerollAll": "Reroll All",
  "abilities.left": "left",
  "abilities.individualRemaining": "Individual rerolls remaining",
  "abilities.reroll": "Reroll",
  "abilities.from": "from",
  "abilities.next": "Next — Choose Skills",

  // Skills step
  "skills.title": "Skill Proficiencies",
  "skills.tip": "Skills represent what your character is trained in. Being proficient in a skill means you add a bonus when attempting related actions.",
  "skills.choose": "Choose",
  "skills.skills": "skills",
  "skills.remaining": "remaining",
  "skills.fightingStyleTitle": "Fighting Style",
  "skills.fightingStyleTip": "Your preferred way of fighting. This gives you a permanent bonus based on your combat preference.",
  "skills.fightingStyleDesc": "Choose your combat specialization.",
  "skills.cantripsTitle": "Cantrips",
  "skills.cantripsTip": "Cantrips are minor spells you can cast anytime without using a spell slot. Think of them as your magical basics.",
  "skills.cantrips": "cantrips",
  "skills.spellsTitle": "1st-Level Spells",
  "skills.spellsTip": "These are more powerful spells that use spell slots. You can only cast them a limited number of times before resting.",
  "skills.spells": "spells",
  "skills.next": "Next — Review Character",

  // Review step
  "review.description": "Review your character before starting the adventure.",
  "review.race": "Race",
  "review.class": "Class",
  "review.abilityScores": "Ability Scores",
  "review.skills": "Skills",
  "review.fightingStyle": "Fighting Style",
  "review.cantrips": "Cantrips",
  "review.spells": "Spells",
  "review.features": "Features & Traits",
  "review.racial": "racial",
  "review.beginAdventure": "Begin Adventure!",

  // Survey step
  "survey.question": "Question",
  "survey.of": "of",
  "survey.q1Title": "How do you want to solve problems?",
  "survey.q1Subtitle": "Pick the approach that sounds most fun to you.",
  "survey.q1Fight": "Fight!",
  "survey.q1FightDesc": "Charge in, swing a weapon, and overpower enemies.",
  "survey.q1Sneak": "Sneak",
  "survey.q1SneakDesc": "Stay in the shadows, pick locks, and strike unseen.",
  "survey.q1Magic": "Cast spells",
  "survey.q1MagicDesc": "Harness arcane or divine power to reshape reality.",
  "survey.q1Talk": "Talk it out",
  "survey.q1TalkDesc": "Charm, persuade, or intimidate your way through.",
  "survey.q2Title": "Are you a lone wolf or a team player?",
  "survey.q2Subtitle": "This shapes how your character interacts with NPCs.",
  "survey.q2Lone": "Lone wolf",
  "survey.q2LoneDesc": "Self-reliant and independent — you work best alone.",
  "survey.q2Team": "Team player",
  "survey.q2TeamDesc": "You support allies and share the spotlight.",
  "survey.q2Leader": "Natural leader",
  "survey.q2LeaderDesc": "You take charge and inspire others to follow.",
  "survey.q3Title": "How do you handle danger?",
  "survey.q3Subtitle": "There's no wrong answer — it's about your play style.",
  "survey.q3Cautious": "Think first",
  "survey.q3CautiousDesc": "Plan carefully, avoid unnecessary fights, stay safe.",
  "survey.q3Balanced": "Go with the flow",
  "survey.q3BalancedDesc": "Adapt to the situation — fight or flee as needed.",
  "survey.q3Reckless": "Dive in!",
  "survey.q3RecklessDesc": "Fortune favors the bold — take risks for big rewards.",
  "survey.q4Title": "What fantasy flavor appeals to you?",
  "survey.q4Subtitle": "This helps us pick a class theme you'll enjoy.",
  "survey.q4Martial": "Steel & strength",
  "survey.q4MartialDesc": "Swords, armor, and physical prowess.",
  "survey.q4Arcane": "Arcane mystery",
  "survey.q4ArcaneDesc": "Ancient spells, forbidden knowledge, raw power.",
  "survey.q4Holy": "Divine purpose",
  "survey.q4HolyDesc": "Faith, healing, and smiting evil.",
  "survey.q4Nature": "The wild",
  "survey.q4NatureDesc": "Animals, forests, and primal forces.",
  "survey.q4Shadow": "Shadows & cunning",
  "survey.q4ShadowDesc": "Stealth, trickery, and dark bargains.",
  "survey.q5Title": "How complex do you want your character?",
  "survey.q5Subtitle": "Simpler characters are easier to learn with.",
  "survey.q5Simple": "Keep it simple",
  "survey.q5SimpleDesc": "Fewer decisions in combat — great for beginners.",
  "survey.q5Moderate": "A bit of depth",
  "survey.q5ModerateDesc": "Some special abilities to manage each turn.",
  "survey.q5Complex": "Give me everything",
  "survey.q5ComplexDesc": "Lots of spells and options — I like choices!",
  "survey.skip": "Skip",

  // Suggestion step
  "suggestion.generating": "Generating Your Character...",
  "suggestion.generatingDesc": "Our AI is crafting a character based on your preferences.",
  "suggestion.wait": "This takes a few seconds...",
  "suggestion.skipManual": "Skip — I'll choose manually",
  "suggestion.errorTitle": "Couldn't Generate Profile",
  "suggestion.errorDesc": "Something went wrong. You can retry or choose manually.",
  "suggestion.tryAgain": "Try Again",
  "suggestion.chooseManually": "Choose Manually Instead",
  "suggestion.backToSurvey": "Back to Survey",
  "suggestion.meetCharacter": "Meet Your Character",
  "suggestion.meetDesc": "The AI suggested this based on your answers. Accept it, tweak it in the next steps, or generate a new one.",
  "suggestion.backstory": "Backstory",
  "suggestion.accept": "Accept & Start Adventure",
  "suggestion.modify": "Modify — Let Me Tweak It",
  "suggestion.generateDifferent": "Generate a Different Character",

  // Portrait loading
  "portrait.flavour1": "The fates are weaving your destiny...",
  "portrait.flavour2": "A new hero steps into the light...",
  "portrait.flavour3": "The realm holds its breath...",
  "portrait.flavour4": "Ancient magic stirs...",
  "portrait.generating": "Generating portrait...",
  "portrait.yourHero": "Your Hero",
  "portrait.reroll": "Reroll Portrait",
  "portrait.beginAdventure": "Begin Adventure",

  // Save/Load modal
  "save.autoSave": "Auto-Save",
  "save.slot1": "Slot 1",
  "save.slot2": "Slot 2",
  "save.slot3": "Slot 3",
  "save.empty": "Empty",
  "save.saveGame": "Save Game",
  "save.loadGame": "Load Game",
  "save.save": "Save",
  "save.overwrite": "Overwrite",
  "save.load": "Load",
  "save.delete": "Delete",
  "save.confirmDelete": "Click Delete again to confirm removal of",
  "save.cancel": "Cancel",

  // Death screen
  "death.title": "YOU DIED",
  "death.hasFallen": "has fallen.",
  "death.description": "You lie still on the cold ground, your adventure at an end...",
  "death.finalRecord": "Final Record",
  "death.level": "Level",
  "death.xpEarned": "XP Earned",
  "death.goldCollected": "Gold Collected",
  "death.turnsSurvived": "Turns Survived",
  "death.hallOfFallen": "Hall of the Fallen",
  "death.turns": "turns",
  "death.newAdventure": "Begin a New Adventure",

  // Auto-save indicator
  "autosave.justNow": "just now",
  "autosave.saved": "Saved",

  // Common buttons
  "common.next": "Next",
  "common.back": "Back",
  "common.save": "Save",
  "common.load": "Load",
  "common.cancel": "Cancel",
  "common.delete": "Delete",

  // Appearance step
  "appearance.title": "Describe Your Hero",
  "appearance.description": "Fill in as many or as few details as you like. Your race, class, and gender are already part of the portrait — these fields add the finishing touches.",
  "appearance.generate": "Generate My Portrait",
  "appearance.skip": "Skip — Use Random Portrait",

  // Game UI
  "game.characterSheet": "Character Sheet",
  "game.saveGame": "Save",
  "game.loadGame": "Load",
  "game.dmThinking": "The Dungeon Master is thinking...",
  "game.sendAction": "Send",
  "game.shortRest": "Short Rest",
  "game.longRest": "Long Rest",

  // Sidebar
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
  "sidebar.nearby": "Nearby Items",
  "sidebar.companions": "Companions",

  // Wizard step labels
  "wizard.step": "Step",
  "wizard.of": "of",
};

interface LanguageStore {
  /** Language name as typed by the user (e.g. "Español", "日本語", "English") */
  language: string;
  /** Translated UI strings */
  translations: UITranslations;
  /** Whether translations are currently being fetched */
  isTranslating: boolean;

  setLanguage: (lang: string) => void;
  setTranslations: (t: UITranslations) => void;
  setIsTranslating: (v: boolean) => void;
  /** Get a translated string by key, falling back to English */
  t: (key: string) => string;
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
