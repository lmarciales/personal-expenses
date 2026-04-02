import { Button } from "@/components/ui/button";
import type { PersonDebtGroup, SimpleAccount } from "@/hooks/useDebtsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { getDateLocale } from "@/lib/dateFnsLocale";
import { parseLocalDate } from "@/lib/dates";
import { format } from "date-fns";
import { CheckSquare, PartyPopper, Square, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettlementDialog } from "./SettlementDialog";

interface OwedToMeTabProps {
  groups: PersonDebtGroup[];
  accounts: SimpleAccount[];
  onSettled: () => void;
}

export const OwedToMeTab = ({ groups, accounts, onSettled }: OwedToMeTabProps) => {
  const { t } = useTranslation("debts");
  const [selectedSplits, setSelectedSplits] = useState<Map<string, Set<string>>>(new Map());
  const [settlementDialog, setSettlementDialog] = useState<{
    open: boolean;
    person: string;
    splitIds: string[];
    total: number;
  }>({ open: false, person: "", splitIds: [], total: 0 });

  if (groups.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <PartyPopper className="w-12 h-12 text-primary mx-auto mb-4 opacity-60" />
        <h3 className="text-lg font-semibold mb-2">{t("owedToMe.empty")}</h3>
        <p className="text-muted-foreground text-sm">{t("owedToMe.emptyDescription")}</p>
      </div>
    );
  }

  const toggleSplit = (person: string, splitId: string) => {
    setSelectedSplits((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(person) || []);
      if (set.has(splitId)) set.delete(splitId);
      else set.add(splitId);
      next.set(person, set);
      return next;
    });
  };

  const toggleAllForPerson = (person: string, items: { splitId: string }[]) => {
    setSelectedSplits((prev) => {
      const next = new Map(prev);
      const current = next.get(person) || new Set();
      if (current.size === items.length) {
        next.set(person, new Set());
      } else {
        next.set(person, new Set(items.map((i) => i.splitId)));
      }
      return next;
    });
  };

  const getSelectedForPerson = (person: string) => selectedSplits.get(person) || new Set<string>();

  const getSelectedTotal = (person: string, items: { splitId: string; amount: number }[]) => {
    const selected = getSelectedForPerson(person);
    return items.filter((i) => selected.has(i.splitId)).reduce((sum, i) => sum + i.amount, 0);
  };

  const openSettlement = (group: PersonDebtGroup) => {
    const selected = getSelectedForPerson(group.person);
    const splitIds = Array.from(selected);
    const total = getSelectedTotal(group.person, group.items);
    setSettlementDialog({
      open: true,
      person: group.person,
      splitIds,
      total,
    });
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const selected = getSelectedForPerson(group.person);
        const selectedTotal = getSelectedTotal(group.person, group.items);
        const allSelected = selected.size === group.items.length && group.items.length > 0;

        return (
          <div key={group.person} className="glass-card rounded-2xl overflow-hidden">
            {/* Person Header */}
            <div className="p-5 border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{group.person}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t("owedToMe.pendingItems", { count: group.items.length })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t("owedToMe.totalOwed")}</p>
                <p className="text-lg font-bold text-success">{formatCOPWithSymbol(group.total)}</p>
              </div>
            </div>

            {/* Select All */}
            <div className="px-5 py-3 border-b border-subtle bg-surface-overlay/30 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleAllForPerson(group.person, group.items)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? <CheckSquare className="w-4 h-4 text-success" /> : <Square className="w-4 h-4" />}
                {t("common:actions.selectAll")}
              </button>
              {selected.size > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("owedToMe.selectedInfo", { count: selected.size, amount: formatCOPWithSymbol(selectedTotal) })}
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
                    onClick={() => toggleSplit(group.person, item.splitId)}
                    className={`w-full px-5 py-3 flex items-center justify-between hover:bg-surface-hover transition-colors text-left ${
                      isSelected ? "bg-success/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.payee}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseLocalDate(item.date), "MMM d, yyyy", { locale: getDateLocale() })} &middot;{" "}
                          {item.accountName}
                        </p>
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
                  {t("owedToMe.selectedInfo", { count: selected.size, amount: formatCOPWithSymbol(selectedTotal) })}
                </div>
                <Button
                  onClick={() => openSettlement(group)}
                  className="bg-success text-success-foreground hover:bg-success/90 shadow-glow-success-lg"
                >
                  {t("owedToMe.markAsReceived")}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      <SettlementDialog
        open={settlementDialog.open}
        onOpenChange={(open) => setSettlementDialog((prev) => ({ ...prev, open }))}
        selectedSplitIds={settlementDialog.splitIds}
        totalAmount={settlementDialog.total}
        personName={settlementDialog.person}
        accounts={accounts}
        onSuccess={onSettled}
      />
    </div>
  );
};
