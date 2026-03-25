import { ArrowUpRight, Activity, CopyPlus } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { formatCOPWithSymbol } from "@/lib/currency";
import { Button } from "../ui/button";
import { AddTransactionModal } from "./AddTransactionModal";
import { useNavigate } from "react-router-dom";

export interface Transaction {
  id: string | number;
  name: string;
  email: string;
  amount: number;
  status: "Success" | "Pending";
  type?: "expense" | "income" | "transfer";
  account_id?: string;
}

const Transactions = ({ transactions, accounts, onSuccess }: { transactions: Transaction[], accounts?: any[], onSuccess?: () => void }) => {
  const navigate = useNavigate();

  return (
    <div className="glass-card h-full flex flex-col p-6">
      <div className="flex flex-row items-center justify-between pb-4">
        <h2 className="typo-section-label flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Recent Transactions
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs rounded-full hover:bg-surface-hover-strong text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/transactions")}
        >
          View All <ArrowUpRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        {transactions.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent transactions"
            description="Your recent transactions will appear here."
          />
        ) : (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="group relative flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer overflow-hidden"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-surface-overlay border-2 border-background shadow-sm flex items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground">{transaction.name.charAt(0).toUpperCase()}</span>
                </div>
                {transaction.status === "Success" && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary border-2 border-background rounded-full"></div>
                )}
              </div>

              {/* Info - truncated */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {transaction.name}
                  </span>
                  <span className={`shrink-0 font-bold text-sm tabular-nums ${transaction.type === 'income' ? 'text-income' : 'text-foreground'}`}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}{formatCOPWithSymbol(Math.abs(transaction.amount))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate">{transaction.email}</span>
                  <span
                    className={`shrink-0 text-[10px] font-medium uppercase tracking-wider ${
                      transaction.status === "Success" ? "text-primary" : "text-warning animate-pulse"
                    }`}
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>

              {/* Duplicate action - overlay on hover */}
              {accounts && onSuccess && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <AddTransactionModal
                    accounts={accounts}
                    onSuccess={onSuccess}
                    initialData={{
                      payee: transaction.name,
                      totalAmount: Math.abs(transaction.amount),
                      accountId: transaction.account_id,
                      type: transaction.type,
                      isRecurring: false,
                    }}
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-surface-hover-strong hover:bg-primary/20 hover:text-primary text-muted-foreground border border-glass">
                      <CopyPlus className="w-3.5 h-3.5" />
                    </Button>
                  </AddTransactionModal>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Transactions;
