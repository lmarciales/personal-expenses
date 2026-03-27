import { useMonthDetail } from "@/hooks/useMonthDetail";
import { formatCOPWithSymbol } from "@/lib/currency";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

interface MonthDetailPanelProps {
  year: number;
  month: number; // 1-12
  onClose: () => void;
}

export function MonthDetailPanel({ year, month, onClose }: MonthDetailPanelProps) {
  const { t } = useTranslation(["analytics", "common"]);
  const { topTransactions, totalExpenses, totalIncome, netFlow, isLoading } = useMonthDetail(year, month);

  const monthName = t(`common:months.${MONTH_KEYS[month - 1]}`);
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return (
    <div className="glass-card rounded-2xl p-6 border border-primary/15 bg-primary/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          📅 {monthName} {year} — {t("analytics:monthDetail.detail")}
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground bg-surface-hover/50 hover:bg-surface-hover-strong px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" /> {t("common:actions.close")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-sm text-muted-foreground">{t("common:loading")}</div>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-surface-hover/30 rounded-xl">
              <p className="text-[11px] text-muted-foreground">{t("analytics:monthDetail.expenses")}</p>
              <p className="text-sm font-bold font-mono text-red-400 mt-1">{formatCOPWithSymbol(totalExpenses)}</p>
            </div>
            <div className="text-center p-3 bg-surface-hover/30 rounded-xl">
              <p className="text-[11px] text-muted-foreground">{t("analytics:monthDetail.income")}</p>
              <p className="text-sm font-bold font-mono text-green-400 mt-1">{formatCOPWithSymbol(totalIncome)}</p>
            </div>
            <div className="text-center p-3 bg-surface-hover/30 rounded-xl">
              <p className="text-[11px] text-muted-foreground">{t("analytics:monthDetail.netFlow")}</p>
              <p className={`text-sm font-bold font-mono mt-1 ${netFlow >= 0 ? "text-green-400" : "text-red-400"}`}>
                {netFlow >= 0 ? "+ " : "- "}
                {formatCOPWithSymbol(Math.abs(netFlow))}
              </p>
            </div>
          </div>

          {/* Top transactions */}
          {topTransactions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">{t("analytics:monthDetail.topTransactions")}</p>
              <div className="space-y-0">
                {topTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-2 border-b border-subtle last:border-0"
                  >
                    <span className="text-xs text-muted-foreground">{txn.payee}</span>
                    <span
                      className={`text-xs font-mono font-medium ${txn.type === "income" ? "text-green-400" : "text-foreground"}`}
                    >
                      {formatCOPWithSymbol(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-3">
                <Link
                  to={`/transactions?startDate=${startDate}&endDate=${endDate}`}
                  className="text-primary text-[11px] font-medium hover:underline"
                >
                  {t("analytics:monthDetail.viewAllTransactions", { month: monthName })}
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
