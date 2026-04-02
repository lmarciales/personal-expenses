-- Fix settle_debts: target account balance should INCREASE when debts are
-- paid (restoring available credit), not decrease. Also add credit_limit
-- column for credit card utilization tracking.

-- 1. Add credit_limit column
ALTER TABLE accounts ADD COLUMN credit_limit NUMERIC DEFAULT NULL;

-- 2. Redefine settle_debts with corrected balance direction for target account
CREATE OR REPLACE FUNCTION settle_debts(
  p_user_id uuid,
  p_split_ids uuid[],
  p_payment_amount numeric,
  p_target_account_id uuid,
  p_source_account_id uuid DEFAULT NULL,
  p_notes text DEFAULT ''
) RETURNS text AS $$
DECLARE
  v_transaction_id uuid;
  v_target_name text;
  v_invalid_count integer;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  IF p_payment_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid payment amount: must be greater than zero';
  END IF;

  -- Verify all splits belong to transactions on the target account
  SELECT count(*) INTO v_invalid_count
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.id = ANY(p_split_ids)
    AND ts.user_id = p_user_id
    AND (t.account_id IS DISTINCT FROM p_target_account_id);

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Invalid split selection: % split(s) do not belong to the target account', v_invalid_count;
  END IF;

  SELECT name INTO v_target_name FROM accounts
  WHERE id = p_target_account_id AND user_id = p_user_id;

  UPDATE transaction_splits SET status = 'Settled'
  WHERE id = ANY(p_split_ids) AND user_id = p_user_id;

  -- FIX: target account receives payment, so balance INCREASES
  UPDATE accounts SET balance = balance + p_payment_amount
  WHERE id = p_target_account_id AND user_id = p_user_id;

  IF p_source_account_id IS NOT NULL THEN
    -- Source account pays out, so balance DECREASES
    UPDATE accounts SET balance = balance - p_payment_amount
    WHERE id = p_source_account_id AND user_id = p_user_id;

    INSERT INTO transactions (user_id, account_id, date, total_amount, payee, notes, type)
    VALUES (p_user_id, p_source_account_id, current_date, p_payment_amount,
            'Payment - ' || COALESCE(v_target_name, 'Credit Card'),
            COALESCE(NULLIF(p_notes, ''), 'Automatic payment from settle_debts'), 'transfer')
    RETURNING id INTO v_transaction_id;

    INSERT INTO transaction_splits (transaction_id, user_id, amount, assigned_to, status)
    VALUES (v_transaction_id, p_user_id, p_payment_amount, 'Me', 'Settled');

    RETURN v_transaction_id::text;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
