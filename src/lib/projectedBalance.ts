/**
 * Calculates projected balance including estimated compound interest.
 *
 * Uses the reference-point system:
 * - interest_reference_balance: last known real balance (after a transaction)
 * - interest_reference_date: when that reference was established
 * - interest_rate: annual rate as a percentage (e.g. 8.75 means 8.75%)
 *
 * Formula: reference_balance * (1 + daily_rate) ^ days_elapsed
 */
export function getProjectedBalance(account: {
  balance: number;
  interest_rate: number | null;
  interest_reference_balance: number | null;
  interest_reference_date: string | null;
}): number {
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
  const daysElapsed = Math.max(0, (now.getTime() - refDate.getTime()) / msPerDay);

  if (daysElapsed === 0) {
    return account.interest_reference_balance;
  }

  const dailyRate = account.interest_rate / 100 / 365;
  return account.interest_reference_balance * Math.pow(1 + dailyRate, daysElapsed);
}
