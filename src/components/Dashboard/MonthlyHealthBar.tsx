import { formatCOPWithSymbol } from "@/lib/currency";
import { TrendingDown, TrendingUp } from "lucide-react";

interface MonthlyHealthBarProps {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  totalBalance: number;
  momChange: number;
  prevMonthExpense: number;
  savingsRate: number;
  accountCount: number;
}

export function MonthlyHealthBar({
  monthlyIncome,
  monthlyExpense,
  monthlyNet,
  totalBalance,
  momChange,
  prevMonthExpense,
  savingsRate,
  accountCount,
}: MonthlyHealthBarProps) {
  const momChangeFixed = Number.parseFloat(momChange.toFixed(1));
  const isExpenseUp = momChangeFixed > 0;
  const isExpenseDown = momChangeFixed < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Ingresos del mes */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Ingresos del mes</p>
        <p className="text-xl font-bold text-primary tabular-nums">{formatCOPWithSymbol(monthlyIncome)}</p>
      </div>

      {/* Card 2: Gastos del mes */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Gastos del mes</p>
        <p className="text-xl font-bold text-foreground tabular-nums">{formatCOPWithSymbol(monthlyExpense)}</p>
        <div className="flex items-center gap-1 mt-1">
          {isExpenseUp && <TrendingUp className="w-3 h-3 text-red-400 shrink-0" />}
          {isExpenseDown && <TrendingDown className="w-3 h-3 text-primary shrink-0" />}
          <span className="text-xs text-muted-foreground">
            vs {formatCOPWithSymbol(prevMonthExpense)}{" "}
            {momChangeFixed !== 0 && (
              <span className={isExpenseUp ? "text-red-400" : "text-primary"}>
                {isExpenseUp ? "+" : ""}
                {momChangeFixed}%
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Card 3: Neto del mes */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Neto del mes</p>
        <p className={`text-xl font-bold tabular-nums ${monthlyNet >= 0 ? "text-primary" : "text-red-400"}`}>
          {formatCOPWithSymbol(monthlyNet)}
        </p>
        {monthlyIncome > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Tasa de ahorro:{" "}
            <span className={savingsRate >= 0 ? "text-primary" : "text-red-400"}>{savingsRate.toFixed(1)}%</span>
          </p>
        )}
      </div>

      {/* Card 4: Balance total */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Balance total</p>
        <p className="text-xl font-bold text-foreground tabular-nums">{formatCOPWithSymbol(totalBalance)}</p>
        <p className="text-xs text-muted-foreground mt-1">{accountCount} cuentas</p>
      </div>
    </div>
  );
}
