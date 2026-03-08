import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

export interface TransactionWithSplits {
    id: string;
    payee: string;
    total_amount: number;
    date: string;
    account_id: string;
    is_recurring: boolean;
    recurrence_interval: string | null;
    notes: string | null;
    type: "expense" | "income" | "transfer";
    accounts: { name: string; color: string } | null;
    transaction_splits: {
        id: string;
        amount: number;
        category: string;
        assigned_to: string;
        status: string;
    }[];
}

export interface TransactionFilters {
    search: string;
    categories: string[];
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
                .select(`
          id,
          payee,
          total_amount,
          date,
          account_id,
          is_recurring,
          recurrence_interval,
          notes,
          type,
          accounts!inner(name, color),
          transaction_splits!inner(
            id,
            amount,
            category,
            assigned_to,
            status
          )
        `, { count: 'exact' })
                .eq("user_id", userId)
                .order("date", { ascending: false });

            // Apply Filters
            if (filters.search) {
                query = query.or(`payee.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
            }

            if (filters.startDate) {
                query = query.gte("date", filters.startDate.toISOString());
            }

            if (filters.endDate) {
                query = query.lte("date", filters.endDate.toISOString());
            }

            if (filters.categories && filters.categories.length > 0) {
                query = query.in("transaction_splits.category", filters.categories);
            }

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data: transactionsData, error: transactionsError, count } = await query;

            if (transactionsError) throw transactionsError;

            // The !inner join on transactions_splits might return duplicate rows if there are multiple splits.
            // Supabase's postgrest-js automatically nests them if the schema has foreign keys correctly.
            // Let's typecast the result.
            const formattedTransactions = (transactionsData || []) as unknown as TransactionWithSplits[];

            setData({
                transactions: formattedTransactions,
                isLoading: false,
                error: null,
                totalCount: count || 0,
                hasMore: count ? formattedTransactions.length < count : false,
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
