import type { GroupedSpending as GroupedSpendingType } from "@/hooks/useDashboardData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GroupedSpendingProps {
  groupedSpending: GroupedSpendingType[];
  monthlyExpense: number;
  totalExpenseYTD: number;
}

const MAX_VISIBLE = 5;

export function GroupedSpending({
  groupedSpending,
  monthlyExpense: _monthlyExpense,
  totalExpenseYTD,
}: GroupedSpendingProps) {
  const { t, i18n } = useTranslation("dashboard");
  const now = new Date();
  const monthName = now.toLocaleDateString(i18n.language === "en" ? "en-US" : "es-CO", { month: "long" });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const visible = groupedSpending.slice(0, MAX_VISIBLE);
  const hiddenCount = groupedSpending.length - MAX_VISIBLE;
  const maxAmount = visible.length > 0 ? visible[0].amount : 0;

  return (
    <div className="glass-card rounded-2xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex-1">
          {t("grouped.title")}
          <span className="ml-1 text-foreground/60 normal-case font-normal">— {capitalizedMonth}</span>
        </h2>
        {totalExpenseYTD > 0 && (
          <span className="text-xs text-muted-foreground bg-surface-hover-strong px-2 py-0.5 rounded-full shrink-0">
            {t("grouped.yearLabel", { amount: formatCOPWithSymbol(totalExpenseYTD) })}
          </span>
        )}
      </div>

      {/* Group rows */}
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{t("grouped.empty")}</p>
      ) : (
        <div className="space-y-3">
          {visible.map((group) => {
            const barWidth = maxAmount > 0 ? (group.amount / maxAmount) * 100 : 0;
            return (
              <div key={group.groupId ?? group.groupName}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.groupColor }} />
                    <span className="text-sm text-foreground/80 truncate">{group.groupName}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground ml-2 shrink-0">
                    {formatCOPWithSymbol(group.amount)}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-hover-strong rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, backgroundColor: group.groupColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hiddenCount > 0 && (
        <button type="button" className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
          {t("grouped.moreGroups", { count: hiddenCount })}
        </button>
      )}
    </div>
  );
}
