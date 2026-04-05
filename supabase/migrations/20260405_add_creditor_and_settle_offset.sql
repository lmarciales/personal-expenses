-- Add creditor column to transactions for external debts
-- and create settle_offset RPC for cross-direction settlement.

-- 1. Add creditor column (nullable, only meaningful when account_id IS NULL)
ALTER TABLE transactions ADD COLUMN creditor text;

-- Drop legacy overloads of add_transaction_with_splits to avoid PGRST203 ambiguity
DROP FUNCTION IF EXISTS add_transaction_with_splits(uuid, uuid, date, numeric, text, text, boolean, text, jsonb);
DROP FUNCTION IF EXISTS add_transaction_with_splits(uuid, uuid, date, numeric, text, text, boolean, text, jsonb, text);
DROP FUNCTION IF EXISTS add_transaction_with_splits(uuid, uuid, date, numeric, text, text, text, boolean, text, json, uuid[]);
DROP FUNCTION IF EXISTS add_transaction_with_splits(uuid, uuid, date, numeric, text, text, text, boolean, integer, text, json, uuid[]);

-- Drop legacy overloads of update_transaction_with_splits
DROP FUNCTION IF EXISTS update_transaction_with_splits(uuid, uuid, uuid, date, numeric, text, text, boolean, text, jsonb);
DROP FUNCTION IF EXISTS update_transaction_with_splits(uuid, uuid, uuid, date, numeric, text, text, boolean, text, jsonb, text);
DROP FUNCTION IF EXISTS update_transaction_with_splits(uuid, uuid, uuid, date, numeric, text, text, text, boolean, text, json, uuid[]);
DROP FUNCTION IF EXISTS update_transaction_with_splits(uuid, uuid, uuid, date, numeric, text, text, text, boolean, integer, text, json, uuid[]);

