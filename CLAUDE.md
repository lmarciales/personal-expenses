# Personal Expenses App

## Tech Stack
- Vite + React + TypeScript
- Supabase (auth + database)
- UI language: Spanish

## Testing with Preview Browser
When using the preview browser to test the app:
1. Read test credentials from `.env.test.local` (format: `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`)
2. The app opens to a login page at `/` — fill in the email and password fields and submit
3. On successful login, the app redirects to `/dashboard`

**Important:** `.env.test.local` is gitignored. Each developer must create their own copy locally.
