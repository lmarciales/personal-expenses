export interface CreditCardShape {
  type: string;
  balance: number;
  credit_limit: number | null;
}

export interface ProjectedBalanceShape {
  balance: number;
  interest_rate: number | null;
  interest_reference_balance: number | null;
  interest_reference_date: string | null;
  type?: string;
}

export interface AccountSummaryShape extends CreditCardShape {
  interest_rate: number | null;
  interest_reference_balance: number | null;
  interest_reference_date: string | null;
  is_archived?: boolean | null;
}

export interface AccountSummary<T extends AccountSummaryShape> {
  activeAccounts: T[];
  liquidBalance: number;
  creditDebt: number;
  netWorth: number;
  totalBalance: number;
  countByType: Record<string, number>;
}

const RETENCION_RATE = 0.04;

/**
 * Treat an account as a credit card if it has the canonical "Credit Card"
 * type OR carries a non-null credit_limit as a safety net for renamed types.
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

/**
 * Calculates projected balance including estimated interest.
 *
 * Uses the reference-point system:
 * - interest_reference_balance: last known real balance (after a transaction)
 * - interest_reference_date: when that reference was established
 * - interest_rate: annual rate as a percentage (e.g. 8.75 means 8.75% EA)
 */
export function getProjectedBalance(account: ProjectedBalanceShape): number {
  if (
    account.interest_rate == null ||
    account.interest_reference_balance == null ||
    account.interest_reference_date == null
  ) {
    return account.balance;
  }

  const now = new Date();
  const refDate = new Date(account.interest_reference_date);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - refDate.getTime()) / msPerDay));

  if (daysElapsed === 0) {
    return account.interest_reference_balance;
  }

  const principal = account.interest_reference_balance;
  const ea = account.interest_rate / 100;

  if (account.type === "CDT") {
    const effectiveDailyRate = (1 + ea) ** (1 / 365) - 1;
    const netDailyRate = effectiveDailyRate * (1 - RETENCION_RATE);
    return principal * (1 + netDailyRate) ** Math.floor(daysElapsed);
  }

  const dailyRate = ea / 365;
  return principal * (1 + dailyRate) ** daysElapsed;
}

export function getAccountSummary<T extends AccountSummaryShape>(accounts: T[]): AccountSummary<T> {
  const activeAccounts = accounts.filter((account) => !account.is_archived);
  let liquidBalance = 0;
  let creditDebt = 0;
  const countByType: Record<string, number> = {};

  for (const account of activeAccounts) {
    if (isCreditCard(account)) {
      creditDebt += getCreditCardDebt(account);
    } else {
      liquidBalance += getProjectedBalance(account);
    }
    countByType[account.type] = (countByType[account.type] || 0) + 1;
  }

  return {
    activeAccounts,
    liquidBalance,
    creditDebt,
    netWorth: liquidBalance - creditDebt,
    totalBalance: liquidBalance,
    countByType,
  };
}
