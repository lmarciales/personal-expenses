import { getProjectedBalance } from "@/lib/projectedBalance";
import { supabase } from "@/supabase/client";
import { differenceInDays, differenceInMonths, differenceInWeeks, differenceInYears, format, parseISO } from "date-fns";
import { es } from "date-fns/locale/es";
import { useCallback, useEffect, useState } from "react";

export interface DashboardAlert {
  id: string;
  type: "recurring_bill" | "spending_spike" | "debt_pending" | "cdt_maturing";
  title: string;
  description: string;
  amount: number;
  color: string;
  icon: string;
  actionData?: {
    payee: string;
    totalAmount: number;
    accountId: string | null;
    isRecurring: boolean;
    recurrenceValue: number;
    recurrenceUnit: string;
    categoryIds: string[];
    splits: { amount: number; assigned_to: string; status: string }[];
  };
  link?: string;
}

export function useDashboardAlerts() {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      // Fetch all data sources in parallel
      const [recurringResult, splitsResult, cdtResult] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            "payee, total_amount, recurrence_value, recurrence_unit, date, account_id, transaction_splits(amount, assigned_to, status), transaction_categories(category_id)",
          )
          .eq("user_id", userId)
          .eq("is_recurring", true)
          .order("date", { ascending: false }),
        supabase
          .from("transaction_splits")
          .select("id, amount, assigned_to, status")
          .eq("user_id", userId)
          .in("status", ["Pending Payment", "Pending Receival"]),
        supabase
          .from("accounts")
          .select(
            "id, name, type, balance, interest_rate, interest_reference_balance, interest_reference_date, maturity_date",
          )
          .eq("user_id", userId)
          .eq("type", "CDT")
          .eq("is_archived", false),
      ]);

      const newAlerts: DashboardAlert[] = [];
      const now = new Date();

      // --- Recurring Bills ---
      if (!recurringResult.error && recurringResult.data && recurringResult.data.length > 0) {
        // Group by payee: keep most recent per payee (data is already ordered DESC)
        const latestPayments = new Map<string, (typeof recurringResult.data)[0]>();
        for (const txn of recurringResult.data) {
          if (!latestPayments.has(txn.payee)) {
            latestPayments.set(txn.payee, txn);
          }
        }

        for (const txn of latestPayments.values()) {
          const lastPaidDate = parseISO(txn.date);
          const value = txn.recurrence_value ?? 1;
          const unit = txn.recurrence_unit ?? "Months";
          let isDue = false;

          if (unit === "Days") {
            isDue = differenceInDays(now, lastPaidDate) >= value;
          } else if (unit === "Weeks") {
            isDue = differenceInWeeks(now, lastPaidDate) >= value;
          } else if (unit === "Months") {
            isDue = differenceInMonths(now, lastPaidDate) >= value;
          } else if (unit === "Years") {
            isDue = differenceInYears(now, lastPaidDate) >= value && lastPaidDate.getMonth() === now.getMonth();
          }

          if (isDue) {
            const lastPaidFormatted = format(lastPaidDate, "MMM d, yyyy", { locale: es });
            newAlerts.push({
              id: `recurring-${txn.payee}`,
              type: "recurring_bill",
              title: txn.payee,
              description: `Último pago: ${lastPaidFormatted}`,
              amount: Math.abs(txn.total_amount),
              color: "#f59e0b",
              icon: "clock",
              actionData: {
                payee: txn.payee,
                totalAmount: Math.abs(txn.total_amount),
                accountId: txn.account_id,
                isRecurring: true,
                recurrenceValue: value,
                recurrenceUnit: unit,
                categoryIds: (txn.transaction_categories || []).map((tc) => tc.category_id),
                splits: (txn.transaction_splits || []).map((s) => ({
                  amount: Math.abs(s.amount),
                  assigned_to: s.assigned_to,
                  status: s.status,
                })),
              },
            });
          }
        }
      }

      // --- Debt Pending ---
      if (!splitsResult.error && splitsResult.data && splitsResult.data.length > 0) {
        const iOweSplits = splitsResult.data.filter(
          (s) => s.assigned_to === "Me" && s.status === "Pending Payment",
        );
        const owedToMeSplits = splitsResult.data.filter(
          (s) => s.assigned_to !== "Me" && s.status === "Pending Receival",
        );

        if (iOweSplits.length > 0) {
          const total = iOweSplits.reduce((sum, s) => sum + Math.abs(s.amount), 0);
          const count = iOweSplits.length;
          newAlerts.push({
            id: "debt-i-owe",
            type: "debt_pending",
            title: "Deudas pendientes",
            description: `Debes ${count} pago${count !== 1 ? "s" : ""}`,
            amount: total,
            color: "#ef4444",
            icon: "arrow-up",
            link: "/debts",
          });
        }

        if (owedToMeSplits.length > 0) {
          const total = owedToMeSplits.reduce((sum, s) => sum + Math.abs(s.amount), 0);
          const uniquePeople = new Set(owedToMeSplits.map((s) => s.assigned_to)).size;
          newAlerts.push({
            id: "debt-owed-to-me",
            type: "debt_pending",
            title: "Te deben",
            description: `${uniquePeople} persona${uniquePeople !== 1 ? "s" : ""} te debe${uniquePeople !== 1 ? "n" : ""}`,
            amount: total,
            color: "#3b82f6",
            icon: "arrow-down",
            link: "/debts",
          });
        }
      }

      // --- CDT Maturing ---
      if (!cdtResult.error && cdtResult.data && cdtResult.data.length > 0) {
        for (const account of cdtResult.data) {
          if (!account.maturity_date) continue;

          const maturityDate = new Date(account.maturity_date);
          const daysUntilMaturity = differenceInDays(maturityDate, now);

          if (daysUntilMaturity <= 60) {
            const projectedAmount = getProjectedBalance({
              balance: account.balance,
              interest_rate: account.interest_rate,
              interest_reference_balance: account.interest_reference_balance,
              interest_reference_date: account.interest_reference_date,
              type: "CDT",
            });

            const description =
              daysUntilMaturity < 0
                ? "CDT vencido"
                : daysUntilMaturity === 0
                  ? "Vence hoy"
                  : `Vence en ${daysUntilMaturity} día${daysUntilMaturity !== 1 ? "s" : ""}`;

            newAlerts.push({
              id: `cdt-${account.id}`,
              type: "cdt_maturing",
              title: account.name,
              description,
              amount: projectedAmount,
              color: "#a855f7",
              icon: "landmark",
              link: "/accounts",
            });
          }
        }
      }

      setAlerts(newAlerts);
    } catch (err) {
      console.error("Failed to fetch dashboard alerts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, isLoading, refetch: fetchAlerts };
}
