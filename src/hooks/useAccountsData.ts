import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

export interface AccountWithStats {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  created_at: string;
  transactionCount: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface AccountFilters {
  search: string;
  types: string[];
  sortBy: "name" | "balance" | "type" | "created_at";
  sortDir: "asc" | "desc";
}

export interface AccountType {
  name: string;
  color: string;
}

interface AccountsDataState {
  accounts: AccountWithStats[];
  accountTypes: AccountType[];
  isLoading: boolean;
  error: string | null;
  totalBalance: number;
  countByType: Record<string, number>;
}

const FALLBACK_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-blue-600 text-white",
  "bg-purple-600 text-white",
  "bg-cyan-600 text-white",
];

export function useAccountsData(filters: AccountFilters) {
  const [data, setData] = useState<AccountsDataState>({
    accounts: [],
    accountTypes: [],
    isLoading: true,
    error: null,
    totalBalance: 0,
    countByType: {},
  });

  const fetchData = useCallback(async () => {
    setData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      // Fetch account types (source of truth)
      const { data: accountTypesData, error: typesError } = await supabase
        .from("account_types")
        .select("name, color")
        .order("name");

      if (typesError) throw typesError;

      // Fetch all accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", userId);

      if (accountsError) throw accountsError;

      // Fetch transaction stats per account
      const { data: transactionsData, error: txError } = await supabase
        .from("transactions")
        .select("account_id, type, total_amount")
        .eq("user_id", userId);

      if (txError) throw txError;

      // Aggregate transaction stats by account_id
      const statsMap = new Map<string, { count: number; income: number; expenses: number }>();
      for (const txn of transactionsData || []) {
        const existing = statsMap.get(txn.account_id) || { count: 0, income: 0, expenses: 0 };
        existing.count += 1;
        if (txn.type === "income") {
          existing.income += Math.abs(txn.total_amount);
        } else {
          existing.expenses += Math.abs(txn.total_amount);
        }
        statsMap.set(txn.account_id, existing);
      }

      // Map accounts with stats
      const accounts: AccountWithStats[] = (accountsData || []).map((acc, idx) => {
        const stats = statsMap.get(acc.id) || { count: 0, income: 0, expenses: 0 };
        return {
          id: acc.id,
          name: acc.name,
          type: acc.type,
          balance: acc.balance,
          color: acc.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
          created_at: acc.created_at,
          transactionCount: stats.count,
          totalIncome: stats.income,
          totalExpenses: stats.expenses,
        };
      });

      // Apply client-side filtering
      let filtered = accounts;

      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter((a) => a.name.toLowerCase().includes(q));
      }

      if (filters.types.length > 0) {
        filtered = filtered.filter((a) => filters.types.includes(a.type));
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let cmp = 0;
        switch (filters.sortBy) {
          case "name":
            cmp = a.name.localeCompare(b.name);
            break;
          case "balance":
            cmp = a.balance - b.balance;
            break;
          case "type":
            cmp = a.type.localeCompare(b.type);
            break;
          case "created_at":
            cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
        }
        return filters.sortDir === "desc" ? -cmp : cmp;
      });

      // Compute aggregates from ALL accounts (unfiltered)
      const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
      const countByType: Record<string, number> = {};
      for (const a of accounts) {
        countByType[a.type] = (countByType[a.type] || 0) + 1;
      }

      setData({
        accounts: filtered,
        accountTypes: (accountTypesData || []) as AccountType[],
        isLoading: false,
        error: null,
        totalBalance,
        countByType,
      });
    } catch (err: any) {
      setData((prev) => ({ ...prev, isLoading: false, error: err.message }));
    }
  }, [filters.search, filters.types, filters.sortBy, filters.sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}
