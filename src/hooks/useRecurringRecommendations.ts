import { supabase } from "@/supabase/client";
import { differenceInDays, differenceInMonths, differenceInWeeks, differenceInYears, parseISO } from "date-fns";
import { useCallback, useEffect, useState } from "react";

export interface RecurringRecommendation {
  payee: string;
  total_amount: number;
  recurrence_value: number;
  recurrence_unit: "Days" | "Weeks" | "Months" | "Years";
  last_paid_date: string;
  account_id: string;
  lastSplits: { amount: number; assigned_to: string; status: string }[];
}

export function useRecurringRecommendations() {
  const [recommendations, setRecommendations] = useState<RecurringRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      // Fetch all transactions marked as recurring, with their splits
      const { data: recurringTxns, error: txnsError } = await supabase
        .from("transactions")
        .select(
          "payee, total_amount, recurrence_value, recurrence_unit, date, account_id, transaction_splits(amount, assigned_to, status)",
        )
        .eq("user_id", userId)
        .eq("is_recurring", true)
        .order("date", { ascending: false });

      if (txnsError) throw txnsError;

      if (!recurringTxns || recurringTxns.length === 0) {
        setRecommendations([]);
        setIsLoading(false);
        return;
      }

      const now = new Date();

      // Group by payee to find the latest payment for each recurring bill
      const latestPayments = new Map<string, (typeof recurringTxns)[0]>();

      for (const txn of recurringTxns) {
        if (!latestPayments.has(txn.payee)) {
          latestPayments.set(txn.payee, txn);
        }
      }

      const suggestions: RecurringRecommendation[] = [];

      for (const txn of latestPayments.values()) {
        const lastPaidDate = parseISO(txn.date);
        const value = txn.recurrence_value ?? 1;
        const unit = txn.recurrence_unit ?? "Months";
        let needsRecommendation = false;

        if (unit === "Days") {
          needsRecommendation = differenceInDays(now, lastPaidDate) >= value;
        } else if (unit === "Weeks") {
          needsRecommendation = differenceInWeeks(now, lastPaidDate) >= value;
        } else if (unit === "Months") {
          needsRecommendation = differenceInMonths(now, lastPaidDate) >= value;
        } else if (unit === "Years") {
          needsRecommendation =
            differenceInYears(now, lastPaidDate) >= value && lastPaidDate.getMonth() === now.getMonth();
        }

        if (needsRecommendation) {
          suggestions.push({
            payee: txn.payee,
            total_amount: txn.total_amount,
            recurrence_value: value,
            recurrence_unit: unit as any,
            last_paid_date: txn.date,
            account_id: txn.account_id,
            lastSplits: (txn.transaction_splits || []).map((s) => ({
              amount: Math.abs(s.amount),
              assigned_to: s.assigned_to,
              status: s.status,
            })),
          });
        }
      }

      setRecommendations(suggestions);
    } catch (err) {
      console.error("Failed to fetch recurring recommendations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, isLoading, refetch: fetchRecommendations };
}
