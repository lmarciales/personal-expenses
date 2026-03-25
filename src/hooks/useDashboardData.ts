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
        lastDigits: string;
    }[];
    transactions: {
        id: string;
        name: string;
        email: string;
        amount: number;
        status: "Success" | "Pending";
        type: "expense" | "income" | "transfer";
        image: string;
        account_id: string;
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

            // Fetch Accounts
            const { data: accountsData, error: accountsError } = await supabase
                .from("accounts")
                .select("*")
                .eq("user_id", userId);

            if (accountsError) throw accountsError;

            // Fetch Transactions
            const { data: transactionsData, error: transactionsError } = await supabase
                .from("transactions")
                .select(`
            id,
            payee,
            total_amount,
            date,
            account_id,
            type,
            accounts (name)
          `)
                .eq("user_id", userId)
                .order("date", { ascending: false })
                .limit(5);

            if (transactionsError) throw transactionsError;

            // Fetch expense transactions with categories for spending breakdown
            const { data: expenseWithCategories, error: expenseCatError } = await supabase
                .from("transactions")
                .select(`
            id,
            total_amount,
            type,
            transaction_categories(
              category_id,
              categories(id, name, color)
            )
          `)
                .eq("user_id", userId)
                .eq("type", "expense");

            if (expenseCatError) throw expenseCatError;

            // Aggregate spending by category
            const categoryMap = new Map<string, { name: string; color: string | null; amount: number }>();
            for (const txn of (expenseWithCategories || []) as any[]) {
                const cats = txn.transaction_categories || [];
                const amount = Math.abs(txn.total_amount);
                if (cats.length === 0) continue;
                // Distribute amount equally among categories
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

            // Total expense from all expense transactions (not just last 5)
            const allExpenseTotal = (expenseWithCategories || []).reduce(
                (sum: number, txn: any) => sum + Math.abs(txn.total_amount), 0
            );

            // Map Accounts for the UI
            const colors = [
                "bg-primary text-primary-foreground",
                "bg-blue-600 text-white",
                "bg-purple-600 text-white",
                "bg-cyan-600 text-white",
            ];

            const accounts = (accountsData || []).map((acc, idx) => ({
                id: acc.id,
                name: acc.name,
                balance: acc.balance,
                type: acc.type,
                color: colors[idx % colors.length],
                lastDigits: "****", // Placeholder since we don't store actual cards
            }));

            const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

            // Map Transactions for UI
            const transactions = (transactionsData || []).map((txn) => ({
                id: txn.id,
                name: txn.payee,
                // Using account name as a proxy for "email" field in UI
                email: txn.accounts && !Array.isArray(txn.accounts) ? txn.accounts.name : "Unknown Account",
                amount: Math.abs(txn.total_amount), // Use absolute value, since amounts might be negative in DB
                status: "Success" as const, // Assuming settled, later driven by transaction_splits
                type: (txn.type as "expense" | "income" | "transfer") || "expense",
                image: "https://github.com/shadcn.png", // Placeholder avatar
                account_id: txn.account_id,
            }));

            setData({
                accounts,
                transactions,
                totalBalance,
                totalIncome: Array.isArray(transactionsData) ? transactionsData.filter(t => t.type === 'income').reduce((a, b) => a + Math.abs(b.total_amount), 0) : 0,
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
