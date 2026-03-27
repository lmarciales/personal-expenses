import { formatCOPWithSymbol } from "@/lib/currency";
import { useTranslation } from "react-i18next";

interface KpiCardsProps {
  totalExpenses: number;
  totalIncome: number;
  netCashFlow: number;
  avgMonthlySpend: number;
  prevYearTotalExpenses: number;
  prevYearTotalIncome: number;
  monthsWithData: number;
  hasPrevYearData: boolean;
}

export function KpiCards({
  totalExpenses,
  totalIncome,
  netCashFlow,
  avgMonthlySpend,
  prevYearTotalExpenses,
  prevYearTotalIncome,
  monthsWithData,
  hasPrevYearData,
}: KpiCardsProps) {
  const { t } = useTranslation("analytics");

  function yoyChange(current: number, previous: number): string {
    if (previous === 0) return t("kpi.firstYearOfData");
    const pct = Math.round(((current - previous) / previous) * 100);
    const arrow = pct >= 0 ? "↑" : "↓";
    return `${arrow} ${Math.abs(pct)}% ${t("kpi.vsLastYear")}`;
  }

  const cards = [
    {
      label: t("kpi.totalExpenses"),
      value: formatCOPWithSymbol(totalExpenses),
      subtext: hasPrevYearData ? yoyChange(totalExpenses, prevYearTotalExpenses) : t("kpi.firstYearOfData"),
      subtextColor: hasPrevYearData && totalExpenses > prevYearTotalExpenses ? "text-red-400" : "text-green-400",
    },
    {
      label: t("kpi.totalIncome"),
      value: formatCOPWithSymbol(totalIncome),
      subtext: hasPrevYearData ? yoyChange(totalIncome, prevYearTotalIncome) : t("kpi.firstYearOfData"),
      subtextColor: hasPrevYearData && totalIncome >= prevYearTotalIncome ? "text-green-400" : "text-red-400",
    },
    {
      label: t("kpi.netCashFlow"),
      value: `${netCashFlow >= 0 ? "+ " : "- "}${formatCOPWithSymbol(Math.abs(netCashFlow))}`,
      subtext: netCashFlow >= 0 ? t("kpi.positiveCashFlow") : t("kpi.negativeCashFlow"),
      subtextColor: netCashFlow >= 0 ? "text-green-400" : "text-red-400",
      valueColor: netCashFlow >= 0 ? "text-green-400" : "text-red-400",
    },
    {
      label: t("kpi.avgMonthlySpend"),
      value: formatCOPWithSymbol(avgMonthlySpend),
      subtext: t("kpi.basedOnMonths", { count: monthsWithData }),
      subtextColor: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="glass-card rounded-xl p-4 border border-glass">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{card.label}</p>
          <p className={`text-lg font-bold font-mono tracking-tight mt-1 ${card.valueColor || "text-foreground"}`}>
            {card.value}
          </p>
          <p className={`text-[11px] mt-1 ${card.subtextColor}`}>{card.subtext}</p>
        </div>
      ))}
    </div>
  );
}
