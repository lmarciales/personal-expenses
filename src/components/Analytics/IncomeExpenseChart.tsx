import type { MonthlyData } from "@/hooks/useAnalyticsData";
import { formatCOPCompact, formatCOPWithSymbol } from "@/lib/currency";
import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface IncomeExpenseChartProps {
  monthlyExpenses: MonthlyData[];
  monthlyIncome: MonthlyData[];
  onMonthClick?: (monthIndex: number) => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_SHORT_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

interface ChartPayload {
  dataKey?: string;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartPayload[];
  label?: string;
  t: TFunction;
  formatMonth: (monthIndex: number) => string;
}

const CustomTooltip = ({ active, payload, label, t, formatMonth }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  const income = payload.find((p) => p.dataKey === "income")?.value || 0;
  const expenses = payload.find((p) => p.dataKey === "expenses")?.value || 0;
  const net = income - expenses;
  const monthIndex = MONTH_NAMES.indexOf(label ?? "");
  const labelText = monthIndex >= 0 ? formatMonth(monthIndex) : label;
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
      <p style={{ fontWeight: 600, margin: "0 0 6px", fontSize: 13 }}>{labelText}</p>
      <p style={{ margin: "2px 0", fontSize: 12, color: "#22c55e" }}>
        {t("incomeVsExpenses.incomeLabel")}: {formatCOPWithSymbol(income)}
      </p>
      <p style={{ margin: "2px 0", fontSize: 12, color: "#ef4444" }}>
        {t("incomeVsExpenses.expensesLabel")}: {formatCOPWithSymbol(expenses)}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: net >= 0 ? "#22c55e" : "#ef4444" }}>
        {t("incomeVsExpenses.netLabel")}: {net >= 0 ? "+ " : "- "}
        {formatCOPWithSymbol(Math.abs(net))}
      </p>
    </div>
  );
};

export function IncomeExpenseChart({ monthlyExpenses, monthlyIncome, onMonthClick }: IncomeExpenseChartProps) {
  const { t } = useTranslation(["analytics", "common"]);
  const [chartReady, setChartReady] = useState(false);
  const formatMonth = (monthIndex: number) => t(`common:monthsShort.${MONTH_SHORT_KEYS[monthIndex]}`);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setChartReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const chartData = MONTH_NAMES.map((name, idx) => ({
    name,
    income: monthlyIncome[idx]?.value || 0,
    expenses: monthlyExpenses[idx]?.value || 0,
  }));

  const handleClick = (data: { name?: string } | undefined) => {
    if (!data || !data.name || !onMonthClick) return;
    const monthIndex = MONTH_NAMES.indexOf(data.name) + 1;
    onMonthClick(monthIndex);
  };

  return (
    <div className="glass-card rounded-2xl p-6 min-w-0">
      <h3 className="text-sm font-semibold text-foreground mb-4">{t("incomeVsExpenses.title")}</h3>
      <div className="h-[280px] min-w-0 w-full" role="img" aria-label={t("chart.incomeExpensesLabel")}>
        {chartReady && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="var(--chart-axis)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
                tickFormatter={(_, index) => formatMonth(index)}
              />
              <YAxis
                stroke="var(--chart-axis)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCOPCompact(Math.round(value))}
              />
              <Tooltip
                content={<CustomTooltip t={t} formatMonth={formatMonth} />}
                cursor={{ fill: "var(--chart-cursor)" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value: string) =>
                  value === "income" ? t("incomeVsExpenses.income") : t("incomeVsExpenses.expenses")
                }
              />
              <Bar
                dataKey="income"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                barSize={16}
                opacity={0.8}
                onClick={handleClick}
                cursor="pointer"
              />
              <Bar
                dataKey="expenses"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                barSize={16}
                opacity={0.8}
                onClick={handleClick}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
