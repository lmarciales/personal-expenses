-- Recalculate credit card balances from transaction history.
-- For credit cards with a credit_limit set:
--   balance = credit_limit + SUM(income) - SUM(expenses + transfers)
-- This ignores historical settle_debts (which had the bug), effectively
-- resetting the card to what it should be based on transactions alone.
-- After this migration, the user should settle any outstanding debts again
-- using the now-fixed settle_debts function.

UPDATE accounts a
SET balance = COALESCE(a.credit_limit, 0) + COALESCE((
  SELECT SUM(
    CASE
      WHEN t.type = 'income' THEN t.total_amount
      WHEN t.type IN ('expense', 'transfer') THEN -t.total_amount
      ELSE 0
    END
  )
  FROM transactions t
  WHERE t.account_id = a.id
), 0)
WHERE a.type = 'Credit Card'
  AND a.credit_limit IS NOT NULL;
