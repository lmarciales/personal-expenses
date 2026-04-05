import { getProjectedBalance } from "@/lib/projectedBalance";
import { supabase } from "@/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface CategorySpending {
  name: string;
  color: string | null;
  amount: number;
}

export interface GroupedSpending {
  groupId: string | null;
  groupName: string;
  groupColor: string;
  amount: number;
}

export interface DashboardInsights {
  savingsRate: number;
  savingsRatePrev: number;
  savingsRateTrend: number[];
  topGroup: { name: string; amount: number; pctOfTotal: number } | null;
  momExpenseChange: number;
  momExpenseAbs: [number, number];
}

export interface DashboardData {
  accounts: {
    id: string;
    name: string;
    balance: number;
    interest_rate: number | null;
    interest_reference_balance: number | null;
    interest_reference_date: string | null;
    type: string;
    color: string;
    credit_limit: number | null;
    is_4x1000_subject: boolean | null;
    maturity_date: string | null;
    on_maturity: string | null;
    linked_account_id: string | null;
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
    recurrence_value: number | null;
    recurrence_unit: string | null;
    transaction_splits: { id: string; amount: number; assigned_to: string; status: string }[];
    transaction_categories: { category_id: string; categories: { id: string; name: string; color: string | null } }[];
  }[];
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  categorySpending: CategorySpending[];
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  prevMonthExpense: number;
  momChange: number;
  groupedSpending: GroupedSpending[];
  insights: DashboardInsights;
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
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlyNet: 0,
    prevMonthExpense: 0,
    momChange: 0,
    groupedSpending: [],
    insights: {
      savingsRate: 0,
      savingsRatePrev: 0,
      savingsRateTrend: [0, 0],
      topGroup: null,
      momExpenseChange: 0,
      momExpenseAbs: [0, 0],
    },
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const prevLastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      const prevMonthEnd = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`;

      // Fetch all queries in parallel
      const [
        accountsResult,
        transactionsResult,
        expenseResult,
        monthlyIncomeResult,
        monthlyExpenseResult,
        prevMonthExpenseResult,
        prevMonthIncomeResult,
        groupsResult,
      ] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", userId),
        supabase
          .from("transactions")
          .select(`
                        id, payee, total_amount, date, account_id, type,
                        is_recurring, recurrence_value, recurrence_unit, notes,
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
        supabase
          .from("transactions")
          .select("id, total_amount")
          .eq("user_id", userId)
          .eq("type", "income")
          .gte("date", monthStart)
          .lte("date", monthEnd),
        supabase
          .from("transactions")
          .select(`
                        id, total_amount,
                        transaction_categories(category_id, categories(id, name, color, parent_id, is_group))
                    `)
          .eq("user_id", userId)
          .eq("type", "expense")
          .gte("date", monthStart)
          .lte("date", monthEnd),
        supabase
          .from("transactions")
          .select("id, total_amount")
          .eq("user_id", userId)
          .eq("type", "expense")
          .gte("date", prevMonthStart)
          .lte("date", prevMonthEnd),
        supabase
          .from("transactions")
          .select("id, total_amount")
          .eq("user_id", userId)
          .eq("type", "income")
          .gte("date", prevMonthStart)
          .lte("date", prevMonthEnd),
        supabase.from("categories").select("id, name, color").eq("user_id", userId).eq("is_group", true),
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;
      if (expenseResult.error) throw expenseResult.error;
      if (monthlyIncomeResult.error) throw monthlyIncomeResult.error;
      if (monthlyExpenseResult.error) throw monthlyExpenseResult.error;
      if (prevMonthExpenseResult.error) throw prevMonthExpenseResult.error;
      if (prevMonthIncomeResult.error) throw prevMonthIncomeResult.error;
      if (groupsResult.error) throw groupsResult.error;

