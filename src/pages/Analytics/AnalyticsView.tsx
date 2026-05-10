import { IncomeExpenseChart } from "@/components/Analytics/IncomeExpenseChart";
import { KpiCards } from "@/components/Analytics/KpiCards";
import { MonthDetailPanel } from "@/components/Analytics/MonthDetailPanel";
import { SpendingTrends } from "@/components/Analytics/SpendingTrends";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { formatCOPCompact, formatCOPWithSymbol } from "@/lib/currency";
import type { TFunction } from "i18next";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_SHORT_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

interface ExpensePayload {
  value?: number;
}

interface ExpenseTooltipProps {
  active?: boolean;
  payload?: ExpensePayload[];
  label?: string;
  data?: { value: number }[];
  t: TFunction;
  formatMonth: (monthIndex: number) => string;
}

const ExpenseTooltip = ({ active, payload, label, data, t, formatMonth }: ExpenseTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value ?? 0;
  const monthIdx = MONTH_NAMES.indexOf(label ?? "");
  const labelText = monthIdx >= 0 ? formatMonth(monthIdx) : label;
  let comparison = "";
  if (monthIdx > 0 && data) {
    const prevValue = data[monthIdx - 1]?.value;
    if (prevValue > 0) {
      const pctChange = Math.round(((value - prevValue) / prevValue) * 100);
      comparison = ` · ${t("chart.comparisonVs", {
        direction: pctChange >= 0 ? t("chart.up") : t("chart.down"),
        percent: Math.abs(pctChange),
        month: formatMonth(monthIdx - 1),
      })}`;
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
      <p style={{ margin: "0 0 4px", fontSize: 12, opacity: 0.75 }}>{labelText}</p>
      <p style={{ fontWeight: "bold", color: "hsl(var(--primary))", margin: 0, fontSize: 14 }}>
        {formatCOPWithSymbol(value)}
      </p>
      {comparison && <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.7 }}>{comparison}</p>}
    </div>
  );
};

export const AnalyticsView = () => {
  const { t } = useTranslation(["analytics", "common"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [year, setYear] = useState(() => {
    const p = searchParams.get("year");
    return p ? Number.parseInt(p, 10) : new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
    const p = searchParams.get("month");
    return p ? Number.parseInt(p, 10) : null;
  });
  const [chartsReady, setChartsReady] = useState(false);

  const analytics = useAnalyticsData(year);
  const currentMonth = year === new Date().getFullYear() ? MONTH_NAMES[new Date().getMonth()] : null;
  const monthDetailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setChartsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Sync URL params when year/month changes
  useEffect(() => {
    const params: Record<string, string> = { year: String(year) };
    if (selectedMonth !== null) params.month = String(selectedMonth);
    setSearchParams(params, { replace: true });
  }, [year, selectedMonth, setSearchParams]);

  // Auto-scroll to month detail panel when a month is selected
  useEffect(() => {
    if (selectedMonth !== null && monthDetailRef.current) {
      // Scroll within the <main> overflow container to avoid layout breakage
      const scrollContainer = monthDetailRef.current.closest("main");
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = monthDetailRef.current.getBoundingClientRect();
        const scrollOffset = targetRect.top - containerRect.top + scrollContainer.scrollTop - 24;
        scrollContainer.scrollTo({ top: scrollOffset, behavior: "smooth" });
      }
    }
  }, [selectedMonth]);

  const canGoLeft = analytics.availableYears.length > 0 && year > Math.min(...analytics.availableYears);
  const canGoRight = analytics.availableYears.length > 0 && year < Math.max(...analytics.availableYears);
  const formatMonth = (monthIndex: number) => t(`common:monthsShort.${MONTH_SHORT_KEYS[monthIndex]}`);

  const handleExpenseBarClick = (barData: { name?: string } | undefined) => {
    if (!barData || !barData.name) return;
    const monthIndex = MONTH_NAMES.indexOf(barData.name) + 1;
    setSelectedMonth(monthIndex);
  };

  const handleIncomeExpenseMonthClick = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
  };

  const monthsWithExpenseData = analytics.monthlyExpenses.filter((m) => m.value > 0).length;
  const hasPrevYearData = analytics.prevYearTotalExpenses > 0 || analytics.prevYearTotalIncome > 0;

  if (analytics.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (analytics.error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center flex-col gap-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">{t("error.title")}</h2>
        <p className="text-muted-foreground">{analytics.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="typo-page-title flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t("header.title")}
          </h1>
          <p className="typo-page-subtitle">{t("header.subtitle")}</p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-2 bg-surface-hover/50 rounded-xl px-3 py-2">
          <button
            type="button"
            onClick={() => canGoLeft && setYear((y) => y - 1)}
            disabled={!canGoLeft}
            aria-label={t("chart.previousYear")}
            title={t("chart.previousYear")}
            className="p-1 rounded-lg hover:bg-surface-hover-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-bold text-foreground min-w-[44px] text-center">{year}</span>
          <button
            type="button"
            onClick={() => canGoRight && setYear((y) => y + 1)}
            disabled={!canGoRight}
            aria-label={t("chart.nextYear")}
            title={t("chart.nextYear")}
            className="p-1 rounded-lg hover:bg-surface-hover-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <KpiCards
        totalExpenses={analytics.totalExpenses}
        totalIncome={analytics.totalIncome}
        netCashFlow={analytics.netCashFlow}
        avgMonthlySpend={analytics.avgMonthlySpend}
        prevYearTotalExpenses={analytics.prevYearTotalExpenses}
        prevYearTotalIncome={analytics.prevYearTotalIncome}
        monthsWithData={monthsWithExpenseData}
        hasPrevYearData={hasPrevYearData}
      />

      {/* Monthly Expenses Bar Chart */}
      <div className="glass-card rounded-2xl p-6 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">{t("monthlyExpenses")}</h3>
          <span className="text-[11px] text-muted-foreground">{t("clickMonthForDetails")}</span>
        </div>
        <div className="h-[280px] min-w-0 w-full" role="img" aria-label={t("chart.monthlyExpensesLabel")}>
          {chartsReady && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
              <BarChart data={analytics.monthlyExpenses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  cursor={{ fill: "var(--chart-cursor)" }}
                  content={<ExpenseTooltip data={analytics.monthlyExpenses} t={t} formatMonth={formatMonth} />}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 6, 6]}
                  barSize={32}
                  onClick={handleExpenseBarClick}
                  cursor="pointer"
                >
                  {analytics.monthlyExpenses.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.name === currentMonth ? "hsl(var(--primary))" : "var(--chart-bar-inactive)"}
                      style={{
                        filter:
                          entry.name === currentMonth
                            ? "drop-shadow(0 0 8px var(--glow-primary-shadow-strong))"
                            : "none",
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Income vs Expenses Chart */}
      <IncomeExpenseChart
        monthlyExpenses={analytics.monthlyExpenses}
        monthlyIncome={analytics.monthlyIncome}
        onMonthClick={handleIncomeExpenseMonthClick}
      />

      {/* Spending Trends */}
      <SpendingTrends
        highestMonth={analytics.highestMonth}
        lowestMonth={analytics.lowestMonth}
        monthOverMonthChange={analytics.monthOverMonthChange}
        savingsRate={analytics.savingsRate}
      />

      {/* Month Detail Panel */}
      {selectedMonth !== null && (
        <div ref={monthDetailRef}>
          <MonthDetailPanel year={year} month={selectedMonth} onClose={() => setSelectedMonth(null)} />
        </div>
      )}
    </div>
  );
};
