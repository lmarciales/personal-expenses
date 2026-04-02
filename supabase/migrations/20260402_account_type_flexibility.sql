-- Phase 2: Account Type Flexibility
-- 1. Add user_id to account_types for custom per-user types
-- 2. Enable RLS on account_types
-- 3. Seed CDT system type
-- 4. Add financial columns to accounts for Phases 3-5

-- 1. user_id column (NULL = system type, non-NULL = user-created)
ALTER TABLE account_types ADD COLUMN user_id UUID DEFAULT NULL REFERENCES auth.users(id);

-- 2. RLS policies
ALTER TABLE account_types ENABLE ROW LEVEL SECURITY;

-- System types (user_id IS NULL) readable by all authenticated users
CREATE POLICY "Anyone can read system account types"
  ON account_types FOR SELECT
  USING (user_id IS NULL);

-- User types readable only by owner
CREATE POLICY "Users can read own account types"
  ON account_types FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own types
CREATE POLICY "Users can insert own account types"
  ON account_types FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own types
CREATE POLICY "Users can update own account types"
  ON account_types FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own types
CREATE POLICY "Users can delete own account types"
  ON account_types FOR DELETE
  USING (user_id = auth.uid());

-- 3. Seed CDT system type
INSERT INTO account_types (name, color)
VALUES ('CDT', '#f59e0b')
ON CONFLICT (name) DO NOTHING;

-- 4. Financial columns on accounts (all nullable, used depending on type)
ALTER TABLE accounts ADD COLUMN interest_rate NUMERIC DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN interest_reference_balance NUMERIC DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN interest_reference_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN is_4x1000_subject BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN maturity_date DATE DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN on_maturity TEXT DEFAULT NULL CHECK (on_maturity IN ('transfer_back', 'auto_renew'));
ALTER TABLE accounts ADD COLUMN linked_account_id UUID DEFAULT NULL REFERENCES accounts(id);
