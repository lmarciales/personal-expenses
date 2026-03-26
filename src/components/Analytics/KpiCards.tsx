import { formatCOPWithSymbol } from "@/lib/currency";

interface KpiCardsProps {
    totalExpenses: number;
    totalIncome: number;
    netCashFlow: number;
    avgMonthlySpend: number;
    prevYearTotalExpenses: number;
    prevYearTotalIncome: number;
    monthsWithData: number;
    hasPrevYearData: boolean;
}

function yoyChange(current: number, previous: number): string {
    if (previous === 0) return "First year of data";
    const pct = Math.round(((current - previous) / previous) * 100);
    const arrow = pct >= 0 ? "↑" : "↓";
    return `${arrow} ${Math.abs(pct)}% vs last year`;
}

export function KpiCards({
    totalExpenses,
    totalIncome,
    netCashFlow,
    avgMonthlySpend,
    prevYearTotalExpenses,
    prevYearTotalIncome,
    monthsWithData,
    hasPrevYearData,
}: KpiCardsProps) {
    const cards = [
        {
            label: "Total Expenses",
            value: formatCOPWithSymbol(totalExpenses),
            subtext: hasPrevYearData ? yoyChange(totalExpenses, prevYearTotalExpenses) : "First year of data",
            subtextColor: hasPrevYearData && totalExpenses > prevYearTotalExpenses ? "text-red-400" : "text-green-400",
        },
        {
            label: "Total Income",
            value: formatCOPWithSymbol(totalIncome),
            subtext: hasPrevYearData ? yoyChange(totalIncome, prevYearTotalIncome) : "First year of data",
            subtextColor: hasPrevYearData && totalIncome >= prevYearTotalIncome ? "text-green-400" : "text-red-400",
        },
        {
            label: "Net Cash Flow",
            value: `${netCashFlow >= 0 ? "+ " : "- "}${formatCOPWithSymbol(Math.abs(netCashFlow))}`,
            subtext: netCashFlow >= 0 ? "Positive — saving money" : "Negative — spending more than earning",
            subtextColor: netCashFlow >= 0 ? "text-green-400" : "text-red-400",
            valueColor: netCashFlow >= 0 ? "text-green-400" : "text-red-400",
        },
        {
            label: "Avg Monthly Spend",
            value: formatCOPWithSymbol(avgMonthlySpend),
            subtext: `Based on ${monthsWithData} month${monthsWithData !== 1 ? "s" : ""} of data`,
            subtextColor: "text-muted-foreground",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="glass-card rounded-xl p-4 border border-glass"
                >
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                        {card.label}
                    </p>
                    <p className={`text-lg font-bold font-mono tracking-tight mt-1 ${card.valueColor || "text-foreground"}`}>
                        {card.value}
                    </p>
                    <p className={`text-[11px] mt-1 ${card.subtextColor}`}>
                        {card.subtext}
                    </p>
                </div>
            ))}
        </div>
    );
}
