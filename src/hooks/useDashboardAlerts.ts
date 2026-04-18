import { parseLocalDate } from "@/lib/dates";
import { getProjectedBalance } from "@/lib/projectedBalance";
import { supabase } from "@/supabase/client";
import { addDays, addMonths, addWeeks, addYears, differenceInDays } from "date-fns";
import { useCallback, useEffect, useState } from "react";

// Lead time per recurrence unit — how many days BEFORE the next due date
// we start surfacing the alert, so the user has a chance to cancel a
// subscription before it auto-charges. Monthly is the common case.
const LEAD_DAYS_BY_UNIT: Record<string, number> = {
  Days: 0,
  Weeks: 2,
  Months: 7,
  Years: 14,
};

export interface DashboardAlert {
  id: string;
  type: "recurring_bill" | "spending_spike" | "debt_pending" | "cdt_maturing";
  // For recurring bills: "due" = cycle elapsed, pay it now.
  // "upcoming" = within the lead window, heads-up before auto-charge.
  status?: "due" | "upcoming";
  title: string;
  // Optional i18n key + params for translated titles/descriptions.
  // When present, the component runs them through t() instead of rendering
  // `title`/`description` raw. Raw strings (payee names, account names) still
  // use the plain fields.
  titleKey?: string;
  titleParams?: Record<string, string | number>;
  description: string;
  descriptionKey?: string;
  descriptionParams?: Record<string, string | number>;
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

      // First, find the payees that ever had a recurring transaction — we need
      // to inspect their full history (not just is_recurring=true rows) because
      // editing the latest tx to un-recurring should silence the alert.
      // Scoping to these payees keeps the payload small.
      const recurringPayeesResult = await supabase
        .from("transactions")
        .select("payee")
        .eq("user_id", userId)
        .eq("is_recurring", true);

      const recurringPayees = Array.from(new Set((recurringPayeesResult.data || []).map((r) => r.payee)));

      const [recurringResult, splitsResult, cdtResult] = await Promise.all([
        recurringPayees.length > 0
          ? supabase
              .from("transactions")
              .select(
                "payee, total_amount, recurrence_value, recurrence_unit, date, account_id, is_recurring, transaction_splits(amount, assigned_to, status), transaction_categories(category_id)",
              )
              .eq("user_id", userId)
              .in("payee", recurringPayees)
              .order("date", { ascending: false })
          : Promise.resolve({ data: [], error: null } as { data: never[]; error: null }),
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
        // Keep the most recent tx per payee (data ordered DESC). We only emit
        // an alert if that newest tx still has is_recurring=true — that way,
        // editing the newest tx to un-recurring immediately clears the alert.
        const latestPayments = new Map<string, (typeof recurringResult.data)[0]>();
        for (const txn of recurringResult.data) {
          if (!latestPayments.has(txn.payee)) {
            latestPayments.set(txn.payee, txn);
          }
        }

        for (const txn of latestPayments.values()) {
          if (!txn.is_recurring) continue;
          const lastPaidDate = parseLocalDate(txn.date);
          const value = txn.recurrence_value ?? 1;
          const unit = txn.recurrence_unit ?? "Months";

          // Compute the next due date by adding one full cycle to the last
          // payment, then apply a unit-specific lead window so monthly/yearly
          // bills show up before they auto-charge.
          let nextDueDate: Date;
          if (unit === "Days") nextDueDate = addDays(lastPaidDate, value);
          else if (unit === "Weeks") nextDueDate = addWeeks(lastPaidDate, value);
          else if (unit === "Years") nextDueDate = addYears(lastPaidDate, value);
          else nextDueDate = addMonths(lastPaidDate, value);

          const leadDays = LEAD_DAYS_BY_UNIT[unit] ?? LEAD_DAYS_BY_UNIT.Months;
          const daysUntilDue = differenceInDays(nextDueDate, now);

          if (daysUntilDue > leadDays) continue; // still too far out
          const status: "due" | "upcoming" = daysUntilDue <= 0 ? "due" : "upcoming";

          const descriptionKey =
            status === "upcoming"
              ? daysUntilDue === 1
                ? "recurring.dueTomorrow"
                : "recurring.dueInDays"
              : "recurring.lastPaidOn";
          const descriptionParams =
            status === "upcoming" ? { count: daysUntilDue } : ({ date: txn.date } as Record<string, string | number>);

          newAlerts.push({
            id: `recurring-${txn.payee}`,
            type: "recurring_bill",
            status,
            title: txn.payee,
            description: "",
            descriptionKey,
            descriptionParams,
            amount: Math.abs(txn.total_amount),
            color: status === "upcoming" ? "#60a5fa" : "#f59e0b",
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

      // --- Debt Pending ---
      if (!splitsResult.error && splitsResult.data && splitsResult.data.length > 0) {
        const iOweSplits = splitsResult.data.filter((s) => s.assigned_to === "Me" && s.status === "Pending Payment");
        const owedToMeSplits = splitsResult.data.filter(
          (s) => s.assigned_to !== "Me" && s.status === "Pending Receival",
        );

        if (iOweSplits.length > 0) {
          const total = iOweSplits.reduce((sum, s) => sum + Math.abs(s.amount), 0);
          const count = iOweSplits.length;
          newAlerts.push({
            id: "debt-i-owe",
            type: "debt_pending",
            title: "",
            titleKey: "alerts.debts.iOweTitle",
            description: "",
            descriptionKey: "alerts.debts.iOweDescription",
            descriptionParams: { count },
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
            title: "",
            titleKey: "alerts.debts.owedToMeTitle",
            description: "",
            descriptionKey: "alerts.debts.owedToMeDescription",
            descriptionParams: { count: uniquePeople },
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

          const maturityDate = parseLocalDate(account.maturity_date);
          const daysUntilMaturity = differenceInDays(maturityDate, now);

          if (daysUntilMaturity <= 60) {
            const projectedAmount = getProjectedBalance({
              balance: account.balance,
              interest_rate: account.interest_rate,
              interest_reference_balance: account.interest_reference_balance,
              interest_reference_date: account.interest_reference_date,
              type: "CDT",
            });

            const descriptionKey =
              daysUntilMaturity < 0
                ? "alerts.cdt.overdue"
                : daysUntilMaturity === 0
                  ? "alerts.cdt.dueToday"
                  : "alerts.cdt.dueIn";

            newAlerts.push({
              id: `cdt-${account.id}`,
              type: "cdt_maturing",
              title: account.name,
              description: "",
              descriptionKey,
              descriptionParams: daysUntilMaturity > 0 ? { count: daysUntilMaturity } : undefined,
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

  const cancelRecurrenceForPayee = useCallback(
    async (payee: string) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("transactions")
        .update({ is_recurring: false, recurrence_value: null, recurrence_unit: null })
        .eq("user_id", userData.user.id)
        .eq("payee", payee)
        .eq("is_recurring", true);

      if (error) throw error;
      await fetchAlerts();
    },
    [fetchAlerts],
  );

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, isLoading, refetch: fetchAlerts, cancelRecurrenceForPayee };
}
