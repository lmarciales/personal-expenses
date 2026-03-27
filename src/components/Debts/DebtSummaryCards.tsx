import { formatCOPWithSymbol } from "@/lib/currency";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DebtSummaryCardsProps {
  totalIOwe: number;
  totalOwedToMe: number;
}

export const DebtSummaryCards = ({ totalIOwe, totalOwedToMe }: DebtSummaryCardsProps) => {
  const { t } = useTranslation("debts");
  const netPosition = totalOwedToMe - totalIOwe;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-danger" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("summary.iOwe")}
          </span>
        </div>
        <p className="typo-amount-md text-danger">{formatCOPWithSymbol(totalIOwe)}</p>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("summary.owedToMe")}
          </span>
        </div>
        <p className="typo-amount-md text-success">{formatCOPWithSymbol(totalOwedToMe)}</p>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("summary.netPosition")}
          </span>
        </div>
        <p className={`typo-amount-md ${netPosition >= 0 ? "text-success" : "text-danger"}`}>
          {netPosition >= 0 ? "+" : ""}
          {formatCOPWithSymbol(Math.abs(netPosition))}
        </p>
      </div>
    </div>
  );
};
