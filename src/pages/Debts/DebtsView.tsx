import Sidebar from "@/components/Sidebar";
import { DebtSummaryCards } from "@/components/Debts/DebtSummaryCards";
import { MyDebtsTab } from "@/components/Debts/MyDebtsTab";
import { OwedToMeTab } from "@/components/Debts/OwedToMeTab";
import { useDebtsData } from "@/hooks/useDebtsData";
import { Button } from "@/components/ui/button";
import { Loader2, Landmark, Users } from "lucide-react";
import { useState } from "react";

type Tab = "my-debts" | "owed-to-me";

export const DebtsView = () => {
  const { myDebts, owedToMe, accounts, isLoading, error, refetch } = useDebtsData();
  const [activeTab, setActiveTab] = useState<Tab>("my-debts");

  const totalIOwe = myDebts.reduce((sum, g) => sum + g.total, 0);
  const totalOwedToMe = owedToMe.reduce((sum, g) => sum + g.total, 0);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center relative overflow-hidden">
        <div className="bg-glow top-[-10%] left-[-5%] opacity-50" />
        <div className="bg-glow-secondary bottom-[-10%] right-[-5%] opacity-30" />
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center flex-col gap-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">Error Loading Debts</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground font-sans relative overflow-hidden selection:bg-primary/30">
      <div className="bg-glow top-[-10%] left-[-5%] opacity-50" />
      <div className="bg-glow-secondary bottom-[-10%] right-[-5%] opacity-30" />

      <Sidebar />

      <main className="flex-1 relative z-10 px-6 py-8 md:px-12 md:py-10 overflow-y-auto overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <header className="glass-card p-6 rounded-3xl shadow-xl">
            <h1 className="text-3xl font-extrabold tracking-tight">Debts & Payments</h1>
            <p className="text-muted-foreground mt-1">Track what you owe and what others owe you.</p>
          </header>

          {/* Summary Cards */}
          <DebtSummaryCards
            totalIOwe={totalIOwe}
            totalOwedToMe={totalOwedToMe}
          />

          {/* Tab Switcher */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === "my-debts" ? "default" : "outline"}
              onClick={() => setActiveTab("my-debts")}
              className={`rounded-full gap-2 ${activeTab === "my-debts"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(212,255,0,0.3)]"
                : "bg-transparent border-border hover:bg-surface-hover"
              }`}
            >
              <Landmark className="w-4 h-4" />
              My Debts
              {myDebts.length > 0 && (
                <span className="ml-1 text-xs bg-background/20 px-2 py-0.5 rounded-full">
                  {myDebts.reduce((sum, g) => sum + g.items.length, 0)}
                </span>
              )}
            </Button>
            <Button
              variant={activeTab === "owed-to-me" ? "default" : "outline"}
              onClick={() => setActiveTab("owed-to-me")}
              className={`rounded-full gap-2 ${activeTab === "owed-to-me"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(212,255,0,0.3)]"
                : "bg-transparent border-border hover:bg-surface-hover"
              }`}
            >
              <Users className="w-4 h-4" />
              Owed to Me
              {owedToMe.length > 0 && (
                <span className="ml-1 text-xs bg-background/20 px-2 py-0.5 rounded-full">
                  {owedToMe.reduce((sum, g) => sum + g.items.length, 0)}
                </span>
              )}
            </Button>
          </div>

          {/* Tab Content */}
          {activeTab === "my-debts" ? (
            <MyDebtsTab groups={myDebts} accounts={accounts} onSettled={refetch} />
          ) : (
            <OwedToMeTab groups={owedToMe} accounts={accounts} onSettled={refetch} />
          )}
        </div>
      </main>
    </div>
  );
};
