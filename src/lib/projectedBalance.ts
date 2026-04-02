/**
 * Calculates projected balance including estimated interest.
 *
 * Uses the reference-point system:
 * - interest_reference_balance: last known real balance (after a transaction)
 * - interest_reference_date: when that reference was established
 * - interest_rate: annual rate as a percentage (e.g. 8.75 means 8.75%)
 *
 * CDTs use simple interest with 4% retención en la fuente:
 *   gross = principal × rate × days / 365
 *   net   = gross × 0.96 (after 4% withholding tax)
 *   total = principal + net
 *
 * Other accounts use daily compound interest:
 *   total = principal × (1 + rate/365) ^ days
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
  const refDate = new Date(account.interest_reference_date);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.max(0, (now.getTime() - refDate.getTime()) / msPerDay);

  if (daysElapsed === 0) {
    return account.interest_reference_balance;
  }

  const principal = account.interest_reference_balance;
  const annualRate = account.interest_rate / 100;

  if (account.type === "CDT") {
    // Simple interest + 4% retención en la fuente
    const grossInterest = principal * annualRate * daysElapsed / 365;
    const netInterest = grossInterest * (1 - RETENCION_RATE);
    return principal + netInterest;
  }

  // Compound interest for savings and other accounts
  const dailyRate = annualRate / 365;
  return principal * Math.pow(1 + dailyRate, daysElapsed);
}
