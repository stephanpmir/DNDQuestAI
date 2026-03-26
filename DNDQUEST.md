# DNDQuestAI — Game Bible

Solo AI-powered D&D 5e game where Claude acts as Dungeon Master.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Cerebras API (Llama 3.1 8B) via OpenAI SDK — all calls server-side only
- **State Management**: Zustand (persisted to localStorage)
- **Deploy**: Netlify (auto-deploys from main)

## AI Provider Cascade

Primary and only provider: Cerebras (baseURL: `https://api.cerebras.ai/v1`), model `llama3.1-8b`, max 1024 tokens, 30s timeout. Server-side only — never expose CEREBRAS_API_KEY client-side. Retry up to 4 attempts with exponential backoff (2s base) on timeout, ECONNRESET, 502, 503, 429 errors.

## Folder Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing / home page
│   ├── character/page.tsx  # Character creation
│   ├── game/page.tsx       # Main game UI
│   └── api/dm/route.ts     # AI Dungeon Master proxy (POST)
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── character/          # Character creation components
│   └── game/               # Game components (game-view, chat-message, chat-input,
│                           #   combat-card, skill-check-card, loot-modal,
│                           #   character-sidebar, dice-roll-display, death-screen)
├── lib/
│   ├── ai/
│   │   ├── dm-prompt.ts    # System prompt for the DM narrator
│   │   └── parse-response.ts # Parse structured JSON from AI, strip artifacts
│   ├── engine/
│   │   ├── rules.ts        # Deterministic rules engine (resolveAction)
│   │   ├── pipeline.ts     # 8-step turn pipeline
│   │   ├── dice.ts         # Dice rolling functions
│   │   ├── fact-ledger.ts  # Fact storage, anchors, queries
│   │   ├── contradiction.ts # Detect narrative contradictions
│   │   ├── escalation.ts   # Loop detection
│   │   ├── guardrails.ts   # Narrative validation
│   │   ├── context-assembler.ts # Build LLM context window
│   │   └── rules-reference.ts  # Rules question detector (strict)
│   ├── karma.ts            # Karma/fame system
│   ├── crimes.ts           # Crime detection and guard system
│   └── campaigns.ts        # 20 campaign themes
├── stores/
│   ├── character-store.ts  # Character state + death saves + leveling
│   ├── game-store.ts       # Messages, location, quests, phase, turn count
│   ├── world-store.ts      # Facts, events, NPCs, locations
│   ├── karma-store.ts      # Karma history, companions
│   └── crime-store.ts      # Crime log, evidence, confrontations
└── types/
    ├── character.ts        # Character types, XP thresholds, defaults
    ├── game.ts             # GamePhase, CombatState, LootState, ChatMessage, DMResponsePayload
    ├── world.ts            # WorldEvent, RollResult, NPC, EngineOutcome
    └── companion.ts        # Companion types
