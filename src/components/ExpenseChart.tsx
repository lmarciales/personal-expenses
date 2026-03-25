import { ArrowUpRight, BarChart3 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell, YAxis } from "recharts";
import { Button } from "./ui/button";
import { formatCOPWithSymbol, formatCOP } from "@/lib/currency";

export interface MonthlyExpense {
  name: string;
  value: number;
}

interface ExpenseChartProps {
  data?: MonthlyExpense[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const defaultData: MonthlyExpense[] = MONTH_NAMES.map((name) => ({ name, value: 0 }));

const ExpenseChart = ({ data: propData }: ExpenseChartProps) => {
  const data = propData && propData.length > 0 ? propData : defaultData;
  const currentMonth = MONTH_NAMES[new Date().getMonth()];
  return (
    <div className="glass-card rounded-2xl h-full flex flex-col p-6 relative z-0">
      <div className="flex flex-row items-center justify-between pb-4">
        <h2 className="typo-section-label flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Expense Analytics
        </h2>
        <Button variant="ghost" size="sm" className="text-xs rounded-full hover:bg-surface-hover-strong text-muted-foreground hover:text-foreground opacity-50 cursor-not-allowed">
          View Details <ArrowUpRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      {/* Stats card showing current month total */}
      {(() => {
        const currentMonthData = data.find((d) => d.name === currentMonth);
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const pct = total > 0 && currentMonthData ? Math.round((currentMonthData.value / total) * 100) : 0;
        return currentMonthData && currentMonthData.value > 0 ? (
          <>
            {/* Desktop floating card */}
            <div className="absolute top-20 right-8 z-20 hidden lg:block">
              <div className="glass-panel p-4 rounded-xl border border-glass shadow-float backdrop-blur-2xl">
                <div className="flex items-center justify-between mb-1 border-b border-subtle pb-2">
                  <span className="text-xl font-bold font-mono tracking-tighter text-foreground">{formatCOPWithSymbol(currentMonthData.value)}</span>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/10 ml-3">{pct}%</span>
                </div>
                <p className="text-xs text-muted-foreground">{currentMonth} expenses</p>
              </div>
            </div>
            {/* Mobile inline stats */}
            <div className="flex items-center gap-3 mt-2 lg:hidden">
              <span className="typo-amount-sm font-mono">{formatCOPWithSymbol(currentMonthData.value)}</span>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/10">{pct}%</span>
              <span className="text-xs text-muted-foreground">{currentMonth}</span>
            </div>
          </>
        ) : null;
      })()}

      <div className="h-[250px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="var(--chart-axis)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCOP(value)}
            />
            <Tooltip
              cursor={{ fill: 'var(--chart-cursor)' }}
              contentStyle={{
                backgroundColor: 'var(--chart-tooltip-bg)',
                backdropFilter: 'blur(12px)',
                borderColor: 'var(--chart-tooltip-border)',
                borderRadius: '12px',
                color: 'var(--chart-tooltip-text)',
                boxShadow: '0 10px 30px var(--chart-tooltip-shadow)'
              }}
              itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
            />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={32}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.name === currentMonth ? 'hsl(var(--primary))' : 'var(--chart-bar-inactive)'}
                  style={{
                    filter: entry.name === currentMonth ? `drop-shadow(0 0 8px var(--glow-primary-shadow-strong))` : 'none'
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExpenseChart;
