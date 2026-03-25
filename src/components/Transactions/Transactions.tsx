import { ArrowUpRight, Activity, CopyPlus, Pencil } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { formatCOPWithSymbol } from "@/lib/currency";
import { Button } from "../ui/button";
import { AddTransactionModal } from "./AddTransactionModal";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export interface Transaction {
  id: string | number;
  name: string;
  email: string;
  amount: number;
  status: "Success" | "Pending";
  type?: "expense" | "income" | "transfer";
  account_id?: string;
  date?: string;
  notes?: string | null;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  transaction_splits?: { id: string; amount: number; assigned_to: string; status: string }[];
  transaction_categories?: { category_id: string; categories: { id: string; name: string; color: string | null } }[];
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
            <DropdownMenu key={transaction.id}>
              <DropdownMenuTrigger asChild>
                <div
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
                </div>
              </DropdownMenuTrigger>

              {accounts && onSuccess && (
                <DropdownMenuContent align="end" className="w-48 glass-panel border-border z-50">
                  <AddTransactionModal
                    accounts={accounts}
                    onSuccess={onSuccess}
                    editMode={true}
                    transactionId={String(transaction.id)}
                    initialData={{
                      accountId: transaction.account_id,
                      date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : undefined,
                      totalAmount: Math.abs(transaction.amount),
                      type: transaction.type,
                      payee: transaction.name,
                      notes: transaction.notes || "",
                      isRecurring: transaction.is_recurring || false,
                      recurrenceInterval: transaction.recurrence_interval as any,
                      categoryIds: transaction.transaction_categories?.map(tc => tc.category_id) || [],
                      splits: transaction.transaction_splits?.length
                        ? transaction.transaction_splits.map(s => ({
                            amount: Math.abs(s.amount),
                            assigned_to: s.assigned_to || "Me",
                            status: s.status as any,
                          }))
                        : [{ amount: Math.abs(transaction.amount), assigned_to: "Me", status: "Settled" as const }],
                    }}
                  >
                    <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full mb-1">
                      <Pencil className="w-4 h-4 mr-2" />
                      <span>Edit</span>
                    </div>
                  </AddTransactionModal>

                  <AddTransactionModal
                    accounts={accounts}
                    onSuccess={onSuccess}
                    initialData={{
                      payee: transaction.name,
                      totalAmount: Math.abs(transaction.amount),
                      accountId: transaction.account_id,
                      type: transaction.type,
                      isRecurring: false,
                      categoryIds: transaction.transaction_categories?.map(tc => tc.category_id) || [],
                    }}
                  >
                    <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                      <CopyPlus className="w-4 h-4 mr-2" />
                      <span>Duplicate</span>
                    </div>
                  </AddTransactionModal>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          ))
        )}
      </div>
    </div>
  );
};

export default Transactions;