      // Aggregate spending by category (annual, flat — kept for backward compatibility)
      const categoryMap = new Map<string, { name: string; color: string | null; amount: number }>();
      for (const txn of (expenseResult.data || []) as any[]) {
        const cats = txn.transaction_categories || [];
        const amount = Math.abs(txn.total_amount);
        if (cats.length === 0) continue;
        for (const tc of cats) {
          const cat = tc.categories;
          if (!cat) continue;
          const existing = categoryMap.get(cat.id);
          if (existing) {
            existing.amount += amount;
          } else {
            categoryMap.set(cat.id, { name: cat.name, color: cat.color, amount });
          }
        }
      }
      const categorySpending = Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);

      const allExpenseTotal = (expenseResult.data || []).reduce(
        (sum: number, txn: any) => sum + Math.abs(txn.total_amount),
        0,
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
        interest_rate: acc.interest_rate ?? null,
        interest_reference_balance: acc.interest_reference_balance ?? null,
        interest_reference_date: acc.interest_reference_date ?? null,
        type: acc.type,
        color: acc.color || fallbackColors[idx % fallbackColors.length],
        credit_limit: acc.credit_limit ?? null,
        is_4x1000_subject: acc.is_4x1000_subject ?? null,
        maturity_date: acc.maturity_date ?? null,
        on_maturity: acc.on_maturity ?? null,
        linked_account_id: acc.linked_account_id ?? null,
      }));

      const totalBalance = accounts.reduce((acc, curr) => acc + getProjectedBalance(curr), 0);

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
        recurrence_value: txn.recurrence_value || null,
        recurrence_unit: txn.recurrence_unit || null,
        transaction_splits: txn.transaction_splits || [],
        transaction_categories: txn.transaction_categories || [],
      }));

      // Monthly totals
      const monthlyIncome = (monthlyIncomeResult.data || []).reduce(
        (sum: number, t: any) => sum + Math.abs(t.total_amount),
        0,
      );
      const monthlyExpenseTotal = (monthlyExpenseResult.data || []).reduce(
        (sum: number, t: any) => sum + Math.abs(t.total_amount),
        0,
      );
      const monthlyNet = monthlyIncome - monthlyExpenseTotal;
      const prevMonthExpenseTotal = (prevMonthExpenseResult.data || []).reduce(
        (sum: number, t: any) => sum + Math.abs(t.total_amount),
        0,
      );
      const momChange =
        prevMonthExpenseTotal > 0 ? ((monthlyExpenseTotal - prevMonthExpenseTotal) / prevMonthExpenseTotal) * 100 : 0;

      // Grouped spending — aggregate by parent group
      const groups = (groupsResult.data || []) as { id: string; name: string; color: string }[];
      const groupMap = new Map<string, GroupedSpending>();

      for (const txn of (monthlyExpenseResult.data || []) as any[]) {
        const cats = txn.transaction_categories || [];
        const amount = Math.abs(txn.total_amount);
        if (cats.length === 0) continue;

        for (const tc of cats) {
          const cat = tc.categories;
          if (!cat || cat.is_group) continue;

          const parentId = cat.parent_id;
          const group = parentId ? groups.find((g) => g.id === parentId) : null;
          const key = group ? group.id : `ungrouped-${cat.id}`;

          const existing = groupMap.get(key);
          if (existing) {
            existing.amount += amount;
          } else {
            groupMap.set(key, {
              groupId: group?.id ?? null,
              groupName: group?.name ?? cat.name,
              groupColor: group?.color ?? cat.color ?? "#666",
              amount,
            });
          }
        }
      }

      const groupedSpending = Array.from(groupMap.values()).sort((a, b) => b.amount - a.amount);

      // Insights
      const prevMonthIncomeTotal = (prevMonthIncomeResult.data || []).reduce(
        (sum: number, t: any) => sum + Math.abs(t.total_amount),
        0,
      );
      const savingsRate = monthlyIncome > 0 ? (monthlyNet / monthlyIncome) * 100 : 0;
      const prevNet = prevMonthIncomeTotal - prevMonthExpenseTotal;
      const savingsRatePrev = prevMonthIncomeTotal > 0 ? (prevNet / prevMonthIncomeTotal) * 100 : 0;

      const topGroupEntry = groupedSpending[0] ?? null;
      const topGroup = topGroupEntry
        ? {
            name: topGroupEntry.groupName,
            amount: topGroupEntry.amount,
            pctOfTotal: monthlyExpenseTotal > 0 ? (topGroupEntry.amount / monthlyExpenseTotal) * 100 : 0,
          }
        : null;

      const insights: DashboardInsights = {
        savingsRate,
        savingsRatePrev,
        savingsRateTrend: [savingsRatePrev, savingsRate],
        topGroup,
        momExpenseChange: momChange,
        momExpenseAbs: [monthlyExpenseTotal, prevMonthExpenseTotal],
      };

      setData({
        accounts,
        transactions,
        totalBalance,
        totalIncome: Array.isArray(transactionsResult.data)
          ? transactionsResult.data.filter((t) => t.type === "income").reduce((a, b) => a + Math.abs(b.total_amount), 0)
          : 0,
        totalExpense: allExpenseTotal,
        categorySpending,
        monthlyIncome,
        monthlyExpense: monthlyExpenseTotal,
        monthlyNet,
        prevMonthExpense: prevMonthExpenseTotal,
        momChange,
        groupedSpending,
        insights,
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
