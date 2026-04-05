import { DebtSummaryCards } from "@/components/Debts/DebtSummaryCards";
import { MyDebtsTab } from "@/components/Debts/MyDebtsTab";
import { OwedToMeTab } from "@/components/Debts/OwedToMeTab";
import { PeopleTab } from "@/components/Debts/PeopleTab";
import { DebtsSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { useDebtsData } from "@/hooks/useDebtsData";
import { Landmark, User, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type Tab = "my-debts" | "owed-to-me" | "people";

export const DebtsView = () => {
  const { t } = useTranslation("debts");
  const { myDebts, owedToMe, peopleDebts, accounts, isLoading, error, refetch } = useDebtsData();
  const [activeTab, setActiveTab] = useState<Tab>("my-debts");

  const totalIOwe = myDebts.reduce((sum, g) => sum + g.total, 0);
  const totalOwedToMe = owedToMe.reduce((sum, g) => sum + g.total, 0);

  if (isLoading) {
    return <DebtsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center flex-col gap-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">{t("error.title")}</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("common:actions.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="glass-card p-6 rounded-3xl shadow-xl">
        <h1 className="typo-page-title">{t("header.title")}</h1>
        <p className="typo-page-subtitle">{t("header.subtitle")}</p>
      </header>

      {/* Summary Cards */}
      <DebtSummaryCards totalIOwe={totalIOwe} totalOwedToMe={totalOwedToMe} />

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "my-debts" ? "default" : "outline"}
          onClick={() => setActiveTab("my-debts")}
          className={`rounded-full gap-2 ${
            activeTab === "my-debts"
              ? "bg-primary text-primary-foreground shadow-glow-lg"
              : "bg-transparent border-border hover:bg-surface-hover"
          }`}
        >
          <Landmark className="w-4 h-4" />
          {t("tabs.myDebts")}
          {myDebts.length > 0 && (
            <span className="ml-1 text-xs bg-background/20 px-2 py-0.5 rounded-full">
              {myDebts.reduce((sum, g) => sum + g.items.length, 0)}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === "owed-to-me" ? "default" : "outline"}
          onClick={() => setActiveTab("owed-to-me")}
          className={`rounded-full gap-2 ${
            activeTab === "owed-to-me"
              ? "bg-primary text-primary-foreground shadow-glow-lg"
              : "bg-transparent border-border hover:bg-surface-hover"
          }`}
        >
          <Users className="w-4 h-4" />
          {t("tabs.owedToMe")}
          {owedToMe.length > 0 && (
            <span className="ml-1 text-xs bg-background/20 px-2 py-0.5 rounded-full">
              {owedToMe.reduce((sum, g) => sum + g.items.length, 0)}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === "people" ? "default" : "outline"}
          onClick={() => setActiveTab("people")}
          className={`rounded-full gap-2 ${
            activeTab === "people"
              ? "bg-primary text-primary-foreground shadow-glow-lg"
              : "bg-transparent border-border hover:bg-surface-hover"
          }`}
        >
          <User className="w-4 h-4" />
          {t("tabs.people")}
          {peopleDebts.length > 0 && (
            <span className="ml-1 text-xs bg-background/20 px-2 py-0.5 rounded-full">{peopleDebts.length}</span>
          )}
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "my-debts" && <MyDebtsTab groups={myDebts} accounts={accounts} onSettled={refetch} />}
      {activeTab === "owed-to-me" && <OwedToMeTab groups={owedToMe} accounts={accounts} onSettled={refetch} />}
      {activeTab === "people" && <PeopleTab groups={peopleDebts} accounts={accounts} onSettled={refetch} />}
    </>
  );
};
