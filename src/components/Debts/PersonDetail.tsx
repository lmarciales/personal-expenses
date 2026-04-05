import { Button } from "@/components/ui/button";
import { useDebtActions } from "@/hooks/useDebtActions";
import type { DebtItem, SimpleAccount } from "@/hooks/useDebtsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { getDateLocale } from "@/lib/dateFnsLocale";
import { parseLocalDate } from "@/lib/dates";
import { format } from "date-fns";
import { CheckSquare, Info, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { OffsetSettlementDialog } from "./OffsetSettlementDialog";
import { PaymentDialog } from "./PaymentDialog";
import { SettlementDialog } from "./SettlementDialog";

interface PersonDetailProps {
  person: string;
  iOweItems: DebtItem[];
  owedToMeItems: (DebtItem & { accountName: string })[];
  accounts: SimpleAccount[];
  onSuccess: () => void;
}

export const PersonDetail = ({ person, iOweItems, owedToMeItems, accounts, onSuccess }: PersonDetailProps) => {
  const { t } = useTranslation("debts");
  const { settleOffset, isProcessing } = useDebtActions();
  const hasBothSides = iOweItems.length > 0 && owedToMeItems.length > 0;

  // Checkbox state
  const [selectedMyDebtIds, setSelectedMyDebtIds] = useState<Set<string>>(
    () => new Set(iOweItems.map((i) => i.splitId)),
  );
  const [selectedReceivableIds, setSelectedReceivableIds] = useState<Set<string>>(
    () => new Set(owedToMeItems.map((i) => i.splitId)),
  );

  // One-sided dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [offsetDialogOpen, setOffsetDialogOpen] = useState(false);

  // Computed totals
  const selectedIOweTotal = useMemo(
    () => iOweItems.filter((i) => selectedMyDebtIds.has(i.splitId)).reduce((sum, i) => sum + i.amount, 0),
    [iOweItems, selectedMyDebtIds],
  );
  const selectedOwedToMeTotal = useMemo(
    () => owedToMeItems.filter((i) => selectedReceivableIds.has(i.splitId)).reduce((sum, i) => sum + i.amount, 0),
    [owedToMeItems, selectedReceivableIds],
  );

  const offsetAmount = Math.min(selectedIOweTotal, selectedOwedToMeTotal);
  const netBalance = selectedIOweTotal - selectedOwedToMeTotal;
  const absNet = Math.abs(netBalance);

  const toggleMyDebt = (splitId: string) => {
    setSelectedMyDebtIds((prev) => {
      const next = new Set(prev);
      if (next.has(splitId)) next.delete(splitId);
      else next.add(splitId);
      return next;
    });
  };

  const toggleReceivable = (splitId: string) => {
    setSelectedReceivableIds((prev) => {
      const next = new Set(prev);
      if (next.has(splitId)) next.delete(splitId);
      else next.add(splitId);
      return next;
    });
  };

  const toggleAllMyDebts = () => {
    if (selectedMyDebtIds.size === iOweItems.length) {
      setSelectedMyDebtIds(new Set());
    } else {
      setSelectedMyDebtIds(new Set(iOweItems.map((i) => i.splitId)));
    }
  };

  const toggleAllReceivables = () => {
    if (selectedReceivableIds.size === owedToMeItems.length) {
      setSelectedReceivableIds(new Set());
    } else {
      setSelectedReceivableIds(new Set(owedToMeItems.map((i) => i.splitId)));
    }
  };

  const handleSettleAll = async () => {
    await settleOffset(Array.from(selectedMyDebtIds), Array.from(selectedReceivableIds), 0, "none", person);
    onSuccess();
  };

  const hasSelections = selectedMyDebtIds.size > 0 || selectedReceivableIds.size > 0;
  const hasBothSelections = selectedMyDebtIds.size > 0 && selectedReceivableIds.size > 0;

  const renderItemList = (
    items: (DebtItem & { accountName?: string })[],
    selectedIds: Set<string>,
    toggleFn: (id: string) => void,
    toggleAllFn: () => void,
    color: "danger" | "success",
  ) => {
    const allSelected = selectedIds.size === items.length && items.length > 0;
    return (
      <div className="space-y-1">
        {/* Select All */}
        <button
          type="button"
          onClick={toggleAllFn}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          {allSelected ? (
            <CheckSquare className={`w-3.5 h-3.5 ${color === "danger" ? "text-primary" : "text-success"}`} />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
          {t("common:actions.selectAll")}
        </button>
        {items.map((item) => {
          const isSelected = selectedIds.has(item.splitId);
          return (
            <button
              key={item.splitId}
              type="button"
              onClick={() => toggleFn(item.splitId)}
              className={`w-full flex items-center gap-2 p-2.5 rounded-lg transition-colors text-left ${
                isSelected
                  ? color === "danger"
                    ? "bg-primary/5"
                    : "bg-success/5"
                  : "bg-background/50 hover:bg-surface-hover"
              }`}
            >
              {isSelected ? (
                <CheckSquare
                  className={`w-3.5 h-3.5 shrink-0 ${color === "danger" ? "text-primary" : "text-success"}`}
                />
              ) : (
                <Square className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.payee}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseLocalDate(item.date), "MMM d, yyyy", { locale: getDateLocale() })}
                  {"accountName" in item && item.accountName && ` · ${item.accountName}`}
                </p>
              </div>
              <span className={`text-sm font-semibold ${color === "danger" ? "text-danger" : "text-success"}`}>
                {formatCOPWithSymbol(item.amount)}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // One-sided: only "I owe"
  if (!hasBothSides && iOweItems.length > 0) {
    return (
      <div className="p-4 bg-background/30 space-y-3">
        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-danger">{t("people.iOwe")}</span>
            <span className="text-sm font-bold text-danger">{formatCOPWithSymbol(selectedIOweTotal)}</span>
          </div>
          {renderItemList(iOweItems, selectedMyDebtIds, toggleMyDebt, toggleAllMyDebts, "danger")}
        </div>
        {selectedMyDebtIds.size > 0 && (
          <div className="flex justify-end">
            <Button
              onClick={() => setPaymentDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-lg"
            >
              {t("myDebts.paySelected")}
            </Button>
          </div>
        )}
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          selectedSplitIds={Array.from(selectedMyDebtIds)}
          totalAmount={selectedIOweTotal}
          targetAccount={{ id: "external", name: "Externo", type: "External" }}
          accounts={accounts}
          onSuccess={onSuccess}
        />
      </div>
    );
  }

  // One-sided: only "Owed to me"
  if (!hasBothSides && owedToMeItems.length > 0) {
    return (
      <div className="p-4 bg-background/30 space-y-3">
        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-success">{t("people.owedToMe")}</span>
            <span className="text-sm font-bold text-success">{formatCOPWithSymbol(selectedOwedToMeTotal)}</span>
          </div>
          {renderItemList(owedToMeItems, selectedReceivableIds, toggleReceivable, toggleAllReceivables, "success")}
        </div>
        {selectedReceivableIds.size > 0 && (
          <div className="flex justify-end">
            <Button
              onClick={() => setSettlementDialogOpen(true)}
              className="bg-success text-success-foreground hover:bg-success/90 shadow-glow-success-lg"
            >
              {t("owedToMe.markAsReceived")}
            </Button>
          </div>
        )}
        <SettlementDialog
          open={settlementDialogOpen}
          onOpenChange={setSettlementDialogOpen}
          selectedSplitIds={Array.from(selectedReceivableIds)}
          totalAmount={selectedOwedToMeTotal}
          personName={person}
          accounts={accounts}
          onSuccess={onSuccess}
        />
      </div>
    );
  }

  // Two-sided: both directions
  return (
    <div className="p-4 bg-background/30 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* I Owe column */}
        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-danger">{t("people.iOwe")}</span>
            <span className="text-sm font-bold text-danger">{formatCOPWithSymbol(selectedIOweTotal)}</span>
          </div>
          {renderItemList(iOweItems, selectedMyDebtIds, toggleMyDebt, toggleAllMyDebts, "danger")}
        </div>

        {/* Owed to Me column */}
        <div className="bg-surface-overlay/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-success">{t("people.owedToMe")}</span>
            <span className="text-sm font-bold text-success">{formatCOPWithSymbol(selectedOwedToMeTotal)}</span>
          </div>
          {renderItemList(owedToMeItems, selectedReceivableIds, toggleReceivable, toggleAllReceivables, "success")}
        </div>
      </div>

      {/* Settlement Suggestion */}
      {hasSelections && (
        <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 border border-indigo-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-indigo-300" />
            <span className="text-sm font-semibold text-indigo-200">{t("offset.suggestedSettlement")}</span>
          </div>
          <div className="text-sm text-indigo-100 leading-relaxed">
            {hasBothSelections && (
              <p>
                <Trans
                  i18nKey="offset.offsetAmount"
                  ns="debts"
                  values={{ amount: formatCOPWithSymbol(offsetAmount) }}
                  components={{ bold: <strong className="text-foreground" /> }}
                />
              </p>
            )}
            {netBalance > 0 ? (
              <p>
                <Trans
                  i18nKey="offset.remainingIOwe"
                  ns="debts"
                  values={{ person, amount: formatCOPWithSymbol(absNet) }}
                  components={{ bold: <strong className="text-foreground" /> }}
                />
              </p>
            ) : netBalance < 0 ? (
              <p>
                <Trans
                  i18nKey="offset.remainingOwedToMe"
                  ns="debts"
                  values={{ person, amount: formatCOPWithSymbol(absNet) }}
                  components={{ bold: <strong className="text-foreground" /> }}
                />
              </p>
            ) : hasBothSelections ? (
              <p className="text-indigo-200">{t("offset.fullyOffset")}</p>
            ) : null}
          </div>
          <div className="flex gap-3 mt-3">
            <Button
              onClick={handleSettleAll}
              disabled={isProcessing}
              className="bg-indigo-500 hover:bg-indigo-400 text-white"
            >
              {t("offset.settleAll")}
            </Button>
            {absNet > 0 && (
              <Button
                variant="outline"
                onClick={() => setOffsetDialogOpen(true)}
                className="border-indigo-500 text-indigo-200 hover:bg-indigo-800"
              >
                {netBalance > 0
                  ? t("offset.payDifference", { amount: formatCOPWithSymbol(absNet) })
                  : t("offset.receiveDifference", { amount: formatCOPWithSymbol(absNet) })}
              </Button>
            )}
          </div>
        </div>
      )}

      <OffsetSettlementDialog
        open={offsetDialogOpen}
        onOpenChange={setOffsetDialogOpen}
        myDebtSplitIds={Array.from(selectedMyDebtIds)}
        receivableSplitIds={Array.from(selectedReceivableIds)}
        netAmount={absNet}
        netDirection={netBalance > 0 ? "i_owe" : "owed_to_me"}
        personName={person}
        accounts={accounts}
        onSuccess={onSuccess}
      />
    </div>
  );
};
