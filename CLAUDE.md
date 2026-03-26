DNDQuestAI — Text-based AI D&D 5e game. Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui, Zustand, Netlify. Developed via Claude Code on iPhone and iPad.
For ALL game logic, DM behavior, combat engine, narrative rules, response formats, image generation, provider cascade, UI constraints, mobile limits, death saves, sidebar rules, and known past mistakes — ALWAYS read @DNDQUEST.md first before writing any code.
DEVELOPMENT WORKFLOW — Never push to main or master directly. Never create PRs. Never manually merge.
	1.	Make changes
	2.	npm run lint
	3.	npm run build
	4.	git checkout -b claude/description then git add . then git commit then git push
GitHub Action auto-merges claude/ to the production branch. Netlify auto-deploys from there.
ENVIRONMENT VARIABLES — Server-side only, never prefix with NEXT_PUBLIC unless required:
CEREBRAS_API_KEY, GROQ_API_KEY, MOONSHOT_API_KEY, ZAI_API_KEY, NEXT_PUBLIC_POLLINATIONS_TOKEN
COMMANDS:
npm run dev — start dev server
npm run build — production build
npm run lint — ESLint
CRITICAL RULES — Read @DNDQUEST.md at the start of every session. Update @DNDQUEST.md immediately when any rule is violated. Never use deprecated image endpoints. Never wrap DM bubble in shadcn Card. Keep combat and death saves faithful to @DNDQUEST.md.
