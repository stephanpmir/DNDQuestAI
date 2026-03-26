DNDQuestAI — Text-based AI D&D game. Next.js 15, TypeScript, Tailwind, shadcn/ui, Zustand, Netlify. Developed via Claude Code on iPhone and iPad.
For ALL game logic, DM behavior, combat engine, narrative rules, response formats, image generation, provider cascade, UI constraints, mobile limits, death saves, sidebar rules, and known past mistakes — ALWAYS read @DNDQUEST.md first on every task before writing any code.
DEVELOPMENT WORKFLOW — Never push to main directly. Never create PRs. Never manually merge.
	1.	Make changes
	2.	npm run lint
	3.	npm run build
	4.	git checkout -b claude/description then git add . then git commit then git push
GitHub Action auto-merges claude/ to main. Netlify auto-deploys from main.
CRITICAL RULES — Read @DNDQUEST.md at the start of every session. Update @DNDQUEST.md immediately when any rule is violated. Never use deprecated image endpoints. Never wrap DM bubble in shadcn Card. Keep combat and death saves faithful to @DNDQUEST.md.
