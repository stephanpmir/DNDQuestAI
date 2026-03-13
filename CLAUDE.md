DNDQUESTAI — SESSION CONTEXT
STACK
Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Netlify
DEPLOY WORKFLOW
Push to claude/* branch only. GitHub Action auto-merges to main. Netlify auto-deploys from main. Never manually merge, never create PRs, never push directly to main.
AI PROVIDER CASCADE
Order: Cerebras → Groq → Moonshot → Z.ai
Env vars: CEREBRAS_API_KEY, GROQ_API_KEY, MOONSHOT_API_KEY, ZAI_API_KEY, NEXT_PUBLIC_POLLINATIONS_TOKEN
Z.ai requires "thinking":{"type":"disabled"} in request body. Use glm-4.5-air model only.
On 429/503/502 or empty content, fall through to next provider.
IMAGE GENERATION
Endpoint: gen.pollinations.ai (NOT image.pollinations.ai — that is deprecated and blocked in China)
Two proxy functions (never call Pollinations directly from browser):
  proxy-portrait.js — character portraits. Reads width/height from query params (default 512x768). No negative prompt. No prompt wrapping.
  proxy-scene.js — scene/landscape images. Hardcoded 800x450. Prepends "environment landscape architecture", appends "no people no faces no characters wide establishing shot dark fantasy digital art dramatic lighting". Includes negative param to block people/faces/characters.
DM avatar: fixed URL with seed 666, prompt is dragon eye
Portrait: generated from character appearance fields via /api/portrait-prompt
DM RESPONSE FORMAT
All DM responses must use bracketed delimiters. Narrative prose first, then structured fields:
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
Parse in parse-response.ts by splitting on [ delimiters. Everything before the first [ is the clean narrative.
STYLING RULES — DO NOT REVERT
DM avatar: plain img tag with inline styles only, no Tailwind, no shadcn. Fixed URL constant DM_AVATAR_URL at module level.
DM message bubble: plain div with inline styles only — background:none, backgroundColor:transparent, borderLeft 3px solid rgba(201,162,39,0.25). NO shadcn Card or CardContent wrappers anywhere in chat-message.tsx.
All dark fantasy colors: background #080808, gold #c9a227, crimson #6b0000, parchment text #e8d5b0.
Do not use Tailwind bg-* classes on the DM bubble or avatar — they get overridden by shadcn global styles.
KNOWN PAST MISTAKES — DO NOT REPEAT
Do not use image.pollinations.ai — use gen.pollinations.ai
Do not wrap DM messages in shadcn Card/CardContent — inline styles only
Do not push to main directly
Do not auto-resolve uncertain player actions — require a skill check
Do not let sceneImagePrompt or checkRequired appear in the narrative text shown to the player
SceneImage component must be wrapped in an error boundary so it cannot crash the app
Z.ai GLM reasoning models return empty content — always use glm-4.5-air with thinking disabled
proxy-portrait.js must read width/height from query params — never hardcode portrait dimensions (512x768)
Scene image prompts must be environment-only — no characters, races, classes, or living beings. proxy-scene.js handles all prompt wrapping and negative prompts
Never call Pollinations directly from the browser — always use the proxy functions
[SCENE_IMAGE_PROMPT] values: architecture, weather, lighting, objects only. Never mention people/figures/heroes
NARRATIVE RULES
Maximum 150 words per DM response, 3 paragraphs max, 2-4 sentences each.
Never auto-resolve uncertain actions — use checkRequired.
UPDATING THIS FILE
After every session that fixes a bug or establishes a new pattern, append a one-line entry to KNOWN PAST MISTAKES or update the relevant section. Keep it concise — this file must stay under 100 lines.
