import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { formatCOPWithSymbol, formatCOP } from "@/lib/currency";
import { KpiCards } from "@/components/Analytics/KpiCards";
import { IncomeExpenseChart } from "@/components/Analytics/IncomeExpenseChart";
import { SpendingTrends } from "@/components/Analytics/SpendingTrends";
import { MonthDetailPanel } from "@/components/Analytics/MonthDetailPanel";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ExpenseTooltip = ({ active, payload, label, data }: any) => {
    if (!active || !payload || !payload.length) return null;
    const value = payload[0].value as number;
    const monthIdx = MONTH_NAMES.indexOf(label);
    let comparison = "";
    if (monthIdx > 0 && data) {
        const prevValue = data[monthIdx - 1]?.value;
        if (prevValue > 0) {
            const pctChange = Math.round(((value - prevValue) / prevValue) * 100);
            const arrow = pctChange >= 0 ? "↑" : "↓";
            comparison = ` · ${arrow} ${Math.abs(pctChange)}% vs ${MONTH_NAMES[monthIdx - 1]}`;
        }
    }
    return (
        <div
            style={{
                backgroundColor: 'var(--chart-tooltip-bg)',
                backdropFilter: 'blur(12px)',
                borderColor: 'var(--chart-tooltip-border)',
                borderWidth: 1,
                borderStyle: 'solid',
                borderRadius: '12px',
                color: 'var(--chart-tooltip-text)',
                boxShadow: '0 10px 30px var(--chart-tooltip-shadow)',
                padding: '10px 14px',
            }}
        >
            <p style={{ fontWeight: 'bold', color: 'hsl(var(--primary))', margin: 0, fontSize: 14 }}>
                {formatCOPWithSymbol(value)}
            </p>
            {comparison && (
                <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.7 }}>{comparison}</p>
            )}
        </div>
    );
};

export const AnalyticsView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [year, setYear] = useState(() => {
        const p = searchParams.get("year");
        return p ? parseInt(p, 10) : new Date().getFullYear();
    });
    const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
        const p = searchParams.get("month");
        return p ? parseInt(p, 10) : null;
    });

    const analytics = useAnalyticsData(year);
    const currentMonth = MONTH_NAMES[new Date().getMonth()];
    const monthDetailRef = useRef<HTMLDivElement>(null);

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

    const handleExpenseBarClick = (barData: any) => {
        if (!barData || !barData.name) return;
        const monthIndex = MONTH_NAMES.indexOf(barData.name) + 1;
        setSelectedMonth(monthIndex);
    };

    const handleIncomeExpenseMonthClick = (monthIndex: number) => {
        setSelectedMonth(monthIndex);
    };

    const monthsWithExpenseData = analytics.monthlyExpenses.filter(m => m.value > 0).length;
    const hasPrevYearData = analytics.prevYearTotalExpenses > 0 || analytics.prevYearTotalIncome > 0;

    if (analytics.isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
            </div>
        );
    }

    if (analytics.error) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center flex-col gap-4 text-center">
                <h2 className="text-2xl font-bold text-destructive">Error Loading Analytics</h2>
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
                        Expense Analytics
                    </h1>
                    <p className="typo-page-subtitle">Track your spending patterns and financial health</p>
                </div>
                {/* Year selector */}
                <div className="flex items-center gap-2 bg-surface-hover/50 rounded-xl px-3 py-2">
                    <button
                        onClick={() => canGoLeft && setYear(y => y - 1)}
                        disabled={!canGoLeft}
                        className="p-1 rounded-lg hover:bg-surface-hover-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <span className="text-sm font-bold text-foreground min-w-[44px] text-center">{year}</span>
                    <button
                        onClick={() => canGoRight && setYear(y => y + 1)}
                        disabled={!canGoRight}
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
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Monthly Expenses</h3>
                    <span className="text-[11px] text-muted-foreground">Click a month for details</span>
                </div>
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.monthlyExpenses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                content={<ExpenseTooltip data={analytics.monthlyExpenses} />}
                            />
                            <Bar
                                dataKey="value"
                                radius={[6, 6, 6, 6]}
                                barSize={32}
                                onClick={handleExpenseBarClick}
                                cursor="pointer"
                            >
                                {analytics.monthlyExpenses.map((entry, index) => (
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
                <MonthDetailPanel
                    year={year}
                    month={selectedMonth}
                    onClose={() => setSelectedMonth(null)}
                />
                </div>
            )}
        </div>
    );
};
