-- Remove the hard-coded CHECK constraint on accounts.type.
-- The account_types table is the source of truth for valid account types;
-- the rigid enum-style constraint prevents saving accounts with types
-- defined in account_types (e.g. 'Debit Card', 'Wallet').

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'accounts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE accounts DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;
