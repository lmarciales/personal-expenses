import { supabase } from "@/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface MonthlyData {
  name: string;
  value: number;
}

export interface AnalyticsData {
  monthlyExpenses: MonthlyData[];
  monthlyIncome: MonthlyData[];
  totalExpenses: number;
  totalIncome: number;
  prevYearTotalExpenses: number;
  prevYearTotalIncome: number;
  netCashFlow: number;
  avgMonthlySpend: number;
  highestMonth: { name: string; value: number } | null;
  lowestMonth: { name: string; value: number } | null;
  savingsRate: number;
  monthOverMonthChange: number | null;
  availableYears: number[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function useAnalyticsData(year: number): AnalyticsData {
  const [data, setData] = useState<Omit<AnalyticsData, "refetch">>({
    monthlyExpenses: [],
    monthlyIncome: [],
    totalExpenses: 0,
    totalIncome: 0,
    prevYearTotalExpenses: 0,
    prevYearTotalIncome: 0,
    netCashFlow: 0,
    avgMonthlySpend: 0,
    highestMonth: null,
    lowestMonth: null,
    savingsRate: 0,
    monthOverMonthChange: null,
    availableYears: [],
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const prevStartDate = `${year - 1}-01-01`;
      const prevEndDate = `${year - 1}-12-31`;

      // Fetch current year and previous year transactions in parallel
      const [currentYearResult, prevYearResult, allDatesResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, total_amount, date, type")
          .eq("user_id", userId)
          .gte("date", startDate)
          .lte("date", endDate)
          .in("type", ["expense", "income"]),
        supabase
          .from("transactions")
          .select("total_amount, type")
          .eq("user_id", userId)
          .gte("date", prevStartDate)
          .lte("date", prevEndDate)
          .in("type", ["expense", "income"]),
        supabase.from("transactions").select("date").eq("user_id", userId),
      ]);

      if (currentYearResult.error) throw currentYearResult.error;
      if (prevYearResult.error) throw prevYearResult.error;
      if (allDatesResult.error) throw allDatesResult.error;

      const currentTxns = currentYearResult.data || [];
      const prevTxns = prevYearResult.data || [];

      // Available years
      const yearsSet = new Set<number>();
      for (const row of allDatesResult.data || []) {
        if (row.date) yearsSet.add(Number.parseInt(row.date.split("-")[0], 10));
      }
      const availableYears = Array.from(yearsSet).sort();

      // Aggregate monthly data
      const expenseMap = new Map<number, number>();
      const incomeMap = new Map<number, number>();

      for (const txn of currentTxns) {
        // Parse month directly from date string to avoid timezone-related shifts
        // (new Date("2026-01-01") at UTC midnight becomes Dec 31 in UTC-5 timezones)
        const month = Number.parseInt(txn.date.split("-")[1], 10) - 1;
        const amount = Math.abs(txn.total_amount);
        if (txn.type === "expense") {
          expenseMap.set(month, (expenseMap.get(month) || 0) + amount);
        } else if (txn.type === "income") {
          incomeMap.set(month, (incomeMap.get(month) || 0) + amount);
        }
      }

      const monthlyExpenses = MONTH_NAMES.map((name, idx) => ({
        name,
        value: expenseMap.get(idx) || 0,
      }));

      const monthlyIncome = MONTH_NAMES.map((name, idx) => ({
        name,
        value: incomeMap.get(idx) || 0,
      }));

      const totalExpenses = monthlyExpenses.reduce((sum, m) => sum + m.value, 0);
      const totalIncome = monthlyIncome.reduce((sum, m) => sum + m.value, 0);
      const netCashFlow = totalIncome - totalExpenses;

      // Previous year totals
      let prevYearTotalExpenses = 0;
      let prevYearTotalIncome = 0;
      for (const txn of prevTxns) {
        const amount = Math.abs(txn.total_amount);
        if (txn.type === "expense") prevYearTotalExpenses += amount;
        else if (txn.type === "income") prevYearTotalIncome += amount;
      }

      // Months with expense data
      const monthsWithExpenses = monthlyExpenses.filter((m) => m.value > 0);
      const avgMonthlySpend = monthsWithExpenses.length > 0 ? totalExpenses / monthsWithExpenses.length : 0;

      // Highest/lowest months
      let highestMonth: { name: string; value: number } | null = null;
      let lowestMonth: { name: string; value: number } | null = null;
      if (monthsWithExpenses.length > 0) {
        highestMonth = monthsWithExpenses.reduce((max, m) => (m.value > max.value ? m : max));
        lowestMonth = monthsWithExpenses.reduce((min, m) => (m.value < min.value ? m : min));
      }

      // Savings rate
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

      // Month-over-month change (latest month vs previous month with data)
      let monthOverMonthChange: number | null = null;
      const currentMonthIdx = new Date().getFullYear() === year ? new Date().getMonth() : 11;
      const currentVal = monthlyExpenses[currentMonthIdx]?.value || 0;
      // Find previous month with data
      for (let i = currentMonthIdx - 1; i >= 0; i--) {
        if (monthlyExpenses[i].value > 0) {
          monthOverMonthChange = Math.round(((currentVal - monthlyExpenses[i].value) / monthlyExpenses[i].value) * 100);
          break;
        }
      }

      setData({
        monthlyExpenses,
        monthlyIncome,
        totalExpenses,
        totalIncome,
        prevYearTotalExpenses,
        prevYearTotalIncome,
        netCashFlow,
        avgMonthlySpend,
        highestMonth,
        lowestMonth,
        savingsRate,
        monthOverMonthChange,
        availableYears,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      setData((prev) => ({ ...prev, isLoading: false, error: err.message }));
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}