-- 2. Update add_transaction_with_splits to accept p_creditor
CREATE OR REPLACE FUNCTION add_transaction_with_splits(
  p_user_id uuid,
  p_account_id uuid DEFAULT NULL,
  p_date date DEFAULT current_date,
  p_total_amount numeric DEFAULT 0,
  p_payee text DEFAULT '',
  p_notes text DEFAULT '',
  p_type text DEFAULT 'expense',
  p_is_recurring boolean DEFAULT false,
  p_recurrence_value integer DEFAULT NULL,
  p_recurrence_unit text DEFAULT NULL,
  p_splits json DEFAULT '[]',
  p_category_ids uuid[] DEFAULT '{}',
  p_creditor text DEFAULT NULL
) RETURNS text AS $$
DECLARE
  v_transaction_id uuid;
  v_split json;
  v_cat_id uuid;
  v_splits_sum numeric;
  v_is_4x1000 boolean;
  v_tax_amount numeric;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(p_category_ids) AS cid
    WHERE NOT EXISTS (
      SELECT 1 FROM categories c WHERE c.id = cid AND c.user_id = p_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: one or more category_ids do not belong to the user';
  END IF;

  IF json_array_length(p_splits) > 0 THEN
    SELECT COALESCE(SUM((s->>'amount')::numeric), 0)
    INTO v_splits_sum
    FROM json_array_elements(p_splits) s;

    IF v_splits_sum != p_total_amount THEN
      RAISE EXCEPTION 'Split amounts (%) do not sum to total amount (%)', v_splits_sum, p_total_amount;
    END IF;

    IF EXISTS (
      SELECT 1 FROM json_array_elements(p_splits) s
      WHERE (s->>'amount')::numeric <= 0
    ) THEN
      RAISE EXCEPTION 'All split amounts must be positive';
    END IF;
  END IF;

  INSERT INTO transactions (user_id, account_id, date, total_amount, payee, notes, type, is_recurring, recurrence_value, recurrence_unit, creditor)
  VALUES (p_user_id, p_account_id, p_date, p_total_amount, p_payee, p_notes, p_type, p_is_recurring, p_recurrence_value, p_recurrence_unit, p_creditor)
  RETURNING id INTO v_transaction_id;

  IF p_account_id IS NOT NULL THEN
    IF p_type = 'income' THEN
      UPDATE accounts SET balance = balance + p_total_amount
      WHERE id = p_account_id AND user_id = p_user_id;
    ELSIF p_type IN ('expense', 'transfer') THEN
      UPDATE accounts SET balance = balance - p_total_amount
      WHERE id = p_account_id AND user_id = p_user_id;
    END IF;

    PERFORM _update_interest_reference(p_account_id, p_user_id);
  END IF;

  FOR v_split IN SELECT * FROM json_array_elements(p_splits) LOOP
    INSERT INTO transaction_splits (transaction_id, user_id, amount, assigned_to, status)
    VALUES (
      v_transaction_id,
      p_user_id,
      (v_split->>'amount')::numeric,
      v_split->>'assigned_to',
      v_split->>'status'
    );
  END LOOP;

  FOREACH v_cat_id IN ARRAY p_category_ids LOOP
    INSERT INTO transaction_categories (transaction_id, category_id)
    VALUES (v_transaction_id, v_cat_id);
  END LOOP;

  IF p_account_id IS NOT NULL AND p_type IN ('expense', 'transfer') THEN
    SELECT is_4x1000_subject INTO v_is_4x1000
    FROM accounts WHERE id = p_account_id AND user_id = p_user_id;

    IF v_is_4x1000 THEN
      v_tax_amount := ROUND(p_total_amount * 0.004, 2);

      INSERT INTO transactions (user_id, account_id, date, total_amount, payee, notes, type, related_transaction_id)
      VALUES (p_user_id, p_account_id, p_date, v_tax_amount, 'GMF 4x1000',
              'Impuesto 4x1000 automático', 'expense', v_transaction_id);

      UPDATE accounts SET balance = balance - v_tax_amount
      WHERE id = p_account_id AND user_id = p_user_id;

      PERFORM _update_interest_reference(p_account_id, p_user_id);
    END IF;
  END IF;

  RETURN v_transaction_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Update update_transaction_with_splits to accept p_creditor
CREATE OR REPLACE FUNCTION update_transaction_with_splits(
  p_transaction_id uuid,
  p_user_id uuid,
  p_account_id uuid DEFAULT NULL,
  p_date date DEFAULT current_date,
  p_total_amount numeric DEFAULT 0,
  p_payee text DEFAULT '',
  p_notes text DEFAULT '',
  p_type text DEFAULT 'expense',
  p_is_recurring boolean DEFAULT false,
  p_recurrence_value integer DEFAULT NULL,
  p_recurrence_unit text DEFAULT NULL,
  p_splits json DEFAULT '[]',
  p_category_ids uuid[] DEFAULT '{}',
  p_creditor text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_split json;
  v_cat_id uuid;
  v_old_amount numeric;
  v_old_type text;
  v_old_account_id uuid;
  v_splits_sum numeric;
  v_child RECORD;
  v_is_4x1000 boolean;
  v_tax_amount numeric;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(p_category_ids) AS cid
    WHERE NOT EXISTS (
      SELECT 1 FROM categories c WHERE c.id = cid AND c.user_id = p_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: one or more category_ids do not belong to the user';
  END IF;

  IF json_array_length(p_splits) > 0 THEN
    SELECT COALESCE(SUM((s->>'amount')::numeric), 0)
    INTO v_splits_sum
    FROM json_array_elements(p_splits) s;

    IF v_splits_sum != p_total_amount THEN
      RAISE EXCEPTION 'Split amounts (%) do not sum to total amount (%)', v_splits_sum, p_total_amount;
    END IF;

    IF EXISTS (
      SELECT 1 FROM json_array_elements(p_splits) s
      WHERE (s->>'amount')::numeric <= 0
    ) THEN
      RAISE EXCEPTION 'All split amounts must be positive';
    END IF;
  END IF;

  SELECT total_amount, type, account_id
  INTO v_old_amount, v_old_type, v_old_account_id
  FROM transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or unauthorized';
  END IF;

  FOR v_child IN
    SELECT id, total_amount, account_id FROM transactions
    WHERE related_transaction_id = p_transaction_id AND user_id = p_user_id
  LOOP
    UPDATE accounts SET balance = balance + v_child.total_amount
    WHERE id = v_child.account_id AND user_id = p_user_id;

    DELETE FROM transactions WHERE id = v_child.id AND user_id = p_user_id;
  END LOOP;

  IF v_old_account_id IS NOT NULL THEN
    IF v_old_type = 'income' THEN
      UPDATE accounts SET balance = balance - v_old_amount
      WHERE id = v_old_account_id AND user_id = p_user_id;
    ELSIF v_old_type IN ('expense', 'transfer') THEN
      UPDATE accounts SET balance = balance + v_old_amount
      WHERE id = v_old_account_id AND user_id = p_user_id;
    END IF;
  END IF;

  IF p_account_id IS NOT NULL THEN
    IF p_type = 'income' THEN
      UPDATE accounts SET balance = balance + p_total_amount
      WHERE id = p_account_id AND user_id = p_user_id;
    ELSIF p_type IN ('expense', 'transfer') THEN
      UPDATE accounts SET balance = balance - p_total_amount
      WHERE id = p_account_id AND user_id = p_user_id;
    END IF;
  END IF;

  UPDATE transactions SET
    account_id = p_account_id,
    date = p_date,
    total_amount = p_total_amount,
    payee = p_payee,
    notes = p_notes,
    type = p_type,
    is_recurring = p_is_recurring,
    recurrence_value = p_recurrence_value,
    recurrence_unit = p_recurrence_unit,
    creditor = p_creditor
  WHERE id = p_transaction_id AND user_id = p_user_id;

  DELETE FROM transaction_splits
  WHERE transaction_id = p_transaction_id AND user_id = p_user_id;

  FOR v_split IN SELECT * FROM json_array_elements(p_splits) LOOP
    INSERT INTO transaction_splits (transaction_id, user_id, amount, assigned_to, status)
    VALUES (
      p_transaction_id,
      p_user_id,
      (v_split->>'amount')::numeric,
      v_split->>'assigned_to',
      v_split->>'status'
    );
  END LOOP;

  DELETE FROM transaction_categories
  WHERE transaction_id = p_transaction_id
    AND transaction_id IN (SELECT id FROM transactions WHERE id = p_transaction_id AND user_id = p_user_id);

  FOREACH v_cat_id IN ARRAY p_category_ids LOOP
    INSERT INTO transaction_categories (transaction_id, category_id)
    VALUES (p_transaction_id, v_cat_id);
  END LOOP;

  IF p_account_id IS NOT NULL AND p_type IN ('expense', 'transfer') THEN
    SELECT is_4x1000_subject INTO v_is_4x1000
    FROM accounts WHERE id = p_account_id AND user_id = p_user_id;

    IF v_is_4x1000 THEN
      v_tax_amount := ROUND(p_total_amount * 0.004, 2);

      INSERT INTO transactions (user_id, account_id, date, total_amount, payee, notes, type, related_transaction_id)
      VALUES (p_user_id, p_account_id, p_date, v_tax_amount, 'GMF 4x1000',
              'Impuesto 4x1000 automático', 'expense', p_transaction_id);

      UPDATE accounts SET balance = balance - v_tax_amount
      WHERE id = p_account_id AND user_id = p_user_id;
    END IF;
  END IF;

  IF v_old_account_id IS NOT NULL THEN
    PERFORM _update_interest_reference(v_old_account_id, p_user_id);
  END IF;
  IF p_account_id IS NOT NULL AND p_account_id IS DISTINCT FROM v_old_account_id THEN
    PERFORM _update_interest_reference(p_account_id, p_user_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create settle_offset RPC for cross-direction settlement
CREATE OR REPLACE FUNCTION settle_offset(
  p_user_id uuid,
  p_my_debt_split_ids uuid[],
  p_receivable_split_ids uuid[],
  p_net_amount numeric DEFAULT 0,
  p_net_direction text DEFAULT 'none',
  p_account_id uuid DEFAULT NULL,
  p_person_name text DEFAULT '',
  p_notes text DEFAULT ''
) RETURNS text AS $$
DECLARE
  v_transaction_id uuid;
  v_my_debt_total numeric;
  v_receivable_total numeric;
  v_computed_net numeric;
  v_invalid_count integer;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  IF p_net_amount < 0 THEN
    RAISE EXCEPTION 'Invalid net amount: must be zero or positive';
  END IF;

  IF p_net_direction NOT IN ('i_owe', 'owed_to_me', 'none') THEN
    RAISE EXCEPTION 'Invalid net_direction: must be i_owe, owed_to_me, or none';
  END IF;

  -- Validate my debt splits: must be Pending Payment and belong to transactions with creditor = p_person_name
  IF array_length(p_my_debt_split_ids, 1) > 0 THEN
    SELECT count(*) INTO v_invalid_count
    FROM transaction_splits ts
    JOIN transactions t ON t.id = ts.transaction_id
    WHERE ts.id = ANY(p_my_debt_split_ids)
      AND ts.user_id = p_user_id
      AND (ts.status != 'Pending Payment' OR t.creditor IS DISTINCT FROM p_person_name);

    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'Invalid debt splits: % split(s) are not Pending Payment or do not belong to creditor %', v_invalid_count, p_person_name;
    END IF;
  END IF;

  -- Validate receivable splits: must be Pending Receival and assigned_to = p_person_name
  IF array_length(p_receivable_split_ids, 1) > 0 THEN
    SELECT count(*) INTO v_invalid_count
    FROM transaction_splits ts
    WHERE ts.id = ANY(p_receivable_split_ids)
      AND ts.user_id = p_user_id
      AND (ts.status != 'Pending Receival' OR ts.assigned_to != p_person_name);

    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'Invalid receivable splits: % split(s) are not Pending Receival or do not belong to person %', v_invalid_count, p_person_name;
    END IF;
  END IF;

  -- Server-side net amount computation from actual split totals
  SELECT COALESCE(SUM(ts.amount), 0) INTO v_my_debt_total
  FROM transaction_splits ts
  WHERE ts.id = ANY(p_my_debt_split_ids) AND ts.user_id = p_user_id;

  SELECT COALESCE(SUM(ts.amount), 0) INTO v_receivable_total
  FROM transaction_splits ts
  WHERE ts.id = ANY(p_receivable_split_ids) AND ts.user_id = p_user_id;

  v_computed_net := ABS(v_my_debt_total - v_receivable_total);

  -- Validate client-supplied net amount matches server computation (within rounding tolerance)
  IF p_net_amount > 0 AND ABS(p_net_amount - v_computed_net) > 0.01 THEN
    RAISE EXCEPTION 'Net amount mismatch: client sent %, server computed %', p_net_amount, v_computed_net;
  END IF;

  -- Mark all my debt splits as Settled
  IF array_length(p_my_debt_split_ids, 1) > 0 THEN
    UPDATE transaction_splits SET status = 'Settled'
    WHERE id = ANY(p_my_debt_split_ids) AND user_id = p_user_id;
  END IF;

  -- Mark all receivable splits as Settled
  IF array_length(p_receivable_split_ids, 1) > 0 THEN
    UPDATE transaction_splits SET status = 'Settled'
    WHERE id = ANY(p_receivable_split_ids) AND user_id = p_user_id;
  END IF;

  -- If there's a net amount and an account, create the balancing transaction
  IF p_account_id IS NOT NULL AND v_computed_net > 0 THEN
    IF p_net_direction = 'i_owe' THEN
      -- I owe more: money goes out from my account
      UPDATE accounts SET balance = balance - v_computed_net
      WHERE id = p_account_id AND user_id = p_user_id;

      INSERT INTO transactions (user_id, account_id, date, total_amount, payee, notes, type)
      VALUES (p_user_id, p_account_id, current_date, v_computed_net,
              'Offset Payment - ' || LEFT(p_person_name, 100),
              COALESCE(NULLIF(p_notes, ''), 'Automatic offset settlement'), 'expense')
      RETURNING id INTO v_transaction_id;

      INSERT INTO transaction_splits (transaction_id, user_id, amount, assigned_to, status)
      VALUES (v_transaction_id, p_user_id, v_computed_net, 'Me', 'Settled');

    ELSIF p_net_direction = 'owed_to_me' THEN
      -- They owe more: money comes into my account
      UPDATE accounts SET balance = balance + v_computed_net
      WHERE id = p_account_id AND user_id = p_user_id;

      INSERT INTO transactions (user_id, account_id, date, total_amount, payee, notes, type)
      VALUES (p_user_id, p_account_id, current_date, v_computed_net,
              'Offset Received - ' || LEFT(p_person_name, 100),
              COALESCE(NULLIF(p_notes, ''), 'Automatic offset settlement'), 'income')
      RETURNING id INTO v_transaction_id;

      INSERT INTO transaction_splits (transaction_id, user_id, amount, assigned_to, status)
      VALUES (v_transaction_id, p_user_id, v_computed_net, 'Me', 'Settled');
    END IF;

    -- Update interest reference if applicable
    PERFORM _update_interest_reference(p_account_id, p_user_id);

    RETURN v_transaction_id::text;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
