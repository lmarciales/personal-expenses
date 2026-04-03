import { AddTransactionModal } from "@/components/Transactions/AddTransactionModal";
import type { DashboardAlert } from "@/hooks/useDashboardAlerts";
import { formatCOPWithSymbol } from "@/lib/currency";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock, Landmark } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface AlertsSectionProps {
  alerts: DashboardAlert[];
  accounts: { id: string; name: string; balance: number; type: string }[];
  onSuccess: () => void;
}

const TYPE_LABELS: Record<DashboardAlert["type"], string> = {
  recurring_bill: "Pago recurrente",
  spending_spike: "Gasto elevado",
  debt_pending: "Deuda",
  cdt_maturing: "CDT",
};

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

export function AlertsSection({ alerts, accounts, onSuccess }: AlertsSectionProps) {
  const navigate = useNavigate();
  const [logBillAlert, setLogBillAlert] = useState<DashboardAlert | null>(null);

  if (alerts.length === 0) return null;

  const handleAlertClick = (alert: DashboardAlert) => {
    if (alert.type === "recurring_bill") {
      setLogBillAlert(alert);
    } else if (alert.link) {
      navigate(alert.link);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-primary/20 bg-primary/5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Requiere atención</h2>
        <span className="ml-auto bg-amber-400/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
      </div>

      {/* Alert cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {alerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            className="text-left glass-card rounded-xl p-3 hover:bg-surface-hover-strong transition-colors cursor-pointer"
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
                  {TYPE_LABELS[alert.type]}
                </span>
              </div>
              {alert.amount !== undefined && (
                <span style={{ color: alert.color }} className="text-sm font-bold tabular-nums shrink-0">
                  {formatCOPWithSymbol(alert.amount)}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground mt-1.5 truncate">{alert.title}</p>
            {alert.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</p>
            )}
          </button>
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
