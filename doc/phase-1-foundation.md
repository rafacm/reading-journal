# Phase 1: Foundation & Setup

## What was set up

### Vite + React + TypeScript
- Scaffolded manually (to preserve existing docs in the repo root)
- Strict TypeScript config across `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Path alias `@/` → `src/` configured in both `vite.config.ts` and TypeScript configs

### Tailwind CSS v4
- Installed via `@tailwindcss/vite` Vite plugin — no `postcss.config.js` needed
- Single import in `src/index.css`: `@import "tailwindcss";`
- Theme customization uses CSS-first `@theme {}` blocks in `src/index.css` (not a JS config file)

### shadcn/ui v4
- Initialized with **Nova preset** (Geist font, neutral palette, lucide icons) and **Radix** component base
- CSS variables use `oklch()` color space, defined in `src/index.css`
- Foundational components installed: `button`, `card`, `dialog`, `input`, `label`, `select`, `tabs`, `badge`
- Note: the `form` component does not exist in the v4 registry — use `react-hook-form` directly with `input`/`label`/`select` when building forms in Phase 3

### React Router v7
- `createBrowserRouter` + `RouterProvider` pattern in `src/lib/router.tsx`
- Stub routes in place: `/` (Dashboard), `/library`, `/login`, `*` (404)
- Real page components replace the stubs in Phase 3

### Supabase Client
- `@supabase/supabase-js` installed
- Client singleton in `src/lib/supabase.ts`
- Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment
- **Important:** Vite only exposes `VITE_`-prefixed variables via `import.meta.env` — `process.env` does not work
- `.env` holds real credentials (gitignored); `.env.example` is the committed template

### Domain Types
All TypeScript types derived from the schema in `CLAUDE.md` are defined upfront in `src/types/index.ts`:
- Union types: `BookStatus`, `BookLanguage`, `BookBelongsTo`, `BookFormat`
- Interfaces: `Book`, `Series`, `ReadingLog`

### Directory Structure
```
src/
  components/
    ui/          ← shadcn components
    index.ts     ← barrel (empty, populated in Phase 3)
  pages/
    index.ts     ← barrel (empty, populated in Phase 3)
  hooks/
    index.ts     ← barrel (empty, populated in Phase 3)
  context/
    index.ts     ← barrel (empty, populated in Phase 2)
  types/
    index.ts     ← all domain types
  lib/
    utils.ts     ← shadcn cn() helper
    supabase.ts  ← Supabase client singleton
    router.tsx   ← React Router v7 route definitions
    index.ts     ← barrel
  main.tsx
  App.tsx
  index.css      ← Tailwind + shadcn CSS variables
  vite-env.d.ts
```

## Key files

| File | Purpose |
|---|---|
| `vite.config.ts` | Tailwind v4 plugin + `@/` path alias |
| `tsconfig.app.json` | App TypeScript config with strict mode and `@/` paths |
| `src/index.css` | Tailwind import + shadcn theme (CSS variables, dark mode) |
| `src/lib/supabase.ts` | Supabase client — fill `.env` before Phase 2 |
| `src/lib/router.tsx` | Route skeleton — stubs replaced by real pages in Phase 3 |
| `src/types/index.ts` | Domain types for the entire app |
| `.env.example` | Template for required environment variables |
| `.gitignore` | Excludes `node_modules/`, `dist/`, `.env` |

## Before starting Phase 2

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy **Project URL** and **anon key** from Project Settings → API
3. Add them to `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
