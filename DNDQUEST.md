# DNDQuestAI — Game Bible

Solo AI-powered D&D 5e game. Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Netlify. Developed exclusively from iPhone/iPad via Claude Code web interface.

## AI Provider Cascade

Order: Cerebras → Groq → Moonshot → Z.ai
Env vars: CEREBRAS_API_KEY, GROQ_API_KEY, MOONSHOT_API_KEY, ZAI_API_KEY, NEXT_PUBLIC_POLLINATIONS_TOKEN
Z.ai requires "thinking":{"type":"disabled"} in request body. Use glm-4.5-air model only.
On 429/503/502 or empty content, fall through to next provider.

## Image Generation

Endpoint: gen.pollinations.ai (NOT image.pollinations.ai — deprecated and blocked in China)
Proxy: /.netlify/functions/proxy-portrait (handles portraits and scenes)
Portraits: default 512x768
Scenes: pass width=800&height=450. Proxy wraps with "environment landscape … no people wide shot dark fantasy"
DM avatar: fixed URL with seed 666, prompt is dragon eye
Portrait: generated from character appearance fields via /api/portrait-prompt
Scene image seed must be capped (timestamp % 1000000) — Pollinations rejects large seeds
Never call Pollinations directly from browser — always use proxy-portrait

## DM Response Format

