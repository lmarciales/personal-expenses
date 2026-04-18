import { AddTransactionModal } from "@/components/Transactions/AddTransactionModal";
import type { DashboardAlert } from "@/hooks/useDashboardAlerts";
import { formatCOPWithSymbol } from "@/lib/currency";
import { parseLocalDate } from "@/lib/dates";
import { format } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { es } from "date-fns/locale/es";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock, Landmark, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AlertsSectionProps {
  alerts: DashboardAlert[];
  accounts: { id: string; name: string; balance: number; type: string }[];
  onSuccess: () => void;
  onCancelRecurrence?: (payee: string) => Promise<void>;
}

function getAlertIcon(iconName: string) {
  switch (iconName) {
    case "clock":
      return <Clock className="w-4 h-4" />;
    case "arrow-up":
      return <ArrowUpRight className="w-4 h-4" />;
    case "arrow-down":
      return <ArrowDownLeft className="w-4 h-4" />;
    case "landmark":
      return <Landmark className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
}

export function AlertsSection({ alerts, accounts, onSuccess, onCancelRecurrence }: AlertsSectionProps) {
  const { t, i18n } = useTranslation("dashboard");
  const navigate = useNavigate();
  const [logBillAlert, setLogBillAlert] = useState<DashboardAlert | null>(null);
  const [cancellingPayee, setCancellingPayee] = useState<string | null>(null);

  const dateLocale = i18n.language === "en" ? enUS : es;

  const resolveText = useCallback(
    (rawKey: string | undefined, params: Record<string, string | number> | undefined, fallback: string): string => {
      if (!rawKey) return fallback;
      // Date params are ISO strings; translations expect a human-readable date.
      const resolvedParams = params
        ? Object.fromEntries(
            Object.entries(params).map(([k, v]) => {
              if (k === "date" && typeof v === "string") {
                return [k, format(parseLocalDate(v), "MMM d, yyyy", { locale: dateLocale })];
              }
              return [k, v];
            }),
          )
        : undefined;
      return t(rawKey, resolvedParams) as string;
    },
    [t, dateLocale],
  );

  const typeLabels = useMemo<Record<DashboardAlert["type"], string>>(
    () => ({
      recurring_bill: t("alerts.typeLabels.recurring_bill"),
      spending_spike: t("alerts.typeLabels.spending_spike"),
      debt_pending: t("alerts.typeLabels.debt_pending"),
      cdt_maturing: t("alerts.typeLabels.cdt_maturing"),
    }),
    [t],
  );

  const labelFor = (alert: DashboardAlert) =>
    alert.type === "recurring_bill" && alert.status === "upcoming"
      ? t("alerts.typeLabels.recurring_upcoming")
      : typeLabels[alert.type];

  if (alerts.length === 0) return null;

  const handleAlertClick = (alert: DashboardAlert) => {
    if (alert.type === "recurring_bill") {
      setLogBillAlert(alert);
    } else if (alert.link) {
      navigate(alert.link);
    }
  };

  const handleCancelRecurrence = async (alert: DashboardAlert) => {
    if (!onCancelRecurrence || !alert.actionData) return;
    const payee = alert.actionData.payee;
    const confirmed = window.confirm(t("recurring.cancelConfirm", { payee }));
    if (!confirmed) return;

    try {
      setCancellingPayee(payee);
      await onCancelRecurrence(payee);
      toast.success(t("recurring.cancelledToast", { payee }));
      onSuccess();
    } catch (err) {
      console.error("Failed to cancel recurrence", err);
      toast.error(t("recurring.cancelError"));
    } finally {
      setCancellingPayee(null);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-primary/20 bg-primary/5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("alerts.sectionTitle")}
        </h2>
        <span className="ml-auto bg-amber-400/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
      </div>

      {/* Alert cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="relative group">
            <button
              type="button"
              className="w-full text-left glass-card rounded-xl p-3 hover:bg-surface-hover-strong transition-colors cursor-pointer"
              onClick={() => handleAlertClick(alert)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ color: alert.color }} className="shrink-0">
                    {getAlertIcon(alert.icon)}
                  </span>
                  <span
                    style={{ color: alert.color }}
                    className="text-xs font-semibold uppercase tracking-wider truncate"
                  >
                    {labelFor(alert)}
                  </span>
                </div>
                {alert.amount !== undefined && (
                  <span style={{ color: alert.color }} className="text-sm font-bold tabular-nums shrink-0">
                    {formatCOPWithSymbol(alert.amount)}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground mt-1.5 truncate pr-6">
                {resolveText(alert.titleKey, alert.titleParams, alert.title)}
              </p>
              {(alert.descriptionKey || alert.description) && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {resolveText(alert.descriptionKey, alert.descriptionParams, alert.description)}
                </p>
              )}
            </button>
            {alert.type === "recurring_bill" && onCancelRecurrence && (
              <button
                type="button"
                onClick={() => handleCancelRecurrence(alert)}
                disabled={cancellingPayee === alert.actionData?.payee}
                title={t("recurring.cancel")}
                aria-label={t("recurring.cancel")}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-overlay/80 hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* AddTransactionModal for recurring_bill alerts */}
      {logBillAlert?.actionData && (
        <AddTransactionModal
          accounts={accounts}
          onSuccess={() => {
            onSuccess();
            setLogBillAlert(null);
          }}
          open={true}
          onOpenChange={(open) => {
            if (!open) setLogBillAlert(null);
          }}
          initialData={{
            payee: logBillAlert.actionData.payee,
            totalAmount: logBillAlert.actionData.totalAmount,
            accountId: logBillAlert.actionData.accountId ?? "",
            isRecurring: logBillAlert.actionData.isRecurring,
            recurrenceValue: logBillAlert.actionData.recurrenceValue,
            recurrenceUnit: logBillAlert.actionData.recurrenceUnit as any,
            categoryIds: logBillAlert.actionData.categoryIds,
            splits:
              logBillAlert.actionData.splits.length > 0
                ? logBillAlert.actionData.splits.map((s) => ({
                    amount: s.amount,
                    assigned_to: s.assigned_to,
                    status: s.status as any,
                  }))
                : undefined,
          }}
        />
      )}
    </div>
  );
}
