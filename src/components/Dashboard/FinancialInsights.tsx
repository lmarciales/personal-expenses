import type { DashboardInsights } from "@/hooks/useDashboardData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FinancialInsightsProps {
  insights: DashboardInsights;
}

export function FinancialInsights({ insights }: FinancialInsightsProps) {
  const navigate = useNavigate();
  const { savingsRate, savingsRatePrev, savingsRateTrend, topGroup, momExpenseChange, momExpenseAbs } = insights;

  const savingsWentUp = savingsRate >= savingsRatePrev;
  const expenseWentUp = momExpenseChange > 0;
  const momBorderColor = expenseWentUp ? "border-amber-500" : "border-green-500";

  return (
    <div className="glass-card rounded-2xl p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex-1">
          Resumen financiero
        </h2>
        <button
          type="button"
          onClick={() => navigate("/analytics")}
          className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          Ver más →
        </button>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {/* Card 1: Tasa de ahorro */}
        <div className="rounded-xl border-l-4 border-green-500 bg-green-500/5 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tasa de ahorro</p>
          <div className="flex items-end gap-3">
            <span className="text-2xl font-black text-green-400 tabular-nums">{savingsRate.toFixed(1)}%</span>
            {/* Mini sparkline */}
            <div className="flex items-end gap-0.5 h-6 mb-0.5">
              {savingsRateTrend.map((val, idx) => {
                const isCurrentMonth = idx === savingsRateTrend.length - 1;
                const maxVal = Math.max(...savingsRateTrend.map(Math.abs), 1);
                const height = Math.max((Math.abs(val) / maxVal) * 100, 8);
                return (
                  <div
                    key={idx}
                    className="w-3 rounded-sm"
                    style={{
                      height: `${height}%`,
                      backgroundColor: isCurrentMonth ? "#4ade80" : "#6b7280",
                    }}
                  />
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {savingsWentUp ? "Subió" : "Bajó"} desde{" "}
            <span className="text-foreground/70">{savingsRatePrev.toFixed(1)}%</span> el mes pasado
          </p>
        </div>

        {/* Card 2: Mayor categoría del mes */}
        <div className="rounded-xl border-l-4 border-purple-500 bg-purple-500/5 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Mayor categoría del mes
          </p>
          {topGroup ? (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-base font-bold text-purple-400 truncate">{topGroup.name}</span>
                <span className="text-lg font-black text-foreground tabular-nums">
                  {formatCOPWithSymbol(topGroup.amount)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{topGroup.pctOfTotal.toFixed(1)}% del gasto total</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sin datos</p>
          )}
        </div>

        {/* Card 3: Mes a mes */}
        <div
          className={`rounded-xl border-l-4 ${momBorderColor} ${expenseWentUp ? "bg-amber-500/5" : "bg-green-500/5"} p-3`}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Mes a mes</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Gastos</span>
            {expenseWentUp ? (
              <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-400 shrink-0" />
            )}
            <span className={`text-lg font-black tabular-nums ${expenseWentUp ? "text-amber-400" : "text-green-400"}`}>
              {momExpenseChange > 0 ? "+" : ""}
              {momExpenseChange.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-foreground/70 tabular-nums">{formatCOPWithSymbol(momExpenseAbs[0])}</span>
            {" vs "}
            <span className="text-foreground/70 tabular-nums">{formatCOPWithSymbol(momExpenseAbs[1])}</span>
            {" mes anterior"}
          </p>
        </div>
      </div>
    </div>
  );
}