All DM responses use bracketed delimiters. Narrative prose first, then structured fields:
[SCENE_IMAGE_PROMPT] prompt text here
[CHECK_REQUIRED] {"stat":"…","skill":"…","dc":0,"description":"…"}
[HP] current/max
[XP] value
[GOLD] value
[LOCATION] location name
[KARMA] value
[FAME] value
[AC] value
[WORN] item1|item2
[BACKPACK] item1|item2
[RESOURCES] key:value|key:value
Parse in parse-response.ts by splitting on [ delimiters. Everything before the first [ is clean narrative.
Strip any line starting with: ENGINE TAGS, STATE TAGS, Dice Roll:, Roll Result, Roll:, Karma Score:, Location:, Turn:, Active Quests:, HP: followed by numbers, character name followed by (ClassName)

## Combat Engine — Main Game

When player action contains attack verb directed at a named target:

1. Call getMonsterByName() for real stats. If not found use generic Human NPC: AC 10, HP 8, Attack +2, Damage 1d4
2. Roll player attack vs real AC. Apply proficiency bonus and relevant ability modifier
3. On hit, roll damage and subtract from tracked enemy HP in gs.combatState
4. Roll enemy counterattack using monster's real attack bonus vs player AC
5. Apply enemy damage to gs.character.hp immediately
6. Log: COMBAT ENGINE: target= AC= HP= playerRoll= hit= damage= enemyRoll= enemyHit= enemyDamage=

Enemy HP must NEVER show as a number to the player — use narrative descriptors: uninjured / lightly wounded / badly wounded / barely standing / on the verge of death
Initiative rolls at COMBAT_START: d20+DEX for player and enemy. Display who goes first. Winner attacks first that round.

## Death State

When gs.character.hp reaches 0: set isUnconscious to true
While isUnconscious: ignore player action, roll death save (d20, no modifier) each turn only
Nat 20 = regain 1 HP, isUnconscious false
Nat 1 = 2 failures
10+ = 1 success
Below 10 = 1 failure
3 successes = stabilized
3 failures = isDead true, end run, log PLAYER DEATH
Track deathSaveSuccesses and deathSaveFailures on gs.character
Display death save result as distinct entry separate from DM narrative

## Combat Display — Stepped Dice Roll

Step 1: "Rolling for attack…" with 400ms pause
Step 2: "Roll: N vs AC N — Hit/Miss/Critical Success/Critical Failure" in gold/gray/red
Step 3: DM narrative
Use "vs AC" for attack rolls. Use "vs DC" for skill checks only.
Blood drop indicator on hit: [attacker] hits [target] for [X] HP — red, left-aligned, not italic
Show for both player hits and enemy hits. Show nothing on a miss.

## Progression Engine

Combat cooldown: 4 turns minimum between enemy spawns. Track combatCooldown on gameState, decrement each turn.
No combat on turns 1 or 2 ever. Opening turn is world intro only — no enemies, no threats.
Urban/social location cap: if location contains tavern/inn/shop/market/town square/dock/port, cap danger score at 3.
Enemy must be contextually plausible — do not inject Giant Octopus during a dock conversation.

## Phase-Based Turn Structure

GamePhase values: exploration, combat, skill_check, looting, dialogue.

**Exploration:** Clean parchment prose. No combat cards, no roll lines. If a skill check fires, transition to skill_check phase immediately.

**Combat:** Triggered by attack roll. Hide normal DM narrative bubble during combat rounds. Render CombatCard showing: round number, initiative order, player attack roll/result, damage dealt, enemy condition, enemy counterattack, one short flavor sentence. Persists until enemy defeated or player flees.

**Skill check:** Render only the SkillCheckCard with Roll D20 button. Input field disabled with "Roll to continue" placeholder. After roll resolves, show outcome and return to exploration.

**Looting:** Triggered when combat ends with loot. Render LootModal exclusively — no DM narrative, no input. Player picks items, modal dismisses, then return to exploration.

**Dialogue:** NPC name in distinct violet label above speech. Still parchment style but distinguishable from DM narration.

**Input placeholders by phase:** exploration: "What do you do?", combat: "Your action in combat?", skill_check: "Roll to continue..." (disabled), looting: "Choose your loot..." (disabled), dialogue: "What do you say?"

## Sidebar — Main Game UI

Karma and Fame boxes removed from sidebar entirely.
ABILITIES panel above WORN, collapsible, split into two subcategories:
TALENTS: class features with limited uses (not passive). Show name, current/max, recharge dot (blue=short rest, gold=long rest)
SPELLS: cantrips with infinity symbol, leveled spells grouped by slot level. Show slot consumption.
Full = gold, partial = amber, depleted = red with strikethrough
Hide SPELLS subsection entirely for non-spellcasting classes (Barbarian, Fighter without EK, Rogue without AT)
Hide entire panel if no limited-use abilities exist
Speed display: "30 ft" inline — never stack number and "ft" on separate lines

## Mobile Rules

Narrative hard limit: 2 sentences maximum per DM response. Place at top of system prompt in all caps.
Never restate what the dice result already shows — DM adds flavor and consequence only.
Player input truncation: trim to 300 characters before sending to LLM.

## Narrative Rules

Maximum 150 words per DM response, 3 paragraphs max, 2-4 sentences each.
Never auto-resolve uncertain actions — use checkRequired.
Never offer numbered choice menus to the player — DM describes situation, player decides freely.
Never show enemy HP as numbers — narrative descriptors only.

## Styling Rules — Do Not Revert

DM avatar: plain img tag with inline styles only, no Tailwind, no shadcn. Fixed URL constant DM_AVATAR_URL at module level.
DM message bubble: plain div with inline styles only — background:none, backgroundColor:transparent, borderLeft 3px solid rgba(201,162,39,0.25). NO shadcn Card or CardContent wrappers in chat-message.tsx.
Dark fantasy colors: background #080808, gold #c9a227, crimson #6b0000, parchment text #e8d5b0.
Do not use Tailwind bg-* classes on DM bubble or avatar.

## Rules Reference System

Strict question-only trigger. Pre-check gate: if no question mark AND first word is not how/what/why/when/can/does/do/is/are/which, return null immediately. Never fires on action verbs, short conversational replies, roleplay statements, or messages under 6 words without a question mark. Returns a sky-blue rules card with no state changes, no turn increment.

## Karma and Fame System

Karma range: -100 to +100. Labels: Saintly (76+), Virtuous (51-75), Good (26-50), Neutral (-25 to 25), Selfish (-26 to -50), Malevolent (-51 to -75), Diabolical (-76 or below).

Good actions: help_npc +5, spare_enemy +8, protect_innocent +10, self_sacrifice +15. Evil actions: kill_innocent -15, steal -8, betray_ally -12, desecrate -10.

Fame range: 0-100. Fame DC for NPC recognition: max(0, 20 - floor(fame / 5)). Combat victories +1 fame, quest completion +3, karma actions +floor(abs(amount) / 2).

Divine intervention: 1% baseline, 4% at |karma| > 25, 8% at |karma| > 50. Good karma gets blessings (+2 roll modifier). Evil karma faces temptation or punishment.

## Fact Ledger

Categories: character, npc, location, quest, event, item, world, death. Max 20 anchor facts always in context. Auto-promotion at 3+ references or quest-critical or death category. Tags enable retrieval by NPC names and locations.

## Campaign Themes

20 themes: dungeon_crawl, wilderness_hex, urban_intrigue, horror, war_military, planar, political, mystery, heist, survival, epic_worldsaving, seafaring, underdark, dragon_focused, undead_necromancy, fey_nature, desert_arabian, oriental, norse_viking, gothic. Each has start location, opening quest, key NPCs, level range, tone guide, and narration profile.

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

## KNOWN PAST MISTAKES — DO NOT REPEAT

Do not use image.pollinations.ai — use gen.pollinations.ai
Do not wrap DM messages in shadcn Card/CardContent — inline styles only
Do not push to main directly
Do not auto-resolve uncertain player actions — require a skill check
Do not let sceneImagePrompt or checkRequired appear in narrative text
SceneImage must be wrapped in error boundary — cannot crash the app
Z.ai GLM reasoning models return empty content — always use glm-4.5-air with thinking disabled
proxy-portrait.js must read width/height from query params — never hardcode dimensions
Scene image prompts: architecture/weather/lighting/objects only — never mention people or living beings
Never call Pollinations directly from browser — always use proxy-portrait
Barbarian must not show Druid or other class spells — spells panel reads current character only
Do not substitute random monster when named NPC not in DB — use generic Human NPC stat block
Do not show enemy HP as a number anywhere in UI
Do not repeat attack roll info in combat card if already shown in roll result line
lootNarrative must only be appended once — check both combat engine and route handler for double-append
combatCooldown must be tracked on gameState and decremented every turn without exception
Auto-merge workflow must target main (not master) — master is a stale orphan branch
