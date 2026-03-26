import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/supabase/client";
import type { CategorySpending } from "@/components/SpendingOverview";

export interface DashboardData {
    accounts: {
        id: string;
        name: string;
        balance: number;
        type: string;
        color: string;
    }[];
    transactions: {
        id: string;
        name: string;
        email: string;
        amount: number;
        status: "Success" | "Pending";
        type: "expense" | "income" | "transfer";
        account_id: string;
        date: string;
        notes: string | null;
        is_recurring: boolean;
        recurrence_interval: string | null;
        transaction_splits: { id: string; amount: number; assigned_to: string; status: string }[];
        transaction_categories: { category_id: string; categories: { id: string; name: string; color: string | null } }[];
    }[];
    totalBalance: number;
    totalIncome: number;
    totalExpense: number;
    categorySpending: CategorySpending[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useDashboardData() {
    const [data, setData] = useState<Omit<DashboardData, "refetch">>({
        accounts: [],
        transactions: [],
        totalBalance: 0,
        totalIncome: 0,
        totalExpense: 0,
        categorySpending: [],
        isLoading: true,
        error: null,
    });

    const fetchData = useCallback(async () => {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) throw new Error("User not authenticated");
            const userId = userData.user.id;

            const currentYear = new Date().getFullYear();
            const startDate = `${currentYear}-01-01`;
            const endDate = `${currentYear}-12-31`;

            // Fetch Accounts, Transactions (last 5), and current-year expenses in parallel
            const [accountsResult, transactionsResult, expenseResult] = await Promise.all([
                supabase
                    .from("accounts")
                    .select("*")
                    .eq("user_id", userId),
                supabase
                    .from("transactions")
                    .select(`
                        id, payee, total_amount, date, account_id, type,
                        is_recurring, recurrence_interval, notes,
                        accounts (name),
                        transaction_splits (id, amount, assigned_to, status),
                        transaction_categories (category_id, categories (id, name, color))
                    `)
                    .eq("user_id", userId)
                    .order("date", { ascending: false })
                    .limit(5),
                supabase
                    .from("transactions")
                    .select(`
                        id, total_amount, date, type,
                        transaction_categories(category_id, categories(id, name, color))
                    `)
                    .eq("user_id", userId)
                    .eq("type", "expense")
                    .gte("date", startDate)
                    .lte("date", endDate),
            ]);

            if (accountsResult.error) throw accountsResult.error;
            if (transactionsResult.error) throw transactionsResult.error;
            if (expenseResult.error) throw expenseResult.error;

            // Aggregate spending by category
            const categoryMap = new Map<string, { name: string; color: string | null; amount: number }>();
            for (const txn of (expenseResult.data || []) as any[]) {
                const cats = txn.transaction_categories || [];
                const amount = Math.abs(txn.total_amount);
                if (cats.length === 0) continue;
                const perCat = amount / cats.length;
                for (const tc of cats) {
                    const cat = tc.categories;
                    if (!cat) continue;
                    const existing = categoryMap.get(cat.id);
                    if (existing) {
                        existing.amount += perCat;
                    } else {
                        categoryMap.set(cat.id, { name: cat.name, color: cat.color, amount: perCat });
                    }
                }
            }
            const categorySpending = Array.from(categoryMap.values())
                .sort((a, b) => b.amount - a.amount);

            const allExpenseTotal = (expenseResult.data || []).reduce(
                (sum: number, txn: any) => sum + Math.abs(txn.total_amount), 0
            );

            // Map Accounts
            const fallbackColors = [
                "bg-primary text-primary-foreground",
                "bg-blue-600 text-white",
                "bg-purple-600 text-white",
                "bg-cyan-600 text-white",
            ];

            const accounts = (accountsResult.data || []).map((acc, idx) => ({
                id: acc.id,
                name: acc.name,
                balance: acc.balance,
                type: acc.type,
                color: acc.color || fallbackColors[idx % fallbackColors.length],
            }));

            const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

            // Map Transactions for UI
            const transactions = (transactionsResult.data || []).map((txn: any) => ({
                id: txn.id,
                name: txn.payee,
                email: txn.accounts && !Array.isArray(txn.accounts) ? txn.accounts.name : "Unknown Account",
                amount: Math.abs(txn.total_amount),
                status: "Success" as const,
                type: (txn.type as "expense" | "income" | "transfer") || "expense",
                account_id: txn.account_id,
                date: txn.date,
                notes: txn.notes || null,
                is_recurring: txn.is_recurring || false,
                recurrence_interval: txn.recurrence_interval || null,
                transaction_splits: txn.transaction_splits || [],
                transaction_categories: txn.transaction_categories || [],
            }));

            setData({
                accounts,
                transactions,
                totalBalance,
                totalIncome: Array.isArray(transactionsResult.data) ? transactionsResult.data.filter(t => t.type === 'income').reduce((a, b) => a + Math.abs(b.total_amount), 0) : 0,
                totalExpense: allExpenseTotal,
                categorySpending,
                isLoading: false,
                error: null,
            });
        } catch (err: any) {
            setData((prev) => ({ ...prev, isLoading: false, error: err.message }));
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { ...data, refetch: fetchData };
}
