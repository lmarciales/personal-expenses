import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRecurringRecommendations } from "@/hooks/useRecurringRecommendations";
import { formatCOPWithSymbol } from "@/lib/currency";
import { getDateLocale } from "@/lib/dateFnsLocale";
import { format } from "date-fns";
import { ArrowRight, CalendarClock, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AddTransactionModal } from "./Transactions/AddTransactionModal";

export function RecurringRecommendations({
  accounts,
  onSuccess,
}: { accounts: { id: string; name: string; balance: number }[]; onSuccess: () => void }) {
  const { t } = useTranslation("dashboard");
  const { recommendations, isLoading } = useRecurringRecommendations();

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
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t("recurring.title")}</h2>
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
                  <span className="text-xs text-muted-foreground uppercase">{rec.recurrence_interval}</span>
                  <span className="text-sm font-bold text-primary">{t("recurring.bill")}</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground tracking-tight">{rec.payee}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("recurring.lastPaid")}{" "}
                    <span className="text-foreground/80 font-medium">
                      {format(new Date(rec.last_paid_date), "MMM d, yyyy", { locale: getDateLocale() })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t border-subtle pt-4 md:border-t-0 md:pt-0">
                <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400 whitespace-nowrap">
                  {formatCOPWithSymbol(rec.total_amount)}
                </div>

                <AddTransactionModal
                  accounts={accounts}
                  onSuccess={onSuccess}
                  initialData={{
                    payee: rec.payee,
                    totalAmount: rec.total_amount,
                    isRecurring: true,
                    recurrenceInterval: rec.recurrence_interval,
                    accountId: rec.account_id,
                  }}
                >
                  <Button className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 shadow-glow-accent transition-all whitespace-nowrap">
                    {t("recurring.logItNow")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </AddTransactionModal>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
