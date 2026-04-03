/**
 * Calculates projected balance including estimated interest.
 *
 * Uses the reference-point system:
 * - interest_reference_balance: last known real balance (after a transaction)
 * - interest_reference_date: when that reference was established
 * - interest_rate: annual rate as a percentage (e.g. 8.75 means 8.75% EA)
 *
 * CDTs use daily compounding with retención deducted each day:
 *   effective_daily_rate = (1 + EA)^(1/365) - 1
 *   net_daily_rate = effective_daily_rate × (1 - 0.04)
 *   total = principal × (1 + net_daily_rate) ^ days
 *
 * Other accounts use daily compound interest (no retención):
 *   total = principal × (1 + daily_rate) ^ days
 */

const RETENCION_RATE = 0.04;

export function getProjectedBalance(account: {
  balance: number;
  interest_rate: number | null;
  interest_reference_balance: number | null;
  interest_reference_date: string | null;
  type?: string;
}): number {
  if (
    account.interest_rate == null ||
    account.interest_reference_balance == null ||
    account.interest_reference_date == null
  ) {
    return account.balance;
  }

  const now = new Date();
  const [y, m, d] = account.interest_reference_date.split("-").map(Number);
  const refDate = new Date(y, m - 1, d);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.max(0, (now.getTime() - refDate.getTime()) / msPerDay);

  if (daysElapsed === 0) {
    return account.interest_reference_balance;
  }

  const principal = account.interest_reference_balance;
  const ea = account.interest_rate / 100;

  if (account.type === "CDT") {
    // Effective daily rate from EA, with retención deducted daily
    const effectiveDailyRate = Math.pow(1 + ea, 1 / 365) - 1;
    const netDailyRate = effectiveDailyRate * (1 - RETENCION_RATE);
    return principal * Math.pow(1 + netDailyRate, Math.floor(daysElapsed));
  }

  // Compound interest for savings and other accounts
  const dailyRate = ea / 365;
  return principal * Math.pow(1 + dailyRate, daysElapsed);
}
