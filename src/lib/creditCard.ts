export interface CreditCardShape {
  type: string;
  balance: number;
  credit_limit: number | null;
}

/**
 * Treat an account as a credit card if it has the canonical "Credit Card"
 * type OR carries a non-null credit_limit — the latter is a belt-and-
 * suspenders check for user-renamed types.
 */
export function isCreditCard(account: { type: string; credit_limit?: number | null }): boolean {
  return account.type === "Credit Card" || (account.credit_limit != null && account.credit_limit > 0);
}

/**
 * For a credit card, `balance` stores available credit. Current debt is
 * `credit_limit - balance`, clamped at zero for safety.
 */
export function getCreditCardDebt(account: CreditCardShape): number {
  if (!isCreditCard(account) || account.credit_limit == null) return 0;
  return Math.max(0, account.credit_limit - account.balance);
}
