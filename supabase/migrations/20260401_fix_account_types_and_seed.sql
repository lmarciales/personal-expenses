-- Fix account types: drop stale CHECK constraint, seed correct types,
-- migrate existing accounts, and remove obsolete type rows.

-- 1. Drop the CHECK constraint by name (previous migration searched
--    pg_get_constraintdef which returns the definition text, not the name).
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'accounts'::regclass
    AND contype = 'c'
    AND conname LIKE '%type%'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE accounts DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

-- 2. Insert the correct account types (idempotent).
INSERT INTO account_types (name, color)
VALUES
  ('Credit Card', '#6366f1'),
  ('Debit Card',  '#3b82f6'),
  ('Wallet',      '#10b981')
ON CONFLICT (name) DO NOTHING;

-- 3. Migrate existing accounts that reference old types.
UPDATE accounts SET type = 'Debit Card'  WHERE type IN ('Checking', 'Savings');
UPDATE accounts SET type = 'Wallet'      WHERE type IN ('Cash', 'Other');

-- 4. Remove obsolete account type rows (no accounts reference them now).
DELETE FROM account_types WHERE name IN ('Checking', 'Savings', 'Cash', 'Other');
