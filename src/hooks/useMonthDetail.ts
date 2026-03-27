import { supabase } from "@/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface MonthDetailData {
  topTransactions: { id: string; payee: string; amount: number; type: string }[];
  totalExpenses: number;
  totalIncome: number;
  netFlow: number;
  isLoading: boolean;
}

export function useMonthDetail(year: number, month: number | null): MonthDetailData {
  const [data, setData] = useState<MonthDetailData>({
    topTransactions: [],
    totalExpenses: 0,
    totalIncome: 0,
    netFlow: 0,
    isLoading: false,
  });

  const fetchData = useCallback(async () => {
    if (month === null) {
      setData({ topTransactions: [], totalExpenses: 0, totalIncome: 0, netFlow: 0, isLoading: false });
      return;
    }

    setData((prev) => ({ ...prev, isLoading: true }));
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const { data: txns, error } = await supabase
        .from("transactions")
        .select("id, payee, total_amount, type")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .in("type", ["expense", "income"])
        .order("total_amount", { ascending: true });

      if (error) throw error;

      let totalExpenses = 0;
      let totalIncome = 0;

      for (const txn of txns || []) {
        const amount = Math.abs(txn.total_amount);
        if (txn.type === "expense") totalExpenses += amount;
        else if (txn.type === "income") totalIncome += amount;
      }

      // Top 5 by absolute amount
      const sorted = [...(txns || [])].sort((a, b) => Math.abs(b.total_amount) - Math.abs(a.total_amount));
      const topTransactions = sorted.slice(0, 5).map((txn) => ({
        id: txn.id,
        payee: txn.payee,
        amount: Math.abs(txn.total_amount),
        type: txn.type ?? "expense",
      }));

      setData({
        topTransactions,
        totalExpenses,
        totalIncome,
        netFlow: totalIncome - totalExpenses,
        isLoading: false,
      });
    } catch {
      setData((prev) => ({ ...prev, isLoading: false }));
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return data;
}
