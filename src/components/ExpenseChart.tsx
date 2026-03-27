import { formatCOP, formatCOPWithSymbol } from "@/lib/currency";
import { ArrowUpRight, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "./ui/button";

export interface MonthlyExpense {
  name: string;
  value: number;
}

interface ExpenseChartProps {
  data?: MonthlyExpense[];
  availableYears?: number[];
  selectedYear?: number;
  onYearChange?: (year: number) => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const defaultData: MonthlyExpense[] = MONTH_NAMES.map((name) => ({ name, value: 0 }));

// Custom tooltip with formatted amount + month-over-month comparison
const CustomTooltip = ({ active, payload, label, data, translateMonth }: any) => {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value as number;
  const monthIdx = MONTH_NAMES.indexOf(label);
  let comparison = "";
  if (monthIdx > 0 && data) {
    const prevValue = data[monthIdx - 1]?.value;
    if (prevValue > 0) {
      const pctChange = Math.round(((value - prevValue) / prevValue) * 100);
      const arrow = pctChange >= 0 ? "↑" : "↓";
      const prevMonthName = translateMonth ? translateMonth(MONTH_NAMES[monthIdx - 1]) : MONTH_NAMES[monthIdx - 1];
      comparison = ` · ${arrow} ${Math.abs(pctChange)}% vs ${prevMonthName}`;
    }
  }
  return (
    <div
      style={{
        backgroundColor: "var(--chart-tooltip-bg)",
        backdropFilter: "blur(12px)",
        borderColor: "var(--chart-tooltip-border)",
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: "12px",
        color: "var(--chart-tooltip-text)",
        boxShadow: "0 10px 30px var(--chart-tooltip-shadow)",
        padding: "10px 14px",
      }}
    >
      <p style={{ fontWeight: "bold", color: "hsl(var(--primary))", margin: 0, fontSize: 14 }}>
        {formatCOPWithSymbol(value)}
      </p>
      {comparison && <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.7 }}>{comparison}</p>}
    </div>
  );
};

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

const ExpenseChart = ({ data: propData, availableYears, selectedYear, onYearChange }: ExpenseChartProps) => {
  const { t } = useTranslation("dashboard");
  const data = propData && propData.length > 0 ? propData : defaultData;
  const currentMonth = MONTH_NAMES[new Date().getMonth()];
  const navigate = useNavigate();

  const translateMonth = (name: string) => {
    const idx = MONTH_NAMES.indexOf(name);
    return idx >= 0 ? t(`common:monthsShort.${MONTH_KEYS[idx]}`) : name;
  };
  const year = selectedYear ?? new Date().getFullYear();

  const canGoLeft = availableYears && availableYears.length > 0 && year > Math.min(...availableYears);
  const canGoRight = availableYears && availableYears.length > 0 && year < Math.max(...availableYears);

  const handleBarClick = (barData: any) => {
    if (!barData || !barData.name) return;
    const monthIndex = MONTH_NAMES.indexOf(barData.name) + 1;
    navigate(`/analytics?year=${year}&month=${monthIndex}`);
  };

  return (
    <div className="glass-card rounded-2xl h-full flex flex-col p-6 relative z-0">
      <div className="flex flex-row items-center justify-between pb-4">
        <h2 className="typo-section-label flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> {t("expenseChart.title")}
        </h2>
        <div className="flex items-center gap-2">
          {/* Year selector */}
          {availableYears && availableYears.length > 0 && (
            <div className="flex items-center gap-1 bg-surface-hover/50 rounded-lg px-2 py-1">
              <button
                onClick={() => canGoLeft && onYearChange?.(year - 1)}
                disabled={!canGoLeft}
                className="p-0.5 rounded hover:bg-surface-hover-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <span className="text-xs font-semibold text-foreground min-w-[36px] text-center">{year}</span>
              <button
                onClick={() => canGoRight && onYearChange?.(year + 1)}
                disabled={!canGoRight}
                className="p-0.5 rounded hover:bg-surface-hover-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs rounded-full hover:bg-surface-hover-strong text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/analytics?year=${year}`)}
          >
            {t("expenseChart.viewDetails")} <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
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
                  <span className="text-xl font-bold font-mono tracking-tighter text-foreground">
                    {formatCOPWithSymbol(currentMonthData.value)}
                  </span>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/10 ml-3">
                    {pct}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {translateMonth(currentMonth)} {t("expenseChart.expenses")}
                </p>
              </div>
            </div>
            {/* Mobile inline stats */}
            <div className="flex items-center gap-3 mt-2 lg:hidden">
              <span className="typo-amount-sm font-mono">{formatCOPWithSymbol(currentMonthData.value)}</span>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/10">
                {pct}%
              </span>
              <span className="text-xs text-muted-foreground">{translateMonth(currentMonth)}</span>
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
              tickFormatter={translateMonth}
            />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCOP(value)}
            />
            <Tooltip
              cursor={{ fill: "var(--chart-cursor)" }}
              content={<CustomTooltip data={data} translateMonth={translateMonth} />}
            />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={32} onClick={handleBarClick} cursor="pointer">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.name === currentMonth ? "hsl(var(--primary))" : "var(--chart-bar-inactive)"}
                  style={{
                    filter:
                      entry.name === currentMonth ? `drop-shadow(0 0 8px var(--glow-primary-shadow-strong))` : "none",
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
