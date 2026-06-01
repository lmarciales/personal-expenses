import { AddTransactionModal } from "@/components/Transactions/AddTransactionModal";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DashboardAlert } from "@/hooks/useDashboardAlerts";
import { formatCOPWithSymbol } from "@/lib/currency";
import {
  type AttentionAlertGroup,
  type AttentionSummaryTile,
  type RecurringBillAlertView,
  buildAttentionRadarViewModel,
  getRecurringBillToneStyles,
} from "@/lib/dashboardAttention";
import { parseLocalDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { es } from "date-fns/locale/es";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock, Landmark } from "lucide-react";
import { type CSSProperties, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AlertsSectionProps {
  alerts: DashboardAlert[];
  accounts: { id: string; name: string; balance: number; type: string }[];
  onSuccess: () => void;
  onCancelRecurrence?: (payee: string) => Promise<void>;
}

type RecurrenceUnit = "Days" | "Weeks" | "Months" | "Years";
type SplitStatus = "Settled" | "Pending Receival" | "Pending Payment" | "Ignored";

const RECURRENCE_UNITS: RecurrenceUnit[] = ["Days", "Weeks", "Months", "Years"];
const SPLIT_STATUSES: SplitStatus[] = ["Settled", "Pending Receival", "Pending Payment", "Ignored"];
const COMPACT_RECURRING_COUNT = 3;
const COMPACT_PINNED_COUNT = 2;

function toRecurrenceUnit(value: string): RecurrenceUnit {
  return RECURRENCE_UNITS.includes(value as RecurrenceUnit) ? (value as RecurrenceUnit) : "Months";
}

function toSplitStatus(value: string): SplitStatus {
  return SPLIT_STATUSES.includes(value as SplitStatus) ? (value as SplitStatus) : "Settled";
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
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const confirm = useConfirmDialog();
  const navigate = useNavigate();
  const [logBillAlert, setLogBillAlert] = useState<DashboardAlert | null>(null);
  const [cancellingPayee, setCancellingPayee] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const dateLocale = i18n.language === "en" ? enUS : es;
  const radar = useMemo(() => buildAttentionRadarViewModel(alerts), [alerts]);

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

  if (radar.totalCount === 0) return null;

  const handleAlertPrimaryAction = (alert: DashboardAlert) => {
    if (alert.type === "recurring_bill") {
      setLogBillAlert(alert);
    } else if (alert.link) {
      navigate(alert.link);
    }
  };

  const handleCancelRecurrence = async (alert: DashboardAlert) => {
    if (!onCancelRecurrence || !alert.actionData) return;
    const payee = alert.actionData.payee;
    const confirmed = await confirm({
      title: t("common:confirm.cancelRecurrenceTitle"),
      description: t("recurring.cancelConfirm", { payee }),
      confirmLabel: t("common:confirm.cancelRecurrenceAction"),
      variant: "destructive",
    });
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

  const visibleRecurringBills = expanded
    ? radar.recurringBills
    : radar.recurringBills.slice(0, COMPACT_RECURRING_COUNT);
  const visiblePinnedItems = expanded ? radar.pinnedItems : radar.pinnedItems.slice(0, COMPACT_PINNED_COUNT);
  const hiddenCount =
    Math.max(0, radar.recurringBills.length - visibleRecurringBills.length) +
    Math.max(0, radar.pinnedItems.length - visiblePinnedItems.length);
  const hasTwoLanes = radar.hasRecurringBills && radar.hasPinnedItems;

  return (
    <div className="glass-card rounded-2xl p-4 border border-amber-400/15 bg-amber-400/[0.03]">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("alerts.sectionTitle")}
        </h2>
        <span className="ml-auto bg-amber-400/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
          {radar.totalCount}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        {radar.summaryTiles.map((tile) => (
          <SummaryTile key={tile.group} tile={tile} t={t} />
        ))}
      </div>

      <div
        className={cn("grid grid-cols-1 gap-3", hasTwoLanes && "lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.85fr)]")}
      >
        {radar.hasRecurringBills && (
          <section className="glass-card rounded-xl p-3">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("alerts.radar.recurringTitle")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("alerts.radar.sortedByDue")}</p>
              </div>
              {radar.recurringBills.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCOPWithSymbol(radar.recurringBills.reduce((sum, item) => sum + item.alert.amount, 0))}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {visibleRecurringBills.map((item) => (
                <RecurringBillRow
                  key={item.alert.id}
                  item={item}
                  label={labelFor(item.alert)}
                  title={resolveText(item.alert.titleKey, item.alert.titleParams, item.alert.title)}
                  description={resolveText(
                    item.alert.descriptionKey,
                    item.alert.descriptionParams,
                    item.alert.description,
                  )}
                  cancelling={cancellingPayee === item.alert.actionData?.payee}
                  onRegister={() => handleAlertPrimaryAction(item.alert)}
                  onCancel={() => handleCancelRecurrence(item.alert)}
                  canCancel={Boolean(onCancelRecurrence)}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        {radar.hasPinnedItems && (
          <section className="glass-card rounded-xl p-3">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("alerts.radar.pinnedTitle")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("alerts.radar.alwaysVisible")}</p>
              </div>
            </div>

            <div className="space-y-2">
              {visiblePinnedItems.map((alert) => (
                <PinnedAlertCard
                  key={alert.id}
                  alert={alert}
                  label={labelFor(alert)}
                  title={resolveText(alert.titleKey, alert.titleParams, alert.title)}
                  description={resolveText(alert.descriptionKey, alert.descriptionParams, alert.description)}
                  onClick={() => handleAlertPrimaryAction(alert)}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {hiddenCount > 0 || expanded ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="text-xs font-medium text-primary hover:underline focus-ring rounded-md px-2 py-1"
          >
            {expanded ? t("alerts.radar.actions.showLess") : t("alerts.radar.actions.showAll", { count: hiddenCount })}
          </button>
        </div>
      ) : null}

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
            recurrenceUnit: toRecurrenceUnit(logBillAlert.actionData.recurrenceUnit),
            categoryIds: logBillAlert.actionData.categoryIds,
            splits:
              logBillAlert.actionData.splits.length > 0
                ? logBillAlert.actionData.splits.map((s) => ({
                    amount: s.amount,
                    assigned_to: s.assigned_to,
                    status: toSplitStatus(s.status),
                  }))
                : undefined,
          }}
        />
      )}
    </div>
  );
}

function SummaryTile({
  tile,
  t,
}: {
  tile: AttentionSummaryTile;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const config = getSummaryConfig(tile.group);
  const Icon = config.icon;

  return (
    <div className="rounded-xl border bg-surface/40 p-3 min-h-[76px]" style={{ borderColor: config.border }}>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: config.color }} />
        <span className="text-[0.65rem] font-bold uppercase tracking-wider truncate" style={{ color: config.color }}>
          {t(`alerts.radar.summary.${config.key}`)}
        </span>
      </div>
      <p className="text-sm font-bold text-foreground tabular-nums mt-2">
        {tile.group === "recurring" || tile.group === "cdt" ? tile.count : formatCOPWithSymbol(tile.amount)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">{getSummaryDescription(tile, t)}</p>
    </div>
  );
}

function RecurringBillRow({
  item,
  label,
  title,
  description,
  cancelling,
  canCancel,
  onRegister,
  onCancel,
  t,
}: {
  item: RecurringBillAlertView;
  label: string;
  title: string;
  description: string;
  cancelling: boolean;
  canCancel: boolean;
  onRegister: () => void;
  onCancel: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const toneStyles = getRecurringBillToneStyles(item.tone);
  const style = {
    "--bill-accent": toneStyles.accent,
    "--bill-soft": toneStyles.soft,
    "--bill-border": toneStyles.border,
    "--bill-text": toneStyles.text,
  } as CSSProperties;

  return (
    <div
      className="grid grid-cols-[5px_minmax(0,1fr)] sm:grid-cols-[5px_minmax(0,1fr)_auto_auto] gap-2 sm:gap-3 items-center rounded-xl border bg-[linear-gradient(90deg,var(--bill-soft),transparent_48%)] bg-surface/60 pr-3 py-2 overflow-hidden"
      style={{ ...style, borderColor: toneStyles.border }}
    >
      <span className="h-full min-h-12 w-[5px] rounded-r-full bg-[var(--bill-accent)]" />
      <div className="min-w-0 py-1">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 shrink-0 text-[var(--bill-text)]" />
          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--bill-text)] truncate">
            {label}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground truncate mt-1">{title}</p>
        {description && <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>}
      </div>
      <span className="text-sm font-bold tabular-nums text-foreground sm:justify-self-end ml-3 sm:ml-0">
        {formatCOPWithSymbol(item.alert.amount)}
      </span>
      <div className="col-span-2 sm:col-span-1 flex flex-wrap justify-end gap-2 ml-3 sm:ml-0">
        <button
          type="button"
          onClick={onRegister}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-background bg-[var(--bill-accent)] hover:opacity-90 focus-ring"
        >
          {t("alerts.radar.actions.register")}
        </button>
        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border hover:text-destructive hover:border-destructive/50 focus-ring disabled:opacity-50"
          >
            {t("alerts.radar.actions.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

function PinnedAlertCard({
  alert,
  label,
  title,
  description,
  onClick,
  t,
}: {
  alert: DashboardAlert;
  label: string;
  title: string;
  description: string;
  onClick: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const config = getPinnedConfig(alert);
  const actionLabel =
    alert.group === "cdt" ? t("alerts.radar.actions.viewAccounts") : t("alerts.radar.actions.viewDebts");

  return (
    <div
      className="rounded-xl border-l-4 border bg-surface/50 p-3"
      style={{ borderColor: config.border, borderLeftColor: config.color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: config.color }} className="shrink-0">
            {getAlertIcon(alert.icon)}
          </span>
          <span style={{ color: config.color }} className="text-[0.68rem] font-bold uppercase tracking-wider truncate">
            {label}
          </span>
        </div>
        <span style={{ color: config.color }} className="text-sm font-bold tabular-nums shrink-0">
          {formatCOPWithSymbol(alert.amount)}
        </span>
      </div>
      <p className="text-sm font-semibold text-foreground mt-2 truncate">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClick}
          className="rounded-full px-3 py-1.5 text-xs font-semibold border focus-ring hover:bg-surface-hover-strong"
          style={{ color: config.color, borderColor: config.border }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function getSummaryConfig(group: AttentionAlertGroup) {
  switch (group) {
    case "recurring":
      return { key: "recurring", icon: Clock, color: "#47d6ff", border: "rgba(71, 214, 255, 0.28)" };
    case "debt_owed":
      return { key: "debtOwed", icon: ArrowUpRight, color: "#ef4444", border: "rgba(239, 68, 68, 0.32)" };
    case "debt_receivable":
      return { key: "debtReceivable", icon: ArrowDownLeft, color: "#2dd4bf", border: "rgba(45, 212, 191, 0.3)" };
    case "cdt":
      return { key: "cdt", icon: Landmark, color: "#a855f7", border: "rgba(168, 85, 247, 0.32)" };
  }
}

function getPinnedConfig(alert: DashboardAlert) {
  if (alert.group === "debt_owed") return { color: "#ef4444", border: "rgba(239, 68, 68, 0.32)" };
  if (alert.group === "debt_receivable") return { color: "#2dd4bf", border: "rgba(45, 212, 191, 0.3)" };
  return { color: "#a855f7", border: "rgba(168, 85, 247, 0.32)" };
}

function getSummaryDescription(
  tile: AttentionSummaryTile,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (tile.group === "recurring") {
    if (tile.nearestDaysUntil === undefined) return t("alerts.radar.summary.items", { count: tile.count });
    if (tile.nearestDaysUntil < 0) return t("alerts.radar.summary.overdue");
    if (tile.nearestDaysUntil === 0) return t("alerts.radar.summary.dueToday");
    return t("alerts.radar.summary.nextDue", { count: tile.nearestDaysUntil });
  }

  if (tile.group === "cdt") {
    if (tile.nearestDaysUntil === undefined) return t("alerts.radar.summary.items", { count: tile.count });
    if (tile.nearestDaysUntil < 0) return t("alerts.radar.summary.overdue");
    if (tile.nearestDaysUntil === 0) return t("alerts.radar.summary.dueToday");
    return t("alerts.radar.summary.nextDue", { count: tile.nearestDaysUntil });
  }

  return t("alerts.radar.summary.items", { count: tile.count });
}
