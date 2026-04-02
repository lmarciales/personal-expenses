import { supabase } from "@/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface TransactionWithSplits {
  id: string;
  payee: string;
  total_amount: number;
  date: string;
  account_id: string | null;
  is_recurring: boolean;
  recurrence_value: number | null;
  recurrence_unit: string | null;
  notes: string | null;
  type: "expense" | "income" | "transfer";
  accounts: { name: string; color: string } | null;
  transaction_splits: {
    id: string;
    amount: number;
    assigned_to: string;
    status: string;
  }[];
  transaction_categories: {
    category_id: string;
    categories: { id: string; name: string; color: string | null };
  }[];
  related_transaction_id: string | null;
}

export interface TransactionFilters {
  search: string;
  categories: string[]; // category UUIDs
  startDate: Date | undefined;
  endDate: Date | undefined;
  limit?: number;
}

export function useTransactionsData(filters: TransactionFilters) {
  const [data, setData] = useState<{
    transactions: TransactionWithSplits[];
    isLoading: boolean;
    error: string | null;
    totalCount: number;
    hasMore: boolean;
  }>({
    transactions: [],
    isLoading: true,
    error: null,
    totalCount: 0,
    hasMore: false,
  });

  const fetchData = useCallback(async () => {
    setData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      // Base query
      let query = supabase
        .from("transactions")
        .select(
          `
          id,
          payee,
          total_amount,
          date,
          account_id,
          is_recurring,
          recurrence_value,
          recurrence_unit,
          notes,
          type,
          related_transaction_id,
          accounts(name, color),
          transaction_splits!inner(
            id,
            amount,
            assigned_to,
            status
          ),
          transaction_categories(
            category_id,
            categories(id, name, color)
          )
        `,
          { count: "exact" },
        )
        .eq("user_id", userId)
        .order("date", { ascending: false });

      // Apply Filters
      if (filters.search) {
        const sanitized = filters.search.replace(/[,.()"'\\]/g, "");
        if (sanitized.length > 0) {
          query = query.or(`payee.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`);
        }
      }

      if (filters.startDate) {
        const y = filters.startDate.getFullYear();
        const m = String(filters.startDate.getMonth() + 1).padStart(2, "0");
        const d = String(filters.startDate.getDate()).padStart(2, "0");
        query = query.gte("date", `${y}-${m}-${d}`);
      }

      if (filters.endDate) {
        const y = filters.endDate.getFullYear();
        const m = String(filters.endDate.getMonth() + 1).padStart(2, "0");
        const d = String(filters.endDate.getDate()).padStart(2, "0");
        query = query.lte("date", `${y}-${m}-${d}`);
      }

      if (filters.categories && filters.categories.length > 0) {
        query = query.in("transaction_categories.category_id", filters.categories);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data: transactionsData, error: transactionsError, count } = await query;

      if (transactionsError) throw transactionsError;

      const formattedTransactions = (transactionsData || []) as unknown as TransactionWithSplits[];

      // When filtering by category, exclude transactions that had no matching categories
      const filteredTransactions =
        filters.categories.length > 0
          ? formattedTransactions.filter((t) => t.transaction_categories && t.transaction_categories.length > 0)
          : formattedTransactions;

      setData({
        transactions: filteredTransactions,
        isLoading: false,
        error: null,
        totalCount: count || 0,
        hasMore: count ? filteredTransactions.length < count : false,
      });
    } catch (err: any) {
      setData((prev) => ({ ...prev, isLoading: false, error: err.message }));
    }
  }, [filters.search, filters.categories, filters.startDate, filters.endDate, filters.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}