```

## Combat Engine

**Attack flow:** d20 + ability modifier + proficiency bonus vs enemy AC. Natural 20 always hits. Natural 1 always misses. On hit: roll damage, gain XP. On miss: enemy counterattacks.

**Damage:** Melee 1d8 + ability modifier. Spell 2d6 + ability modifier. Critical hit doubles dice (not modifier). Minimum 1 damage on any hit.

**Enemy scaling by player level:**
- AC: 10 + proficiency bonus (12 at L1, 13 at L5, 14 at L9)
- Attack bonus: proficiency + 1
- Damage: 1d6 + floor(level / 4)
- Counterattack only triggers when player misses

**Proficiency bonus:** L1-4: +2, L5-8: +3, L9-12: +4, L13-16: +5, L17-20: +6.

## Death Save System

At 0 HP the character becomes unconscious. Each turn: d20 vs DC 10, no modifiers.

- Natural 20: regain 1 HP immediately, wake up, reset saves
- Natural 1: counts as 2 failures
- 10+: 1 success
- 2-9: 1 failure
- 3 successes: stabilized, regain 1 HP, wake up
- 3 failures: character is permanently dead

Any healing while unconscious wakes the character and resets death saves.

## Stepped Dice Roll Display

Rolls display inline as a centered pill: `reason | rolled+modifier = total vs DC | PASS/FAIL | NAT 20!/NAT 1!`

Color-coded: emerald for success, red for failure. Font mono. The SkillCheckCard shows an interactive Roll D20 button that blocks input until resolved.

## Progression Engine

**XP rewards per level:** [25, 50, 75, 100, 150, 200, 250, 350, 450, 550, 650, 800, 950, 1100, 1300, 1500, 1700, 2000, 2300, 2600]

- Combat victory: full reward
- Skill check success: max(5, floor(combat / 5))
- Exploration: max(3, floor(combat / 10))

**Level-up thresholds (D&D 5e):** L2: 300, L3: 900, L4: 2700, L5: 6500, L6: 14000, L7: 23000, L8: 34000, L9: 48000, L10: 64000, L11: 85000, L12: 100000, L13: 120000, L14: 140000, L15: 165000, L16: 195000, L17: 225000, L18: 265000, L19: 305000, L20: 355000.

**HP on level-up:** floor(hitDie / 2) + 1 + CON modifier per level.

**Hit dice:** Barbarian d12, Fighter/Paladin/Ranger d10, Bard/Cleric/Druid/Monk/Rogue/Warlock d8, Sorcerer/Wizard d6.

## Phase-Based Turn Structure

**GamePhase values:** exploration, combat, skill_check, looting, dialogue.

**Exploration:** Clean parchment prose. No combat cards, no roll lines. If a skill check fires, transition to skill_check phase immediately.

**Combat:** Triggered by attack roll. Hide normal DM narrative bubble. Render CombatCard showing: round number, initiative order, player attack roll/result, damage dealt, enemy condition, enemy counterattack, one short flavor sentence. Persists until enemy defeated or player flees.

**Skill check:** Render only the SkillCheckCard with Roll D20 button. Input field disabled with "Roll to continue" placeholder. After roll resolves, show outcome and return to exploration.

**Looting:** Triggered when combat ends with loot. Render LootModal exclusively — no DM narrative, no input. Player picks items, modal dismisses, then return to exploration.

**Dialogue:** NPC name in distinct violet label above speech. Still parchment style but distinguishable from DM narration.

**Input placeholders by phase:** exploration: "What do you do?", combat: "Your action in combat?", skill_check: "Roll to continue..." (disabled), looting: "Choose your loot..." (disabled), dialogue: "What do you say?"

## DM Narrator Rules

The LLM is the narrator only. The engine decides all mechanics. 17 strict rules:

1. Never invent mechanical effects — no "you gain 50 gold" or "you find a sword" in narrative
2. Must incorporate engine outcomes exactly — if roll failed, narrate failure
3. Never contradict permanent facts from the fact ledger
4. Never list action options or choices — no "You could...", no numbered menus
5. Max 250 words per response
6. Pure prose only — no markdown, no JSON keys, no code in narrative text
7. Never open with state summary — no "As a level X..." or "With your HP at..."
8. First turn must introduce a quest/objective with vivid location description
9. Reflect karma alignment in NPC reactions
10. Narrate impossible action failures naturally — gravity wins, no magic for non-casters

## Response Format and Parsing

LLM must respond with JSON: `{"narrative": "pure prose text"}`. Parser strips: code fences, gameStateUpdate blocks, mechanical statements, markdown formatting, state preambles, suggested action lists, orphaned braces. gameStateUpdate always empty from LLM — engine controls all state.

## Sidebar Rules

Renders in fixed 288px (w-72) aside, hidden on mobile (md:block). Shows:
- Character identity (name, level, gender, race, class)
- HP bar with red gradient
- XP bar with level threshold
- Unconscious/death save warnings (animated)
- AC, gold, 6 ability scores with modifiers
- Karma alignment label and fame level
- Collapsible equipment and backpack sections
- Active companions with approval ratings
- Location, turn counter, quest log

Use inline styles for DM avatar and chat bubbles — never wrap in shadcn Card components.

## Karma and Fame System

**Karma range:** -100 to +100. Labels: Saintly (76+), Virtuous (51-75), Good (26-50), Neutral (-25 to 25), Selfish (-26 to -50), Malevolent (-51 to -75), Diabolical (-76 or below).

**Good actions:** help_npc +5, spare_enemy +8, protect_innocent +10, self_sacrifice +15. **Evil actions:** kill_innocent -15, steal -8, betray_ally -12, desecrate -10.

**Fame range:** 0-100. Fame DC for NPC recognition: max(0, 20 - floor(fame / 5)). Combat victories +1 fame, quest completion +3, karma actions +floor(abs(amount) / 2).

**Divine intervention:** 1% baseline, 4% at |karma| > 25, 8% at |karma| > 50. Good karma gets blessings (+2 roll modifier). Evil karma faces temptation or punishment.

## Fact Ledger

Categories: character, npc, location, quest, event, item, world, death. Max 20 anchor facts always in context. Auto-promotion at 3+ references or quest-critical or death category. Tags enable retrieval by NPC names and locations.

## Campaign Themes

20 themes: dungeon_crawl, wilderness_hex, urban_intrigue, horror, war_military, planar, political, mystery, heist, survival, epic_worldsaving, seafaring, underdark, dragon_focused, undead_necromancy, fey_nature, desert_arabian, oriental, norse_viking, gothic. Each has start location, opening quest, key NPCs, level range, tone guide, and narration profile.

## Rules Reference System

Strict question-only trigger. Pre-check gate: if no question mark AND first word is not how/what/why/when/can/does/do/is/are/which, return null immediately. Never fires on action verbs, short conversational replies, roleplay statements, or messages under 6 words without a question mark. Returns a sky-blue rules card with no state changes, no turn increment.

## Action Detection Patterns

- **Attack:** attack, strike, hit, fight, slash, stab, shoot, swing
- **Spell:** cast, spell, magic, fireball, heal, cure
- **Skill check:** pick lock, sneak, hide, stealth, climb, swim, jump, search, investigate, persuade, intimidate, deceive, perception
- **Rest:** rest, sleep, camp (minimum 5 turns between rests)
- **Talk:** talk, speak, ask, greet, negotiate, converse, say
- **Trade:** buy, sell, trade, shop, purchase, barter
- **Item use:** use, drink, eat, equip, open, read
- **Explore:** explore, look around, examine, enter, go to, travel, move, walk, head

## Action Validation

Non-casters cannot cast spells, fly, summon creatures, teleport, or use any magic. Half-casters unlock spells at L2. Full casters: Fly L5+, Summon L5+, Teleport L3+. Physical impossibilities always denied: destroy cities, become gods, time travel, infinite resources.

## Mobile Rules

Sidebar hidden below md breakpoint. Game uses 100dvh for full viewport. Chat area scrolls independently. Typewriter effect at ~1200 WPM (10ms/char) with auto-scroll every 20 characters.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check (tsc --noEmit)
```

## Environment Variables

```
CEREBRAS_API_KEY=               # Server-side only
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
```

## KNOWN PAST MISTAKES

1. **Auto-merge workflow referenced `main` instead of `master`** — repo default branch is master. Fixed in auto-merge.yml.
2. **Rules detector intercepting player actions** — must have strict pre-check: no question mark + no question word = null immediately. Never fire on action verbs or short replies.
3. **LLM inventing items/gold/XP in narrative** — parse-response.ts strips mechanical override statements. Engine is sole authority for state changes.
4. **State preambles in DM responses** — "As a level X Fighter..." stripped by parser. DM prompt rule 7 forbids opening with state summaries.
5. **Suggested action lists in narrative** — "You could: 1) attack 2) flee" stripped by parser. DM prompt rule 8 forbids listing options.
6. **Travel encounters on local movement** — entering an inn should not trigger wilderness combat. Fixed: only overland travel (isTravel flag) triggers encounters.
7. **Rest abuse** — minimum 5 turns between rests enforced by engine.
8. **Wrapping DM bubble in shadcn Card** — use inline styles for DM avatar and bubble, never Card wrappers.
