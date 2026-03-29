import ExpenseChart from "@/components/ExpenseChart";
import Products from "@/components/Products/Products";
import { RecurringRecommendations } from "@/components/RecurringRecommendations";
import SpendingOverview from "@/components/SpendingOverview";
import { AddTransactionModal } from "@/components/Transactions/AddTransactionModal";
import Transactions from "@/components/Transactions/Transactions";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useExpenseChartData } from "@/hooks/useExpenseChartData";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Dashboard = () => {
  const { t } = useTranslation("dashboard");
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const { accounts, transactions, totalExpense, categorySpending, isLoading, error, refetch } = useDashboardData();
  const chartData = useExpenseChartData(chartYear);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center flex-col gap-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">{t("error.title")}</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("error.retry")}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-card p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="typo-page-title">{t("header.title")}</h1>
          <p className="typo-page-subtitle">{t("header.subtitle")}</p>
        </div>
        {accounts.length > 0 ? (
          <AddTransactionModal accounts={accounts} onSuccess={refetch}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-xl transition-all">
              <Plus className="w-4 h-4 mr-2" />
              {t("common:navbar.addTransaction")}
            </Button>
          </AddTransactionModal>
        ) : (
          <Button disabled className="bg-primary/50 text-primary-foreground/50 cursor-not-allowed">
            <Plus className="w-4 h-4 mr-2" />
            {t("common:navbar.addTransaction")}
          </Button>
        )}
      </header>

      <RecurringRecommendations accounts={accounts} onSuccess={refetch} />

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-6">
          <Products products={accounts} onAccountAdded={refetch} />
        </div>
        <div className="md:col-span-6 relative">
          <div className="md:absolute md:inset-0">
            <SpendingOverview totalExpense={totalExpense} categorySpending={categorySpending} />
          </div>
        </div>

        <div className="md:col-span-4">
          <Transactions transactions={transactions} accounts={accounts} onSuccess={refetch} />
        </div>
        <div className="md:col-span-8">
          <ExpenseChart
            data={chartData.monthlyExpenses}
            availableYears={chartData.availableYears}
            selectedYear={chartYear}
            onYearChange={setChartYear}
          />
        </div>
      </div>
    </>
  );
};
