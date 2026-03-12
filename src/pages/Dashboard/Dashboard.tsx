import ExpenseChart from "@/components/ExpenseChart";
import Products from "@/components/Products/Products";
import Sidebar from "@/components/Sidebar";
import SpendingOverview from "@/components/SpendingOverview";
import Transactions from "@/components/Transactions/Transactions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AddTransactionModal } from "@/components/Transactions/AddTransactionModal";
import { RecurringRecommendations } from "@/components/RecurringRecommendations";
import { signOut } from "@/supabase/auth";
import { Bell, LogOut, Monitor, Search, Loader2, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Dashboard = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { accounts, transactions, totalExpense, isLoading, error, refetch } = useDashboardData();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = () => signOut().then(() => navigate("/"));

  const filteredTransactions = transactions.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center relative overflow-hidden">
        {/* Ambient Neon Glows */}
        <div className="bg-glow top-[-10%] left-[-5%] opacity-50"></div>
        <div className="bg-glow-secondary bottom-[-10%] right-[-5%] opacity-30"></div>
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center flex-col gap-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">Error Loading Dashboard</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground font-sans relative overflow-hidden selection:bg-primary/30">
      {/* Ambient Neon Glows */}
      <div className="bg-glow top-[-10%] left-[-5%] opacity-50"></div>
      <div className="bg-glow-secondary bottom-[-10%] right-[-5%] opacity-30"></div>

      <Sidebar />

      <main className="flex-1 relative z-10 px-6 py-8 md:px-12 md:py-10 overflow-y-auto overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-card p-6 rounded-3xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-1">Monitor and control your financial health.</p>
              </div>
              <div className="flex space-x-2">
                {accounts.length > 0 ? (
                  <AddTransactionModal accounts={accounts} onSuccess={refetch}>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(212,255,0,0.5)] transition-all">
                      + Add Transaction
                    </Button>
                  </AddTransactionModal>
                ) : (
                  <Button disabled className="bg-primary/50 text-primary-foreground/50 cursor-not-allowed">
                    + Add Transaction
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative hidden md:block group">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-secondary/50 border border-border rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all w-64 placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary relative" onClick={() => {
                  if (theme === "dark") setTheme("light");
                  else if (theme === "light") setTheme("system");
                  else setTheme("dark");
                }}>
                  {theme === "light" ? <Sun className="w-5 h-5" /> : theme === "dark" ? <Moon className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary relative">
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 glass-panel border-border p-4" align="end">
                    <h4 className="font-semibold text-sm mb-2 text-primary">Notifications</h4>
                    <p className="text-sm text-muted-foreground">You have no new notifications.</p>
                  </PopoverContent>
                </Popover>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 rounded-full bg-secondary overflow-hidden border-2 border-transparent hover:border-primary transition-colors focus:outline-none ml-1">
                      <img src="https://github.com/shadcn.png" alt="User" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 glass-panel rounded-xl mt-2 border-border">
                    <DropdownMenuItem onClick={() => handleSignOut()} className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <RecurringRecommendations accounts={accounts} onSuccess={refetch} />

          {/* Dashboard Grid placeholder - to be updated in the Scaffold phase */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 transition-transform hover:-translate-y-1 duration-300">
              <Products products={accounts} onAccountAdded={refetch} />
            </div>
            <div className="md:col-span-6 transition-transform hover:-translate-y-1 duration-300">
              <SpendingOverview totalExpense={totalExpense} />
            </div>

            <div className="md:col-span-4 transition-transform hover:-translate-y-1 duration-300">
              <Transactions transactions={filteredTransactions} accounts={accounts} onSuccess={refetch} />
            </div>
            <div className="md:col-span-8 transition-transform hover:-translate-y-1 duration-300">
              <ExpenseChart />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
