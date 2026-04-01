import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRecurringRecommendations } from "@/hooks/useRecurringRecommendations";
import { formatCOPWithSymbol } from "@/lib/currency";
import { getDateLocale } from "@/lib/dateFnsLocale";
import { supabase } from "@/supabase/client";
import { format } from "date-fns";
import { ArrowRight, CalendarClock, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AddTransactionModal } from "./Transactions/AddTransactionModal";

function formatRecurrence(value: number, unit: string, t: (key: string) => string): string {
  if (value === 1) {
    const unitMap: Record<string, string> = {
      Days: t("dashboard:recurring.daily"),
      Weeks: t("dashboard:recurring.weekly"),
      Months: t("dashboard:recurring.monthly"),
      Years: t("dashboard:recurring.yearly"),
    };
    return unitMap[unit] || unit;
  }
  const unitNames: Record<string, string> = {
    Days: t("transactions:modal.days"),
    Weeks: t("transactions:modal.weeks"),
    Months: t("transactions:modal.months"),
    Years: t("transactions:modal.years"),
  };
  return `${value} ${unitNames[unit] || unit}`;
}

export function RecurringRecommendations({
  accounts,
  onSuccess,
}: { accounts: { id: string; name: string; balance: number }[]; onSuccess: () => void }) {
  const { t } = useTranslation(["dashboard", "transactions"]);
  const { recommendations, isLoading, refetch } = useRecurringRecommendations();

  const handleCancelRecurrence = async (payee: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Find the latest recurring transaction for this payee and cancel it
      const { data: txns } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("payee", payee)
        .eq("is_recurring", true)
        .order("date", { ascending: false })
        .limit(1);

      if (txns && txns.length > 0) {
        await supabase
          .from("transactions")
          .update({ is_recurring: false, recurrence_value: null, recurrence_unit: null })
          .eq("id", txns[0].id)
          .eq("user_id", userData.user.id);
        refetch();
        toast.success(t("dashboard:recurring.cancelledToast", { payee }));
      }
    } catch (err) {
      console.error("Failed to cancel recurrence:", err);
      toast.error(t("dashboard:recurring.cancelError"));
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-24 flex items-center justify-center glass-card rounded-3xl border-glass opacity-50">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2 px-2 pb-2">
        <CalendarClock className="w-5 h-5 text-primary animate-pulse" />
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t("dashboard:recurring.title")}</h2>
      </div>
      <div className="flex flex-col gap-3">
        {recommendations.map((rec, index) => (
          <Card
            key={index}
            className="glass-card border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors shadow-glow-accent"
          >
            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="hidden md:flex flex-col items-center justify-center bg-background/50 rounded-xl px-4 py-2 border border-subtle min-w-[80px]">
                  <span className="text-xs text-muted-foreground uppercase">
                    {formatRecurrence(rec.recurrence_value, rec.recurrence_unit, t)}
                  </span>
                  <span className="text-sm font-bold text-primary">{t("dashboard:recurring.bill")}</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground tracking-tight">{rec.payee}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("dashboard:recurring.lastPaid")}{" "}
                    <span className="text-foreground/80 font-medium">
                      {format(new Date(rec.last_paid_date), "MMM d, yyyy", { locale: getDateLocale() })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto gap-3 border-t border-subtle pt-4 md:border-t-0 md:pt-0">
                <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400 whitespace-nowrap">
                  {formatCOPWithSymbol(rec.total_amount)}
                </div>

                <div className="flex items-center gap-2">
                  <AddTransactionModal
                    accounts={accounts}
                    onSuccess={onSuccess}
                    initialData={{
                      payee: rec.payee,
                      totalAmount: rec.total_amount,
                      isRecurring: true,
                      recurrenceValue: rec.recurrence_value,
                      recurrenceUnit: rec.recurrence_unit,
                      accountId: rec.account_id,
                      categoryIds: rec.lastCategoryIds,
                      splits:
                        rec.lastSplits.length > 0
                          ? rec.lastSplits.map((s) => ({
                              amount: s.amount,
                              assigned_to: s.assigned_to,
                              status: s.status as any,
                            }))
                          : undefined,
                    }}
                  >
                    <Button className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 shadow-glow-accent transition-all whitespace-nowrap">
                      {t("dashboard:recurring.logItNow")} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </AddTransactionModal>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/20 h-9 w-9"
                    onClick={() => handleCancelRecurrence(rec.payee)}
                    title={t("dashboard:recurring.cancel")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
