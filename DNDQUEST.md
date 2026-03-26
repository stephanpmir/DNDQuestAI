# DNDQuestAI

Solo AI-powered D&D 5e game where Claude acts as Dungeon Master.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Cerebras API (Llama 3.1 8B) via OpenAI SDK — all calls server-side only
- **Database**: Supabase (Postgres + Auth)
- **State Management**: Zustand
- **Deploy**: Vercel

## Folder Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing / home page
│   ├── character/
│   │   └── page.tsx        # Character creation
│   ├── game/
│   │   └── page.tsx        # Main game / conversation UI
│   └── api/
│       └── dm/
│           └── route.ts    # AI Dungeon Master proxy (POST)
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── character/          # Character creation components
│   └── game/               # Game/conversation components
├── lib/
│   ├── ai/
│   │   ├── dm-prompt.ts    # System prompt for the DM
│   │   └── parse-response.ts # Parse structured JSON from AI
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   └── server.ts       # Server Supabase client
│   ├── utils.ts            # Shared utilities (cn helper, etc.)
│   └── constants.ts        # Game constants (races, classes, etc.)
├── stores/
│   ├── character-store.ts  # Zustand store for character state
│   └── game-store.ts       # Zustand store for game/session state
└── types/
    ├── character.ts        # Character types
    └── game.ts             # Game state, message, campaign types
```

## Rules

1. **Never expose API keys client-side.** All Anthropic SDK calls go through `/api/dm` route.
2. **TypeScript strict mode.** No `any` types unless absolutely necessary and documented.
3. **Server Components by default.** Only add `"use client"` when the component needs interactivity.
4. **AI responses are dual-format.** The DM returns narrative text AND structured JSON game state in every response.
5. **Keep components small.** Max ~150 lines per component file.
6. **Use shadcn/ui primitives.** Don't reinvent buttons, inputs, cards, etc.
7. **Zustand for client state.** No prop drilling beyond 2 levels.
8. **Tailwind only.** No CSS modules or styled-components.
9. **Commit after each major step.** Keep commits atomic and descriptive.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check (tsc --noEmit)
```

## Environment Variables

```
CEREBRAS_API_KEY=            # Server-side only — never prefix with NEXT_PUBLIC_
NEXT_PUBLIC_SUPABASE_URL=    # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon key
```

## Phase 1 MVP Scope

- Character creation (name, race, class, basic stats)
- Start a campaign with a DM-generated intro
- Conversation UI: player sends actions, AI DM responds with narrative + game state
- Game state tracks HP, inventory, location, quest progress
- All AI calls proxied server-side
