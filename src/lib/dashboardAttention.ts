import type { DashboardAlert } from "@/hooks/useDashboardAlerts";

export type AttentionAlertGroup = "recurring" | "debt_owed" | "debt_receivable" | "cdt";

export type RecurringBillTone = "overdue" | "dueSoon" | "near" | "medium" | "far";

export interface RecurringBillAlertView {
  alert: DashboardAlert;
  daysUntil: number;
  tone: RecurringBillTone;
}

export interface AttentionSummaryTile {
  group: AttentionAlertGroup;
  count: number;
  amount: number;
  nearestDaysUntil?: number;
}

export interface AttentionRadarViewModel {
  recurringBills: RecurringBillAlertView[];
  debtOwed: DashboardAlert | null;
  debtReceivable: DashboardAlert | null;
  cdts: DashboardAlert[];
  pinnedItems: DashboardAlert[];
  summaryTiles: AttentionSummaryTile[];
  totalCount: number;
  hasRecurringBills: boolean;
  hasPinnedItems: boolean;
}

export interface RecurringBillToneStyles {
  accent: string;
  soft: string;
  border: string;
  text: string;
}

const GROUP_ORDER: AttentionAlertGroup[] = ["recurring", "debt_owed", "debt_receivable", "cdt"];

const TONE_STYLES: Record<RecurringBillTone, RecurringBillToneStyles> = {
  overdue: {
    accent: "#f59e0b",
    soft: "rgba(245, 158, 11, 0.16)",
    border: "rgba(245, 158, 11, 0.36)",
    text: "#fbbf24",
  },
  dueSoon: {
    accent: "#ffd166",
    soft: "rgba(255, 209, 102, 0.16)",
    border: "rgba(255, 209, 102, 0.34)",
    text: "#fde68a",
  },
  near: {
    accent: "#b7f34f",
    soft: "rgba(183, 243, 79, 0.14)",
    border: "rgba(183, 243, 79, 0.3)",
    text: "#bef264",
  },
  medium: {
    accent: "#56e3d2",
    soft: "rgba(86, 227, 210, 0.13)",
    border: "rgba(86, 227, 210, 0.28)",
    text: "#5eead4",
  },
  far: {
    accent: "#47d6ff",
    soft: "rgba(71, 214, 255, 0.12)",
    border: "rgba(71, 214, 255, 0.26)",
    text: "#7dd3fc",
  },
};

export function getRecurringBillTone(daysUntil: number | undefined): RecurringBillTone {
  if (daysUntil === undefined || Number.isNaN(daysUntil)) return "far";
  if (daysUntil <= 0) return "overdue";
  if (daysUntil <= 1) return "dueSoon";
  if (daysUntil <= 3) return "near";
  if (daysUntil <= 5) return "medium";
  return "far";
}

export function getRecurringBillToneStyles(tone: RecurringBillTone): RecurringBillToneStyles {
  return TONE_STYLES[tone];
}

export function buildAttentionRadarViewModel(alerts: DashboardAlert[]): AttentionRadarViewModel {
  const recurringBills = alerts
    .filter(isRecurringAlert)
    .map((alert) => ({
      alert,
      daysUntil: getSortableDaysUntil(alert),
      tone: getRecurringBillTone(alert.daysUntil),
    }))
    .sort(compareRecurringBills);

  const debtOwed = alerts.find((alert) => getAlertGroup(alert) === "debt_owed") ?? null;
  const debtReceivable = alerts.find((alert) => getAlertGroup(alert) === "debt_receivable") ?? null;
  const cdts = alerts.filter((alert) => getAlertGroup(alert) === "cdt").sort(compareCdtAlerts);
  const pinnedItems = [debtOwed, debtReceivable, ...cdts].filter((alert): alert is DashboardAlert => Boolean(alert));

  const summaryTiles = GROUP_ORDER.flatMap((group) =>
    buildSummaryTile(group, recurringBills, debtOwed, debtReceivable, cdts),
  );

  return {
    recurringBills,
    debtOwed,
    debtReceivable,
    cdts,
    pinnedItems,
    summaryTiles,
    totalCount: alerts.length,
    hasRecurringBills: recurringBills.length > 0,
    hasPinnedItems: pinnedItems.length > 0,
  };
}

function isRecurringAlert(alert: DashboardAlert) {
  return getAlertGroup(alert) === "recurring";
}

function getAlertGroup(alert: DashboardAlert): AttentionAlertGroup | null {
  if (alert.group) return alert.group;
  if (alert.type === "recurring_bill") return "recurring";
  if (alert.type === "cdt_maturing") return "cdt";
  return null;
}

function getSortableDaysUntil(alert: DashboardAlert) {
  return alert.daysUntil ?? Number.POSITIVE_INFINITY;
}

function compareRecurringBills(a: RecurringBillAlertView, b: RecurringBillAlertView) {
  if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
  if (a.alert.amount !== b.alert.amount) return b.alert.amount - a.alert.amount;
  return getAlertTitle(a.alert).localeCompare(getAlertTitle(b.alert));
}

function compareCdtAlerts(a: DashboardAlert, b: DashboardAlert) {
  const aDays = getSortableDaysUntil(a);
  const bDays = getSortableDaysUntil(b);
  if (aDays !== bDays) return aDays - bDays;
  if (a.amount !== b.amount) return b.amount - a.amount;
  return getAlertTitle(a).localeCompare(getAlertTitle(b));
}

function buildSummaryTile(
  group: AttentionAlertGroup,
  recurringBills: RecurringBillAlertView[],
  debtOwed: DashboardAlert | null,
  debtReceivable: DashboardAlert | null,
  cdts: DashboardAlert[],
): AttentionSummaryTile[] {
  if (group === "recurring" && recurringBills.length > 0) {
    return [
      {
        group,
        count: recurringBills.length,
        amount: recurringBills.reduce((total, item) => total + item.alert.amount, 0),
        nearestDaysUntil: recurringBills[0]?.alert.daysUntil,
      },
    ];
  }

  if (group === "debt_owed" && debtOwed) {
    return [{ group, count: 1, amount: debtOwed.amount }];
  }

  if (group === "debt_receivable" && debtReceivable) {
    return [{ group, count: 1, amount: debtReceivable.amount }];
  }

  if (group === "cdt" && cdts.length > 0) {
    return [
      {
        group,
        count: cdts.length,
        amount: cdts.reduce((total, cdt) => total + cdt.amount, 0),
        nearestDaysUntil: cdts[0]?.daysUntil,
      },
    ];
  }

  return [];
}

function getAlertTitle(alert: DashboardAlert) {
  return alert.title || alert.titleKey || alert.id;
}
