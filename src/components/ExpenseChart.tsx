import { ArrowUpRight, BarChart3 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell, YAxis } from "recharts";
import { Button } from "./ui/button";

const data = [
  { name: "Jan", value: 0 },
  { name: "Feb", value: 0 },
  { name: "Mar", value: 0 },
  { name: "Apr", value: 0 },
  { name: "May", value: 0 },
  { name: "Jun", value: 0 },
  { name: "Jul", value: 0 },
  { name: "Aug", value: 0 },
  { name: "Sep", value: 0 },
  { name: "Oct", value: 0 },
  { name: "Nov", value: 0 },
  { name: "Dec", value: 0 },
];

const ExpenseChart = () => {
  return (
    <div className="glass-card rounded-2xl h-full flex flex-col p-6 relative z-0">
      <div className="flex flex-row items-center justify-between pb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Expense Analytics
        </h2>
        <Button variant="ghost" size="sm" className="text-xs rounded-full hover:bg-surface-hover-strong text-muted-foreground hover:text-foreground opacity-50 cursor-not-allowed">
          View Details <ArrowUpRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      {/* Floating stats card - improved for glass aesthetic */}
      <div className="absolute top-20 right-8 z-20 hidden lg:block opacity-50">
        <div className="glass-panel p-4 rounded-xl border border-glass shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-3 border-b border-subtle pb-2">
            <span className="text-xl font-bold font-mono tracking-tighter text-foreground">$0.00</span>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/10 ml-3">0%</span>
          </div>
          <div className="space-y-2 text-xs font-medium">
            <div className="flex justify-between gap-6">
              <span className="flex items-center text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-surface-indicator mr-2" /> Uncategorized
              </span>
              <span className="text-foreground">$0.00</span>
            </div>
          </div>
        </div>
      </div>

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
              tickFormatter={(value) => `$${value}`}
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
              itemStyle={{ color: '#d4ff00', fontWeight: 'bold' }}
            />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={32}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.name === 'May' ? '#d4ff00' : 'var(--chart-bar-inactive)'}
                  style={{
                    filter: entry.name === 'May' ? 'drop-shadow(0 0 8px rgba(212,255,0,0.4))' : 'none'
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
