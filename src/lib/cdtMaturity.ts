import { formatDateString, parseLocalDate } from "@/lib/dates";
import type { AccountWithStats } from "@/hooks/useAccountsData";
import { supabase } from "@/supabase/client";

interface RedeemCdtParams {
  cdtId: string;
  userId: string;
  actualAmount: number;
  linkedAccountId: string;
  payee: string;
  note: string;
}

interface RenewCdtParams {
  cdtId: string;
  userId: string;
  newPrincipal: number;
  originalMaturityDate: string;
  originalRefDate: string | null;
}

/** Check whether an account is a matured (but not archived) CDT. */
export function isCdtMatured(account: AccountWithStats): boolean {
  const today = formatDateString(new Date());
  return account.type === "CDT" && account.maturity_date != null && account.maturity_date <= today && !account.is_archived;
}

/**
 * Redeems a matured CDT: creates transfer + income transactions,
 * then archives the CDT account.
 */
export async function redeemCdt(params: RedeemCdtParams): Promise<void> {
  const { cdtId, userId, actualAmount, linkedAccountId, payee, note } = params;
  const today = formatDateString(new Date());

  const [txResult, incResult] = await Promise.all([
    supabase.rpc("add_transaction_with_splits", {
      p_user_id: userId,
      p_account_id: cdtId,
      p_date: today,
      p_total_amount: actualAmount,
      p_payee: payee,
      p_notes: note,
      p_type: "transfer",
      p_splits: JSON.stringify([]),
      p_category_ids: [],
    }),
    supabase.rpc("add_transaction_with_splits", {
      p_user_id: userId,
      p_account_id: linkedAccountId,
      p_date: today,
      p_total_amount: actualAmount,
      p_payee: payee,
      p_notes: note,
      p_type: "income",
      p_splits: JSON.stringify([]),
      p_category_ids: [],
    }),
  ]);

  if (txResult.error) throw txResult.error;
  if (incResult.error) throw incResult.error;

  const { error: archiveError } = await supabase
    .from("accounts")
    .update({ is_archived: true, balance: 0 })
    .eq("id", cdtId)
    .eq("user_id", userId);

  if (archiveError) throw archiveError;
}

/**
 * Renews a matured CDT: updates balance to new principal,
 * resets reference, and extends maturity by the original term.
 * Returns the new maturity date string.
 */
export async function renewCdt(params: RenewCdtParams): Promise<string> {
  const { cdtId, userId, newPrincipal, originalMaturityDate, originalRefDate } = params;

  // Calculate original term duration
  // originalRefDate is a timestamptz (full timestamp), originalMaturityDate is date-only
  const refDate = originalRefDate ? new Date(originalRefDate) : parseLocalDate(originalMaturityDate);
  const matDate = parseLocalDate(originalMaturityDate);
  const termMs = matDate.getTime() - refDate.getTime();
  const termDays = Math.max(30, Math.round(termMs / (1000 * 60 * 60 * 24)));

  // New maturity = old maturity + term
  const newMaturity = new Date(matDate.getTime() + termDays * 24 * 60 * 60 * 1000);
  const newMaturityStr = formatDateString(newMaturity);

  const { error } = await supabase
    .from("accounts")
    .update({
      balance: newPrincipal,
      interest_reference_balance: newPrincipal,
      interest_reference_date: originalMaturityDate,
      maturity_date: newMaturityStr,
    })
    .eq("id", cdtId)
    .eq("user_id", userId);

  if (error) throw error;

  return newMaturityStr;
}
