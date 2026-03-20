DNDQUESTAI — SESSION CONTEXT

STACK
Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Netlify
Developed exclusively from iPhone/iPad via Claude Code web interface.

DEPLOY WORKFLOW
Push to claude/* branch only. GitHub Action auto-merges to main. Netlify auto-deploys from main.
Never manually merge, never create PRs, never push directly to main.

AI PROVIDER CASCADE
Order: Cerebras → Groq → Moonshot → Z.ai
Env vars: CEREBRAS_API_KEY, GROQ_API_KEY, MOONSHOT_API_KEY, ZAI_API_KEY, NEXT_PUBLIC_POLLINATIONS_TOKEN
Z.ai requires "thinking":{"type":"disabled"} in request body. Use glm-4.5-air model only.
On 429/503/502 or empty content, fall through to next provider.

IMAGE GENERATION
Endpoint: gen.pollinations.ai (NOT image.pollinations.ai — deprecated and blocked in China)
Proxy: /.netlify/functions/proxy-portrait (handles portraits and scenes)
Portraits: default 512x768
Scenes: pass width=800&height=450. Proxy wraps with "environment landscape … no people wide shot dark fantasy"
DM avatar: fixed URL with seed 666, prompt is dragon eye
Portrait: generated from character appearance fields via /api/portrait-prompt
Scene image seed must be capped (timestamp % 1000000) — Pollinations rejects large seeds
Never call Pollinations directly from browser — always use proxy-portrait

DM RESPONSE FORMAT
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

COMBAT ENGINE — MAIN GAME
When player action contains attack verb directed at a named target:

	1.	Call getMonsterByName() for real stats. If not found use generic Human NPC: AC 10, HP 8, Attack +2, Damage 1d4
	2.	Roll player attack vs real AC. Apply proficiency bonus and relevant ability modifier
	3.	On hit, roll damage and subtract from tracked enemy HP in gs.combatState
	4.	Roll enemy counterattack using monster's real attack bonus vs player AC
	5.	Apply enemy damage to gs.character.hp immediately
	6.	Log: COMBAT ENGINE: target= AC= HP= playerRoll= hit= damage= enemyRoll= enemyHit= enemyDamage=
Enemy HP must NEVER show as a number to the player — use narrative descriptors: uninjured / lightly wounded / badly wounded / barely standing / on the verge of death
Initiative rolls at COMBAT_START: d20+DEX for player and enemy. Display who goes first. Winner attacks first that round.

DEATH STATE
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

COMBAT DISPLAY — STEPPED DICE ROLL
Step 1: "🎲 Rolling for attack…" with 400ms pause
Step 2: "Roll: N vs AC N — Hit/Miss/Critical Success/Critical Failure" in gold/gray/red
Step 3: DM narrative
Use "vs AC" for attack rolls. Use "vs DC" for skill checks only.
Blood drop indicator on hit: 🩸 [attacker] hits [target] for [X] HP — red, left-aligned, not italic
Show for both player hits and enemy hits. Show nothing on a miss.

PROGRESSION ENGINE
Combat cooldown: 4 turns minimum between enemy spawns. Track combatCooldown on gameState, decrement each turn.
No combat on turns 1 or 2 ever. Opening turn is world intro only — no enemies, no threats.
Urban/social location cap: if location contains tavern/inn/shop/market/town square/dock/port, cap danger score at 3.
Enemy must be contextually plausible — do not inject Giant Octopus during a dock conversation.

SIDEBAR — MAIN GAME UI
Karma and Fame boxes removed from sidebar entirely.
ABILITIES panel above WORN, collapsible, split into two subcategories:
TALENTS: class features with limited uses (not passive). Show name, current/max, recharge dot (blue=short rest, gold=long rest)
SPELLS: cantrips with infinity symbol, leveled spells grouped by slot level. Show slot consumption.
Full = gold, partial = amber, depleted = red with strikethrough
Hide SPELLS subsection entirely for non-spellcasting classes (Barbarian, Fighter without EK, Rogue without AT)
Hide entire panel if no limited-use abilities exist
Speed display: "30 ft" inline — never stack number and "ft" on separate lines

MOBILE
Narrative hard limit: 2 sentences maximum per DM response. Place at top of system prompt in all caps.
Never restate what the dice result already shows — DM adds flavor and consequence only.
Player input truncation: trim to 300 characters before sending to LLM.

NARRATIVE RULES
Maximum 150 words per DM response, 3 paragraphs max, 2-4 sentences each.
Never auto-resolve uncertain actions — use checkRequired.
Never offer numbered choice menus to the player — DM describes situation, player decides freely.
Never show enemy HP as numbers — narrative descriptors only.

STYLING RULES — DO NOT REVERT
DM avatar: plain img tag with inline styles only, no Tailwind, no shadcn. Fixed URL constant DM_AVATAR_URL at module level.
DM message bubble: plain div with inline styles only — background:none, backgroundColor:transparent, borderLeft 3px solid rgba(201,162,39,0.25). NO shadcn Card or CardContent wrappers in chat-message.tsx.
Dark fantasy colors: background #080808, gold #c9a227, crimson #6b0000, parchment text #e8d5b0.
Do not use Tailwind bg-* classes on DM bubble or avatar.

KNOWN PAST MISTAKES — DO NOT REPEAT
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
