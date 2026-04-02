-- Phase 3: 4x1000 Tax Support
-- 1. Add related_transaction_id to link tax transactions to their parent
-- 2. Update add_transaction_with_splits to auto-create 4x1000 tax companion
-- 3. Update delete_transaction_with_balance to clean up tax companions
-- 4. Update update_transaction_with_splits to recalculate tax companions

-- 1. Column for linking tax transactions to their source
ALTER TABLE transactions ADD COLUMN related_transaction_id UUID DEFAULT NULL
  REFERENCES transactions(id) ON DELETE CASCADE;

-- 2. Redefine add_transaction_with_splits with 4x1000 auto-tax
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
  p_category_ids uuid[] DEFAULT '{}'
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

  INSERT INTO transactions (user_id, account_id, date, total_amount, payee, notes, type, is_recurring, recurrence_value, recurrence_unit)
  VALUES (p_user_id, p_account_id, p_date, p_total_amount, p_payee, p_notes, p_type, p_is_recurring, p_recurrence_value, p_recurrence_unit)
  RETURNING id INTO v_transaction_id;

  IF p_account_id IS NOT NULL THEN
    IF p_type = 'income' THEN
      UPDATE accounts SET balance = balance + p_total_amount
      WHERE id = p_account_id AND user_id = p_user_id;
    ELSIF p_type IN ('expense', 'transfer') THEN
      UPDATE accounts SET balance = balance - p_total_amount
      WHERE id = p_account_id AND user_id = p_user_id;
    END IF;
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

  -- 4x1000 tax: auto-create companion transaction
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
    END IF;
  END IF;

  RETURN v_transaction_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Redefine delete_transaction_with_balance with tax cleanup
CREATE OR REPLACE FUNCTION delete_transaction_with_balance(
  p_transaction_id uuid,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  v_amount numeric;
  v_type text;
  v_account_id uuid;
  v_child RECORD;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  SELECT total_amount, type, account_id
  INTO v_amount, v_type, v_account_id
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

  IF v_type = 'income' THEN
    UPDATE accounts SET balance = balance - v_amount
    WHERE id = v_account_id AND user_id = p_user_id;
  ELSIF v_type IN ('expense', 'transfer') THEN
    UPDATE accounts SET balance = balance + v_amount
    WHERE id = v_account_id AND user_id = p_user_id;
  END IF;

  DELETE FROM transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Redefine update_transaction_with_splits with tax recalculation
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
  p_category_ids uuid[] DEFAULT '{}'
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
    recurrence_unit = p_recurrence_unit
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
