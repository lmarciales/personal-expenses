import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

export interface MonthlyExpense {
    name: string;
    value: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface ExpenseChartData {
    monthlyExpenses: MonthlyExpense[];
    availableYears: number[];
    isLoading: boolean;
    error: string | null;
}

export function useExpenseChartData(year: number) {
    const [data, setData] = useState<ExpenseChartData>({
        monthlyExpenses: [],
        availableYears: [],
        isLoading: true,
        error: null,
    });

    const fetchData = useCallback(async () => {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) throw new Error("User not authenticated");
            const userId = userData.user.id;

            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;

            const [expenseResult, datesResult] = await Promise.all([
                supabase
                    .from("transactions")
                    .select("total_amount, date")
                    .eq("user_id", userId)
                    .eq("type", "expense")
                    .gte("date", startDate)
                    .lte("date", endDate),
                supabase
                    .from("transactions")
                    .select("date")
                    .eq("user_id", userId),
            ]);

            if (expenseResult.error) throw expenseResult.error;
            if (datesResult.error) throw datesResult.error;

            // Aggregate monthly expenses
            const monthlyMap = new Map<number, number>();
            for (const txn of expenseResult.data || []) {
                const d = new Date(txn.date);
                const month = d.getMonth();
                monthlyMap.set(month, (monthlyMap.get(month) || 0) + Math.abs(txn.total_amount));
            }
            const monthlyExpenses = MONTH_NAMES.map((name, idx) => ({
                name,
                value: monthlyMap.get(idx) || 0,
            }));

            // Available years
            const yearsSet = new Set<number>();
            for (const row of datesResult.data || []) {
                if (row.date) yearsSet.add(new Date(row.date).getFullYear());
            }

            setData({
                monthlyExpenses,
                availableYears: Array.from(yearsSet).sort(),
                isLoading: false,
                error: null,
            });
        } catch (err: any) {
            setData(prev => ({ ...prev, isLoading: false, error: err.message }));
        }
    }, [year]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return data;
}
