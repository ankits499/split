# Split

A minimal, installable expense-splitting PWA for a friend group. React + Vite + Tailwind, backed by Supabase, deployable to Cloudflare Pages for ~₹0/month.

## Features (v1)

- Passwordless email sign-in (Supabase OTP — no passwords)
- Groups with members added by email
- Add expenses split equally, by exact amount, or by percentage
- Per-group balances with automatic debt simplification (minimum number of payments)
- Settle up to record a payment
- Installable to the home screen on iOS/Android (PWA)

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. Open **SQL Editor** → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → run it. This creates all tables, RLS policies, and the new-user trigger.
3. Under **Authentication → Providers → Email**, make sure Email OTP is enabled (it is by default). Under **Authentication → Email Templates**, the "Magic Link" template's `{{ .Token }}` is the 6-digit code used by this app.
4. Copy your **Project URL** and **anon public key** from **Project Settings → API**.

### 2. Configure the app

```bash
cp .env.example .env
# then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy (Cloudflare Pages, free tier)

1. Push this repo to GitHub.
2. In Cloudflare Pages, create a project from the repo.
3. Build command: `npm run build`, output directory: `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Pages project settings.

## Notes on cost

- Supabase free tier: 500MB database, 50k monthly active users — plenty for a friend group.
- Cloudflare Pages free tier: unlimited requests/bandwidth for static sites.
- Total cost: **$0/month**, unless you add a custom domain (optional, ~$10-15/year).

## Project structure

```
src/
  components/       shared UI (BottomNav, GroupCard, ExpenseSheet, InstallPrompt)
  features/
    auth/           AuthProvider (Supabase session/profile) + LoginPage
    groups/         group queries/mutations
    expenses/       expense queries/mutations
    settlements/    settlement queries/mutations
  pages/            route-level screens
  utils/            money.ts (splitting math), balances.ts (net balances + debt simplification)
  lib/              supabase client, react-query client
supabase/
  schema.sql        full DB schema + RLS policies (source of truth)
```

## Deliberate v1 simplifications

- **Auth**: passwordless email OTP via Supabase's built-in auth, instead of a custom access-code system — same "no password" UX with zero extra backend code (no Edge Function to write/host).
- **Adding members**: by email, looked up directly against `profiles` (RLS lets any signed-in user read names/emails — fine for a small trusted friend group). A friend must sign in to Split once before they can be added to a group.
- **No multi-currency, recurring expenses, or receipt photos** — add later if needed.
