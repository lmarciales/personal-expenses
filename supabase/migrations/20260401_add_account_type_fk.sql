-- Seed legacy account types that exist in accounts but not in account_types,
-- then add a FK so accounts.type is always referentially valid.

-- 1. Seed any missing built-in types (idempotent)
INSERT INTO account_types (name, color)
VALUES
  ('Checking', '#64748b'),
  ('Savings',  '#22c55e'),
  ('Cash',     '#f59e0b'),
  ('Other',    '#94a3b8')
ON CONFLICT (name) DO NOTHING;

-- 2. Add FK (accounts.type → account_types.name)
ALTER TABLE accounts
  ADD CONSTRAINT accounts_type_fkey
  FOREIGN KEY (type) REFERENCES account_types (name)
  ON UPDATE CASCADE;
