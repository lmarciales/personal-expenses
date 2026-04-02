import { getProjectedBalance } from "@/lib/projectedBalance";
import { supabase } from "@/supabase/client";

export interface CdtAccount {
  id: string;
  name: string;
  balance: number;
  interest_rate: number | null;
  interest_reference_balance: number | null;
  interest_reference_date: string | null;
  maturity_date: string | null;
  on_maturity: string | null;
  linked_account_id: string | null;
  type: string;
}

export interface MaturityResult {
  type: "transfer_back" | "auto_renew";
  cdtName: string;
  amount?: number;
  linkedAccountName?: string;
  newMaturityDate?: string;
}

/**
 * Processes all matured CDTs for the current user.
 * Returns an array of results describing what happened, for toast notifications.
 */
export async function processMaturedCdts(
  accounts: CdtAccount[],
  userId: string,
): Promise<MaturityResult[]> {
  const today = new Date().toISOString().split("T")[0];
  const results: MaturityResult[] = [];

  const maturedCdts = accounts.filter(
    (a) => a.type === "CDT" && a.maturity_date != null && a.maturity_date <= today,
  );

  for (const cdt of maturedCdts) {
    const projectedBalance = getProjectedBalance(cdt);

    if (cdt.on_maturity === "transfer_back" && cdt.linked_account_id) {
      const linkedAccount = accounts.find((a) => a.id === cdt.linked_account_id);

      // Create transfer transaction from CDT (expense on CDT account)
      const { error: txError } = await supabase.rpc("add_transaction_with_splits", {
        p_user_id: userId,
        p_account_id: cdt.id,
        p_date: today,
        p_total_amount: projectedBalance,
        p_payee: `CDT Maturity - ${cdt.name}`,
        p_notes: "Transferencia automática por vencimiento de CDT",
        p_type: "transfer",
        p_splits: JSON.stringify([]),
        p_category_ids: [],
      });

      if (txError) {
        console.error(`Failed to process CDT maturity transfer for ${cdt.name}:`, txError);
        continue;
      }

      // Add income to linked account
      const { error: incError } = await supabase.rpc("add_transaction_with_splits", {
        p_user_id: userId,
        p_account_id: cdt.linked_account_id,
        p_date: today,
        p_total_amount: projectedBalance,
        p_payee: `CDT Maturity - ${cdt.name}`,
        p_notes: "Ingreso automático por vencimiento de CDT",
        p_type: "income",
        p_splits: JSON.stringify([]),
        p_category_ids: [],
      });

      if (incError) {
        console.error(`Failed to add CDT maturity income for ${cdt.name}:`, incError);
        continue;
      }

      results.push({
        type: "transfer_back",
        cdtName: cdt.name,
        amount: Math.round(projectedBalance),
        linkedAccountName: linkedAccount?.name ?? "cuenta vinculada",
      });
    } else if (cdt.on_maturity === "auto_renew") {
      // Calculate original term duration
      const refDate = cdt.interest_reference_date
        ? new Date(cdt.interest_reference_date)
        : new Date(cdt.maturity_date!);
      const matDate = new Date(cdt.maturity_date!);
      const termMs = matDate.getTime() - refDate.getTime();
      const termDays = Math.max(30, Math.round(termMs / (1000 * 60 * 60 * 24)));

      // New maturity = old maturity + term
      const newMaturity = new Date(matDate.getTime() + termDays * 24 * 60 * 60 * 1000);
      const newMaturityStr = newMaturity.toISOString().split("T")[0];

      // Update CDT: lock in interest as new principal, reset reference, extend maturity
      const { error } = await supabase
        .from("accounts")
        .update({
          balance: projectedBalance,
          interest_reference_balance: projectedBalance,
          interest_reference_date: cdt.maturity_date,
          maturity_date: newMaturityStr,
        })
        .eq("id", cdt.id)
        .eq("user_id", userId);

      if (error) {
        console.error(`Failed to auto-renew CDT ${cdt.name}:`, error);
        continue;
      }

      results.push({
        type: "auto_renew",
        cdtName: cdt.name,
        newMaturityDate: newMaturityStr,
      });
    }
  }

  return results;
}
