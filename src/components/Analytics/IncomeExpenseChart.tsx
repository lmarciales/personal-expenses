import type { MonthlyData } from "@/hooks/useAnalyticsData";
import { formatCOPCompact, formatCOPWithSymbol } from "@/lib/currency";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface IncomeExpenseChartProps {
  monthlyExpenses: MonthlyData[];
  monthlyIncome: MonthlyData[];
  onMonthClick?: (monthIndex: number) => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CustomTooltip = ({ active, payload, label, t }: any) => {
  if (!active || !payload || !payload.length) return null;
  const income = payload.find((p: any) => p.dataKey === "income")?.value || 0;
  const expenses = payload.find((p: any) => p.dataKey === "expenses")?.value || 0;
  const net = income - expenses;
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
      <p style={{ fontWeight: 600, margin: "0 0 6px", fontSize: 13 }}>{label}</p>
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
  const { t } = useTranslation("analytics");

  const chartData = MONTH_NAMES.map((name, idx) => ({
    name,
    income: monthlyIncome[idx]?.value || 0,
    expenses: monthlyExpenses[idx]?.value || 0,
  }));

  const handleClick = (data: any) => {
    if (!data || !data.name || !onMonthClick) return;
    const monthIndex = MONTH_NAMES.indexOf(data.name) + 1;
    onMonthClick(monthIndex);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">{t("incomeVsExpenses.title")}</h3>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCOPCompact(Math.round(value))}
            />
            <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: "var(--chart-cursor)" }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value: string) => (
                <span className="text-muted-foreground capitalize">
                  {value === "income" ? t("incomeVsExpenses.income") : t("incomeVsExpenses.expenses")}
                </span>
              )}
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
      </div>
    </div>
  );
}
