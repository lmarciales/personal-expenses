import { Button } from "@/components/ui/button";
import type { AccountDebtGroup, SimpleAccount } from "@/hooks/useDebtsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { format } from "date-fns";
import { CheckCheck, CheckSquare, CreditCard, Square } from "lucide-react";
import { useState } from "react";
import { PaymentDialog } from "./PaymentDialog";

interface MyDebtsTabProps {
  groups: AccountDebtGroup[];
  accounts: SimpleAccount[];
  onSettled: () => void;
}

export const MyDebtsTab = ({ groups, accounts, onSettled }: MyDebtsTabProps) => {
  const [selectedSplits, setSelectedSplits] = useState<Map<string, Set<string>>>(new Map());
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    accountId: string;
    accountName: string;
    splitIds: string[];
    total: number;
  }>({ open: false, accountId: "", accountName: "", splitIds: [], total: 0 });

  if (groups.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <CheckCheck className="w-12 h-12 text-primary mx-auto mb-4 opacity-60" />
        <h3 className="text-lg font-semibold mb-2">No pending debts</h3>
        <p className="text-muted-foreground text-sm">All your payments are settled. You're all caught up!</p>
      </div>
    );
  }

  const toggleSplit = (accountId: string, splitId: string) => {
    setSelectedSplits((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(accountId) || []);
      if (set.has(splitId)) set.delete(splitId);
      else set.add(splitId);
      next.set(accountId, set);
      return next;
    });
  };

  const toggleAllForAccount = (accountId: string, items: { splitId: string }[]) => {
    setSelectedSplits((prev) => {
      const next = new Map(prev);
      const current = next.get(accountId) || new Set();
      if (current.size === items.length) {
        next.set(accountId, new Set());
      } else {
        next.set(accountId, new Set(items.map((i) => i.splitId)));
      }
      return next;
    });
  };

  const getSelectedForAccount = (accountId: string) => selectedSplits.get(accountId) || new Set<string>();

  const getSelectedTotal = (accountId: string, items: { splitId: string; amount: number }[]) => {
    const selected = getSelectedForAccount(accountId);
    return items.filter((i) => selected.has(i.splitId)).reduce((sum, i) => sum + i.amount, 0);
  };

  const openPayment = (group: AccountDebtGroup) => {
    const selected = getSelectedForAccount(group.account.id);
    const splitIds = Array.from(selected);
    const total = group.items.filter((i) => selected.has(i.splitId)).reduce((s, i) => s + i.amount, 0);
    setPaymentDialog({
      open: true,
      accountId: group.account.id,
      accountName: group.account.name,
      splitIds,
      total,
    });
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const selected = getSelectedForAccount(group.account.id);
        const selectedTotal = getSelectedTotal(group.account.id, group.items);
        const allSelected = selected.size === group.items.length && group.items.length > 0;

        return (
          <div key={group.account.id} className="glass-card rounded-2xl overflow-hidden">
            {/* Account Header */}
            <div className="p-5 border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: group.account.color ? `${group.account.color}20` : "rgba(99,102,241,0.1)" }}
                >
                  <CreditCard className="w-5 h-5" style={{ color: group.account.color || "#6366f1" }} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{group.account.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {group.account.type} &middot; {group.items.length} pending item{group.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Pending</p>
                <p className="text-lg font-bold text-danger">{formatCOPWithSymbol(group.total)}</p>
              </div>
            </div>

            {/* Select All */}
            <div className="px-5 py-3 border-b border-subtle bg-surface-overlay/30 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleAllForAccount(group.account.id, group.items)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                Select All
              </button>
              {selected.size > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selected.size} selected &middot;{" "}
                  <span className="text-foreground font-semibold">{formatCOPWithSymbol(selectedTotal)}</span>
                </span>
              )}
            </div>

            {/* Items */}
            <div className="divide-y divide-subtle">
              {group.items.map((item) => {
                const isSelected = selected.has(item.splitId);
                return (
                  <button
                    key={item.splitId}
                    type="button"
                    onClick={() => toggleSplit(group.account.id, item.splitId)}
                    className={`w-full px-5 py-3 flex items-center justify-between hover:bg-surface-hover transition-colors text-left ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.payee}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatCOPWithSymbol(item.amount)}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Footer */}
            {selected.size > 0 && (
              <div className="p-4 border-t border-subtle bg-surface-overlay/50 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="text-foreground font-semibold">{selected.size}</span> item
                  {selected.size !== 1 ? "s" : ""} &middot;{" "}
                  <span className="text-foreground font-bold">{formatCOPWithSymbol(selectedTotal)}</span>
                </div>
                <Button
                  onClick={() => openPayment(group)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-lg"
                >
                  Pay Selected
                </Button>
              </div>
            )}
          </div>
        );
      })}

      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog((prev) => ({ ...prev, open }))}
        selectedSplitIds={paymentDialog.splitIds}
        totalAmount={paymentDialog.total}
        targetAccount={{ id: paymentDialog.accountId, name: paymentDialog.accountName }}
        accounts={accounts}
        onSuccess={onSettled}
      />
    </div>
  );
};
