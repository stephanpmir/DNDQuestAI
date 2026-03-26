DNDQuestAI
Text-based AI Dungeons and Dragons game. Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui, Zustand, Netlify. Developed via Claude Code on iPhone and iPad.
For all game logic, DM behavior, combat engine, narrative rules, response formats, image generation, UI constraints, and known mistakes — ALWAYS read and follow @DNDQUEST.md exactly before making any changes.
DEVELOPMENT WORKFLOW
Never push directly to main. Never create PRs. Never manually merge.
	1.	Make changes in Claude Code
	2.	Lint before committing: npm run lint
	3.	Build to verify: npm run build
	4.	Commit and push ONLY to claude/ branch: git checkout -b claude/brief-description then git add . then git commit -m "your message" then git push -u origin claude/brief-description
GitHub Action auto-merges claude/ branches to main. Netlify auto-deploys from main.
CRITICAL RULES
Read @DNDQUEST.md at the start of every session before writing any code. Update @DNDQUEST.md immediately whenever Claude violates a rule — this is how mistakes are prevented permanently. Always use the AI provider cascade defined in @DNDQUEST.md. Always use the image proxy defined in @DNDQUEST.md. Never repeat any item from the KNOWN PAST MISTAKES section in @DNDQUEST.md.
STYLE AND ANTI-PATTERNS
Use inline styles for DM avatar and bubble — never shadcn Card wrappers. Respect all bracketed delimiters exactly as defined in @DNDQUEST.md. Combat engine and death save logic must match @DNDQUEST.md exactly. All narrative length and phase rules from @DNDQUEST.md apply to every single response.
