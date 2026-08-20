# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Split — a minimal, installable expense-splitting PWA for a friend group. React 19 + Vite + Tailwind v4, backed by Supabase (Postgres + Auth), deployed to GitHub Pages via GitHub Actions.

## Commands

```bash
npm run dev      # start Vite dev server
npm run build    # tsc -b (typecheck) then vite build — this is what CI runs
npm run lint     # oxlint
npm run preview  # preview the production build
```

There is no test suite/runner configured in this repo. CI (`.github/workflows/ci.yml`) only runs `npm run build` on push/PR to `main`; it does not run `npm run lint`.

Requires a `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (copy from `.env.example`) to run or build against a real Supabase project.

## Deployment

`.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on every push to `main`. `vite.config.ts` hardcodes `base = '/split/'` for GitHub Pages' project-site path — change this if the app ever moves to a domain-root host (Vercel, Netlify, custom domain).

## Architecture

**Data layer**: Supabase is the source of truth. `supabase/schema.sql` defines the full schema (`profiles`, `groups`, `group_members`, `expenses`, `expense_splits`, `settlements`, `push_subscriptions`) plus RLS policies — apply it via the Supabase SQL Editor. `supabase/migration_*.sql` files are incremental changes layered on top of `schema.sql` (expense categories, group editing, push notifications, dashboard scaling) — when changing the schema, add a new migration file rather than editing `schema.sql` in place, and check `.env`/the target Supabase project before running any migration against it. There are no generated TypeScript types for the DB; row shapes are hand-declared as interfaces at the top of each feature's `hooks.ts` (e.g. `GroupSummary` in `src/features/groups/hooks.ts`), so a schema change means updating those interfaces by hand too.

**Feature/hooks pattern**: Each domain lives under `src/features/<domain>/hooks.ts` and exports TanStack Query hooks (`useGroups`, `useCreateGroup`, `useAddExpense`, etc.) that wrap direct `supabase.from(...)` calls — there is no separate API/service layer. Mutations invalidate the relevant query keys (`['groups']`, `['group', groupId]`, ...) in `onSuccess`. Follow this pattern for new domains rather than introducing a different data-fetching convention.

**Auth**: `src/features/auth/AuthProvider.tsx` wraps Supabase session/profile state in a `useAuth()` context, gating the whole app in `src/App.tsx` (`AppLayout`): unauthenticated users see `LoginPage`, authenticated users get `<Outlet />` + `BottomNav`. Auth currently uses Supabase email+password (`signInWithPassword`/`signUp`), not the passwordless OTP flow described in `README.md` — check `LoginPage.tsx` and `AuthProvider.tsx` directly rather than trusting the README on this point.

**Routing**: `src/router.tsx` defines all routes under `AppLayout`; `basename` is tied to `import.meta.env.BASE_URL` to match the Pages `base` path.

**Balances/money math**: `src/utils/balances.ts` computes net per-user balances from expenses + settlements and reduces them to a minimal set of payments (`simplifyDebts`, greedy debtor/creditor matching). `src/utils/money.ts` handles currency formatting and split arithmetic (equal/percentage), always rounding to paise/cents and pushing remainders onto the first share so splits sum exactly to the total. Any change to split or settlement logic should preserve that "sums exactly to total" invariant.

**PWA / service worker**: Built with `vite-plugin-pwa` in `injectManifest` mode; `src/sw.ts` is the actual service worker source (excluded from the app's `tsconfig.app.json`, so it's checked separately by the Vite plugin). Push notifications (`src/features/push/register.ts`) subscribe via a hardcoded VAPID public key and are delivered by the `notify-group` Supabase Edge Function (`supabase/functions/notify-group/index.ts`), which holds the matching private key.

**Dead code note**: `src/lib/localDb.ts` (a localStorage-backed data model) and `src/features/localUser.ts` are not imported anywhere else in `src/` — they appear to predate the Supabase backend and can likely be ignored or removed rather than extended.

## Styling

Tailwind v4 (CSS-first config, no `tailwind.config.js`) with a custom paper/ledger theme defined as CSS variables in `src/index.css`: `--color-ledger` (green) means "owed to you", `--color-receipt` (red) means "you owe" — reuse these tokens for any new balance-related UI rather than introducing new colors. Dark mode follows `prefers-color-scheme` by default but can be pinned via `data-theme="dark"|"light"` on `:root` (see `src/features/theme.tsx`); both a media-query block and an explicit `[data-theme]` block must be kept in sync when adding new color tokens.
