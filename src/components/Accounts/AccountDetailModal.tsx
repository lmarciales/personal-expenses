import { AddAccountModal } from "@/components/Products/AddAccountModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AccountWithStats } from "@/hooks/useAccountsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { supabase } from "@/supabase/client";
import { ArrowUpRight, CreditCard, Pencil, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface RecentTransaction {
  id: string;
  payee: string;
  total_amount: number;
  date: string;
  type: "expense" | "income" | "transfer";
}

interface AccountDetailModalProps {
  account: AccountWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function AccountDetailModal({ account, open, onOpenChange, onUpdated }: AccountDetailModalProps) {
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchRecentTransactions = useCallback(async () => {
    if (!account) return;
    setLoadingTxns(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, payee, total_amount, date, type")
        .eq("account_id", account.id)
        .order("date", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentTransactions((data || []) as RecentTransaction[]);
    } catch {
      setRecentTransactions([]);
    } finally {
      setLoadingTxns(false);
    }
  }, [account]);

  useEffect(() => {
    if (open && account) {
      fetchRecentTransactions();
    }
  }, [open, account, fetchRecentTransactions]);

  if (!account) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] glass-panel border-glass text-foreground">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">Account Details</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(() => setEditModalOpen(true), 150);
                }}
                className="text-muted-foreground hover:text-foreground rounded-full"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          </DialogHeader>

          {/* Account Header */}
          <div className="flex items-center gap-4 mt-2">
            <div className={`w-14 h-14 rounded-2xl ${account.color} flex items-center justify-center shadow-lg`}>
              <CreditCard className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{account.name}</h3>
              <span className="text-sm text-muted-foreground">{account.type}</span>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xl font-bold">{formatCOPWithSymbol(account.balance)}</p>
              <span className="text-xs text-muted-foreground">Current Balance</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="glass-card rounded-xl p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="text-sm font-bold text-success">{formatCOPWithSymbol(account.totalIncome)}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingDown className="w-4 h-4 text-danger" />
              </div>
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-sm font-bold text-danger">{formatCOPWithSymbol(account.totalExpenses)}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Receipt className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-sm font-bold">{account.transactionCount}</p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Transactions
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs rounded-full hover:bg-surface-hover-strong text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/transactions");
                }}
              >
                View All <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>

            {loadingTxns ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-surface-overlay animate-pulse" />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No transactions yet for this account.</p>
            ) : (
              <div className="space-y-1">
                {recentTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-overlay border border-subtle"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-overlay border-2 border-background shadow-sm flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">
                          {txn.payee.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{txn.payee}</p>
                        <p className="text-xs text-muted-foreground">{txn.date}</p>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-sm tabular-nums ${txn.type === "income" ? "text-income" : "text-foreground"}`}
                    >
                      {txn.type === "income" ? "+" : txn.type === "expense" ? "-" : ""}
                      {formatCOPWithSymbol(Math.abs(txn.total_amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Created date */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            Created{" "}
            {new Date(account.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </DialogContent>
      </Dialog>

      {/* Edit modal — lifted outside detail modal to avoid Radix focus conflicts */}
      <AddAccountModal
        editMode
        accountId={account.id}
        initialData={{ name: account.name, type: account.type, balance: account.balance }}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={() => {
          setEditModalOpen(false);
          onUpdated();
        }}
      />
    </>
  );
}
