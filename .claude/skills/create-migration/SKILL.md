---
name: create-migration
description: Scaffold a new Supabase SQL migration file and regenerate TypeScript types. Use when creating database schema changes, adding tables, columns, or modifying RLS policies.
disable-model-invocation: true
---

# Create Supabase Migration

When the user invokes `/create-migration`, follow these steps:

## 1. Gather Requirements
Ask the user what database change they need (new table, add column, modify RLS policy, etc.) if not already specified.

## 2. Create Migration File
Generate a timestamped SQL migration file:
- Path: `supabase/migrations/<YYYYMMDDHHMMSS>_<descriptive_name>.sql`
- Use the current UTC timestamp for the prefix
- Include clear SQL comments explaining the migration
- Always include `IF NOT EXISTS` / `IF EXISTS` guards where appropriate
- For new tables, always enable RLS and create appropriate policies

## 3. Regenerate TypeScript Types
After writing the migration SQL, remind the user to:
1. Apply the migration: `npx supabase db push` (or apply via Supabase dashboard)
2. Regenerate types: `npx supabase gen types typescript --project-id rgawlpqxqypntrknutlc > src/supabase/database.types.ts`

## 4. Verify
- Ensure the migration SQL is syntactically valid
- Confirm RLS policies are included for any new tables
- Remind the user to commit both the migration file and updated `database.types.ts` together
