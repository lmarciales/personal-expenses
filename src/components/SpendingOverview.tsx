import { MoreVertical, PieChart } from "lucide-react";
import { Button } from "./ui/button";

export interface SpendingOverviewProps {
  totalExpense: number;
}

const SpendingOverview = ({ totalExpense }: SpendingOverviewProps) => {
  return (
    <div className="glass-card rounded-2xl h-full flex flex-col p-6">
      <div className="flex flex-row items-start justify-between pb-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" /> Spending Overview
          </h2>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tighter">${totalExpense.toFixed(2)}</span>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md border border-primary/10 opacity-50">0%</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover-strong">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-auto space-y-5 opacity-50">
        <div>
          <div className="flex justify-between text-xs font-medium text-muted-foreground mb-3 px-1">
            <span className="italic">No category data</span>
          </div>
          <div className="h-3 w-full bg-surface-overlay rounded-full overflow-hidden flex border border-subtle">
            {/* Empty Bar */}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-surface-hover transition-colors">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-surface-indicator mr-3" />
              <span className="font-medium text-foreground">Uncategorized</span>
            </div>
            <span className="font-semibold text-muted-foreground">$0.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpendingOverview;
