import { formatCOPWithSymbol } from "@/lib/currency";
import { useTranslation } from "react-i18next";

interface SpendingTrendsProps {
  highestMonth: { name: string; value: number } | null;
  lowestMonth: { name: string; value: number } | null;
  monthOverMonthChange: number | null;
  savingsRate: number;
}

export function SpendingTrends({ highestMonth, lowestMonth, monthOverMonthChange, savingsRate }: SpendingTrendsProps) {
  const { t } = useTranslation("analytics");

  const cards = [
    {
      label: t("trends.highestMonth"),
      value: highestMonth ? `${highestMonth.name} — ${formatCOPWithSymbol(highestMonth.value)}` : t("trends.noData"),
      color: "text-foreground",
    },
    {
      label: t("trends.lowestMonth"),
      value: lowestMonth ? `${lowestMonth.name} — ${formatCOPWithSymbol(lowestMonth.value)}` : t("trends.noData"),
      color: "text-foreground",
    },
    {
      label: t("trends.monthOverMonth"),
      value:
        monthOverMonthChange !== null
          ? `${monthOverMonthChange >= 0 ? "↑" : "↓"} ${Math.abs(monthOverMonthChange)}%`
          : t("trends.notEnoughData"),
      color:
        monthOverMonthChange !== null
          ? monthOverMonthChange > 0
            ? "text-red-400"
            : "text-green-400"
          : "text-muted-foreground",
      sublabel: monthOverMonthChange !== null ? t("trends.vsPreviousMonth") : undefined,
    },
    {
      label: t("trends.savingsRate"),
      value: `${savingsRate.toFixed(1)}%`,
      color: savingsRate > 0 ? "text-green-400" : savingsRate < 0 ? "text-red-400" : "text-muted-foreground",
      sublabel: t("trends.savingsFormula"),
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">{t("trends.title")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="bg-surface-hover/30 rounded-xl p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
            <p className={`text-base font-bold mt-1 ${card.color}`}>{card.value}</p>
            {card.sublabel && <p className="text-[10px] text-muted-foreground mt-0.5">{card.sublabel}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
