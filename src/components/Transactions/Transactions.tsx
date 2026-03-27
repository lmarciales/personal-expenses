import { formatCOPWithSymbol } from "@/lib/currency";
import { Activity, ArrowUpRight, CopyPlus, Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AddTransactionModal } from "./AddTransactionModal";

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

const Transactions = ({
  transactions,
  accounts,
  onSuccess,
}: { transactions: Transaction[]; accounts?: any[]; onSuccess?: () => void }) => {
  const { t } = useTranslation("transactions");
  const navigate = useNavigate();
  const [modalState, setModalState] = useState<{
    mode: "edit" | "duplicate";
    transaction: Transaction;
  } | null>(null);

  return (
    <div className="glass-card h-full flex flex-col p-6">
      <div className="flex flex-row items-center justify-between pb-4">
        <h2 className="typo-section-label flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> {t("recent.title")}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs rounded-full hover:bg-surface-hover-strong text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/transactions")}
        >
          {t("common:actions.viewAll")} <ArrowUpRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        {transactions.length === 0 ? (
          <EmptyState icon={Activity} title={t("recent.empty")} description={t("recent.emptyDescription")} />
        ) : (
          transactions.map((transaction) => (
            <DropdownMenu key={transaction.id}>
              <DropdownMenuTrigger asChild>
                <div className="group relative flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer overflow-hidden">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-surface-overlay border-2 border-background shadow-sm flex items-center justify-center">
                      <span className="text-xs font-bold text-muted-foreground">
                        {transaction.name.charAt(0).toUpperCase()}
                      </span>
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
                      <span
                        className={`shrink-0 font-bold text-sm tabular-nums ${transaction.type === "income" ? "text-income" : "text-foreground"}`}
                      >
                        {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                        {formatCOPWithSymbol(Math.abs(transaction.amount))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">{transaction.email}</span>
                      <span
                        className={`shrink-0 text-[10px] font-medium uppercase tracking-wider ${
                          transaction.status === "Success" ? "text-primary" : "text-warning animate-pulse"
                        }`}
                      >
                        {transaction.status === "Success" ? t("status.success") : t("status.pending")}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuTrigger>

              {accounts && onSuccess && (
                <DropdownMenuContent align="end" className="w-48 glass-panel border-border z-50">
                  <DropdownMenuItem
                    onSelect={() => setModalState({ mode: "edit", transaction })}
                    className="cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    <span>{t("common:actions.edit")}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={() => setModalState({ mode: "duplicate", transaction })}
                    className="cursor-pointer"
                  >
                    <CopyPlus className="w-4 h-4 mr-2" />
                    <span>{t("common:actions.duplicate")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          ))
        )}
      </div>

      {/* Lifted modal for Edit/Duplicate — rendered outside DropdownMenu to avoid Radix focus conflicts */}
      {accounts && onSuccess && modalState && (
        <AddTransactionModal
          accounts={accounts}
          onSuccess={() => {
            setModalState(null);
            onSuccess();
          }}
          editMode={modalState.mode === "edit"}
          transactionId={modalState.mode === "edit" ? String(modalState.transaction.id) : undefined}
          initialData={{
            accountId: modalState.transaction.account_id,
            date:
              modalState.mode === "edit" && modalState.transaction.date
                ? new Date(modalState.transaction.date).toISOString().split("T")[0]
                : undefined,
            totalAmount: Math.abs(modalState.transaction.amount),
            type: modalState.transaction.type,
            payee: modalState.transaction.name,
            notes: modalState.mode === "edit" ? modalState.transaction.notes || "" : undefined,
            isRecurring: modalState.mode === "edit" ? modalState.transaction.is_recurring || false : false,
            recurrenceInterval:
              modalState.mode === "edit" ? (modalState.transaction.recurrence_interval as any) : undefined,
            categoryIds: modalState.transaction.transaction_categories?.map((tc) => tc.category_id) || [],
            splits:
              modalState.mode === "edit"
                ? modalState.transaction.transaction_splits?.length
                  ? modalState.transaction.transaction_splits.map((s) => ({
                      amount: Math.abs(s.amount),
                      assigned_to: s.assigned_to || "Me",
                      status: s.status as any,
                    }))
                  : [{ amount: Math.abs(modalState.transaction.amount), assigned_to: "Me", status: "Settled" as const }]
                : undefined,
          }}
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) setModalState(null);
          }}
        />
      )}
    </div>
  );
};

export default Transactions;
