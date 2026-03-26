# Personal Expenses App

## Tech Stack
- Vite + React + TypeScript
- Supabase (auth + database)
- Tailwind CSS + Radix UI (shadcn/ui components in `src/components/ui/`)
- React Router DOM (client routing with protected routes)
- React Hook Form + Zod (form validation)
- Recharts (analytics charts)
- Biome (linter + formatter)
- UI language: Spanish

## Commands
- `pnpm dev` — Start dev server (port 5173)
- `pnpm build` — TypeScript check + Vite build
- `pnpm lint` — Lint with Biome
- `pnpm format` — Auto-format with Biome
- `pnpm check` — Combined lint + format

## Architecture
- `src/pages/` — Route pages (Login, Dashboard, Accounts, Analytics, Debts, Transactions, Profile)
- `src/components/` — Feature-based components + `ui/` for shared shadcn components
- `src/hooks/` — Data hooks (`useDashboardData`, `useAccountsData`, etc.) using Supabase client
- `src/store/` — Context providers (AuthContext, SidebarContext)
- `src/supabase/` — Supabase client, auth helpers, generated `database.types.ts`
- `supabase/migrations/` — SQL migration files

## Key Patterns
- Auth: `AuthProvider` in `src/store/authContext.tsx` wraps app; `ProtectedRoute` guards authenticated pages
- Data: Custom hooks query Supabase with `eq("user_id", userId)` for RLS compliance
- Forms: React Hook Form + Zod schemas; Spanish validation messages

## Testing with Preview Browser
When using the preview browser to test the app:
1. Read test credentials from `.env.test.local` (format: `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`)
2. The app opens to a login page at `/` — fill in the email and password fields and submit
3. On successful login, the app redirects to `/dashboard`

**Important:** `.env.test.local` is gitignored. Each developer must create their own copy locally.

## Automation Setup

### Hooks (`.claude/settings.json`)
- **PreToolUse**: Blocks edits to `.env*` files (credential protection)
- **PostToolUse**: Auto-runs Biome check on edited files (formatting + linting)
- **PostToolUse**: Auto-runs `tsc --noEmit` on TypeScript file edits (type checking)

### Subagents (`.claude/agents/`)
- **security-reviewer**: Reviews code for Supabase RLS gaps, auth issues, input validation, and exposed credentials

### Skills (`.claude/skills/`)
- **create-migration**: Invoke with `/create-migration` to scaffold Supabase SQL migration files and regenerate TypeScript types
