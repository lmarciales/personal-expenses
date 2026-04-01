-- Add auth.uid() guard and set search_path to settle_debts and settle_receivables.
-- These SECURITY DEFINER functions previously accepted any p_user_id without
-- verifying the caller, allowing a user to forge another user's ID.

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
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  SELECT name INTO v_target_name FROM accounts
  WHERE id = p_target_account_id AND user_id = p_user_id;

  UPDATE transaction_splits SET status = 'Settled'
  WHERE id = ANY(p_split_ids) AND user_id = p_user_id;

  UPDATE accounts SET balance = balance - p_payment_amount
  WHERE id = p_target_account_id AND user_id = p_user_id;

  IF p_source_account_id IS NOT NULL THEN
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

CREATE OR REPLACE FUNCTION settle_receivables(
  p_user_id uuid,
  p_split_ids uuid[],
  p_received_amount numeric,
  p_person_name text,
  p_receiving_account_id uuid DEFAULT NULL,
  p_notes text DEFAULT ''
) RETURNS text AS $$
DECLARE
  v_transaction_id uuid;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  UPDATE transaction_splits SET status = 'Settled'
  WHERE id = ANY(p_split_ids) AND user_id = p_user_id;

  IF p_receiving_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + p_received_amount
    WHERE id = p_receiving_account_id AND user_id = p_user_id;

    INSERT INTO transactions (user_id, account_id, date, total_amount, payee, notes, type)
    VALUES (p_user_id, p_receiving_account_id, current_date, p_received_amount,
            'Debt Repayment - ' || p_person_name,
            COALESCE(NULLIF(p_notes, ''), 'Automatic entry from settle_receivables'), 'income')
    RETURNING id INTO v_transaction_id;

    INSERT INTO transaction_splits (transaction_id, user_id, amount, assigned_to, status)
    VALUES (v_transaction_id, p_user_id, p_received_amount, 'Me', 'Settled');

    RETURN v_transaction_id::text;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
