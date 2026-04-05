import { Button } from "@/components/ui/button";
import type { AccountWithStats } from "@/hooks/useAccountsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { getProjectedBalance } from "@/lib/projectedBalance";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MaturedCdtsBannerProps {
  maturedCdts: AccountWithStats[];
  onViewDetails: (account: AccountWithStats) => void;
}

export function MaturedCdtsBanner({ maturedCdts, onViewDetails }: MaturedCdtsBannerProps) {
  const { t } = useTranslation("accounts");

  if (maturedCdts.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5 border border-amber-500/30 bg-amber-500/10">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 space-y-3">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t("cdt.bannerTitle")}</p>
          {maturedCdts.map((cdt) => (
            <div key={cdt.id} className="flex items-center justify-between gap-3 rounded-xl bg-background/50 p-3">
              <div>
                <p className="text-sm font-bold">{cdt.name}</p>
                <p className="text-xs text-muted-foreground">~{formatCOPWithSymbol(getProjectedBalance(cdt))}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                onClick={() => onViewDetails(cdt)}
              >
                {t("cdt.viewDetails")}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
