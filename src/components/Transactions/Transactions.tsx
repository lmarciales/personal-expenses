import { ArrowUpRight, Activity, CopyPlus } from "lucide-react";
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
  image: string;
  account_id?: string;
}

const Transactions = ({ transactions, accounts, onSuccess }: { transactions: Transaction[], accounts?: any[], onSuccess?: () => void }) => {
  const navigate = useNavigate();

  return (
    <div className="glass-card rounded-2xl h-full flex flex-col p-6">
      <div className="flex flex-row items-center justify-between pb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
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

      <div className="flex-1 space-y-1">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 opacity-50">
            <Activity className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground italic">No recent transactions found.</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-hover transition-colors group cursor-pointer border border-transparent hover:border-subtle">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img src={transaction.image} alt={transaction.name} className="w-10 h-10 rounded-full border-2 border-background shadow-md opacity-90 group-hover:opacity-100 transition-opacity" />
                  {transaction.status === "Success" && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-background rounded-full"></div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm group-hover:text-primary transition-colors">{transaction.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{transaction.email}</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className={`font-bold text-sm tracking-tight ${transaction.type === 'income' ? 'text-green-400' : 'text-foreground'}`}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}{formatCOPWithSymbol(Math.abs(transaction.amount))}
                  </div>
                  <div
                    className={`text-[10px] font-medium uppercase tracking-wider mt-1 ${transaction.status === "Success"
                      ? "text-primary"
                      : "text-orange-400 animate-pulse"
                      }`}
                  >
                    {transaction.status}
                  </div>
                </div>

                {accounts && onSuccess && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-200">
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-surface-hover hover:bg-primary/20 hover:text-primary text-muted-foreground border border-transparent hover:border-primary/30">
                        <CopyPlus className="w-4 h-4" />
                      </Button>
                    </AddTransactionModal>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Transactions;
