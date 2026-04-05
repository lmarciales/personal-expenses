import { AlertsSection } from "@/components/Dashboard/AlertsSection";
import { FinancialInsights } from "@/components/Dashboard/FinancialInsights";
import { GroupedSpending } from "@/components/Dashboard/GroupedSpending";
import { MonthlyHealthBar } from "@/components/Dashboard/MonthlyHealthBar";
import Products from "@/components/Products/Products";
import { AddTransactionModal } from "@/components/Transactions/AddTransactionModal";
import Transactions from "@/components/Transactions/Transactions";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Plus } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export const Dashboard = () => {
  const { t } = useTranslation("dashboard");
  const {
    accounts,
    transactions,
    totalBalance,
    totalExpense,
    monthlyIncome,
    monthlyExpense,
    monthlyNet,
    prevMonthExpense,
    momChange,
    groupedSpending,
    insights,
    isLoading,
    error,
    refetch,
  } = useDashboardData();
  const { alerts, refetch: refetchAlerts } = useDashboardAlerts();

  const handleRefresh = useCallback(() => {
    refetch();
    refetchAlerts();
  }, [refetch, refetchAlerts]);

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
          <AddTransactionModal accounts={accounts} onSuccess={handleRefresh}>
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

      {/* Row 1: Monthly Health Bar */}
      <MonthlyHealthBar
        monthlyIncome={monthlyIncome}
        monthlyExpense={monthlyExpense}
        monthlyNet={monthlyNet}
        totalBalance={totalBalance}
        momChange={momChange}
        prevMonthExpense={prevMonthExpense}
        savingsRate={insights.savingsRate}
        accountCount={accounts.length}
      />

      {/* Row 2: Alerts */}
      <AlertsSection alerts={alerts} accounts={accounts} onSuccess={handleRefresh} />

      {/* Row 3: Spending + Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GroupedSpending
          groupedSpending={groupedSpending}
          monthlyExpense={monthlyExpense}
          totalExpenseYTD={totalExpense}
        />
        <Products products={accounts} onAccountAdded={handleRefresh} />
      </div>

      {/* Row 4: Transactions + Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Transactions transactions={transactions} accounts={accounts} onSuccess={handleRefresh} />
        <FinancialInsights insights={insights} />
      </div>
    </>
  );
};
