import { supabase } from "@/supabase/client";
import { useState } from "react";

export function useDebtActions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settleDebts = async (
    splitIds: string[],
    paymentAmount: number,
    targetAccountId: string,
    sourceAccountId?: string,
    notes?: string,
  ): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const { data, error: rpcError } = await supabase.rpc("settle_debts", {
        p_user_id: userData.user.id,
        p_split_ids: splitIds,
        p_payment_amount: paymentAmount,
        p_target_account_id: targetAccountId,
        p_source_account_id: sourceAccountId || undefined,
        p_notes: notes || "",
      });

      if (rpcError) throw rpcError;
      return data as string | null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const settleReceivables = async (
    splitIds: string[],
    receivedAmount: number,
    personName: string,
    receivingAccountId?: string,
    notes?: string,
  ): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const { data, error: rpcError } = await supabase.rpc("settle_receivables", {
        p_user_id: userData.user.id,
        p_split_ids: splitIds,
        p_received_amount: receivedAmount,
        p_person_name: personName,
        p_receiving_account_id: receivingAccountId || undefined,
        p_notes: notes || "",
      });

      if (rpcError) throw rpcError;
      return data as string | null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const settleOffset = async (
    myDebtSplitIds: string[],
    receivableSplitIds: string[],
    netAmount: number,
    netDirection: "i_owe" | "owed_to_me" | "none",
    personName: string,
    accountId?: string,
    notes?: string,
  ): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const { data, error: rpcError } = await supabase.rpc("settle_offset", {
        p_user_id: userData.user.id,
        p_my_debt_split_ids: myDebtSplitIds,
        p_receivable_split_ids: receivableSplitIds,
        p_net_amount: netAmount,
        p_net_direction: netDirection,
        p_account_id: accountId || undefined,
        p_person_name: personName,
        p_notes: notes || "",
      });

      if (rpcError) throw rpcError;
      return data as string | null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { settleDebts, settleReceivables, settleOffset, isProcessing, error };
}
