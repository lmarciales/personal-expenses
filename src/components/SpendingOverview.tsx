import { MoreVertical, PieChart } from "lucide-react";
import { Button } from "./ui/button";
import { formatCOPWithSymbol } from "@/lib/currency";

export interface CategorySpending {
  name: string;
  color: string | null;
  amount: number;
}

export interface SpendingOverviewProps {
  totalExpense: number;
  categorySpending?: CategorySpending[];
}

const DEFAULT_COLORS = [
  "#7c3aed", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
];

const SpendingOverview = ({ totalExpense, categorySpending = [] }: SpendingOverviewProps) => {
  const hasData = categorySpending.length > 0 && totalExpense > 0;

  return (
    <div className="glass-card rounded-2xl h-full flex flex-col p-6">
      <div className="flex flex-row items-start justify-between pb-4">
        <div>
          <h2 className="typo-section-label flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" /> Spending Overview
          </h2>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="typo-amount-lg">{formatCOPWithSymbol(totalExpense)}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover-strong">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      <div className={`mt-auto space-y-5 ${!hasData ? 'opacity-50' : ''}`}>
        <div>
          {!hasData ? (
            <div className="flex justify-between text-xs font-medium text-muted-foreground mb-3 px-1">
              <span className="italic">No category data</span>
            </div>
          ) : (
            <div className="flex justify-between text-xs font-medium text-muted-foreground mb-3 px-1">
              <span>{categorySpending.length} categories</span>
            </div>
          )}
          <div className="h-3 w-full bg-surface-overlay rounded-full overflow-hidden flex border border-subtle">
            {hasData && categorySpending.map((cat, idx) => {
              const pct = (cat.amount / totalExpense) * 100;
              const color = cat.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
              return (
                <div
                  key={cat.name}
                  className="h-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  title={`${cat.name}: ${formatCOPWithSymbol(cat.amount)}`}
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5 pt-2 max-h-[140px] overflow-y-auto">
          {hasData ? (
            categorySpending.map((cat, idx) => {
              const color = cat.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
              const pct = totalExpense > 0 ? ((cat.amount / totalExpense) * 100).toFixed(0) : 0;
              return (
                <div key={cat.name} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-surface-hover transition-colors">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-medium text-foreground truncate">{cat.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{pct}%</span>
                  </div>
                  <span className="font-semibold text-muted-foreground">{formatCOPWithSymbol(cat.amount)}</span>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-surface-hover transition-colors">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-surface-indicator mr-3" />
                <span className="font-medium text-foreground">Uncategorized</span>
              </div>
              <span className="font-semibold text-muted-foreground">{formatCOPWithSymbol(0)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpendingOverview;
