import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebtActions } from "@/hooks/useDebtActions";
import type { SimpleAccount } from "@/hooks/useDebtsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { ArrowRight, Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSplitIds: string[];
  totalAmount: number;
  targetAccount: { id: string; name: string; type: string };
  accounts: SimpleAccount[];
  onSuccess: () => void;
}

export const PaymentDialog = ({
  open,
  onOpenChange,
  selectedSplitIds,
  totalAmount,
  targetAccount,
  accounts,
  onSuccess,
}: PaymentDialogProps) => {
  const { t } = useTranslation("debts");
  const { settleDebts, isProcessing } = useDebtActions();
  const [sourceAccountId, setSourceAccountId] = useState<string>("");
  const [editableAmount, setEditableAmount] = useState<number | undefined>(totalAmount);
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    if (open) {
      setEditableAmount(totalAmount);
      setInputKey((k) => k + 1);
    }
  }, [open, totalAmount]);

  const availableAccounts = accounts.filter((a) => a.id !== targetAccount.id && a.type !== "Credit Card");

  const actualAmount = editableAmount ?? totalAmount;
  const amountDiffers = Math.abs(actualAmount - totalAmount) > 0.01;

  const handleConfirm = async () => {
    let notes: string | undefined;
    if (amountDiffers) {
      notes = `${t("payment.expectedNote")}: ${formatCOPWithSymbol(totalAmount)}, ${t("payment.paidNote")}: ${formatCOPWithSymbol(actualAmount)}`;
    }
    await settleDebts(
      selectedSplitIds,
      actualAmount,
      targetAccount.id,
      sourceAccountId && sourceAccountId !== "none" ? sourceAccountId : undefined,
      notes,
    );
    setSourceAccountId("");
    onOpenChange(false);
    onSuccess();
  };

  const sourceAccount = availableAccounts.find((a) => a.id === sourceAccountId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t("payment.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("payment.settleItems", { count: selectedSplitIds.length, account: targetAccount.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Payment amount — editable */}
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">{t("payment.totalPayment")}</p>
            <div className="flex items-center justify-center">
              <span className="text-3xl font-extrabold tracking-tight text-primary mr-1">$</span>
              <CurrencyInput
                key={inputKey}
                value={editableAmount}
                onChange={(val) => setEditableAmount(val)}
                className="text-3xl font-extrabold tracking-tight text-primary text-center bg-transparent border-none shadow-none ring-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-auto py-1 w-full"
              />
            </div>
            {amountDiffers && (
              <p className="text-xs text-muted-foreground mt-2">
                {t("payment.expectedAmount", { amount: formatCOPWithSymbol(totalAmount) })}
              </p>
            )}
          </div>

          {/* What will happen */}
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <span>
                <Trans
                  i18nKey="payment.description"
                  ns="debts"
                  values={{ account: targetAccount.name, amount: formatCOPWithSymbol(actualAmount) }}
                  components={{ bold: <strong className="text-foreground" /> }}
                />
              </span>
            </div>
            {targetAccount.type === "Credit Card" && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-success" />
                <span>
                  <Trans
                    i18nKey="payment.balanceIncreaseTarget"
                    ns="debts"
                    values={{ account: targetAccount.name, amount: formatCOPWithSymbol(actualAmount) }}
                    components={{ bold: <strong className="text-foreground" /> }}
                  />
                </span>
              </div>
            )}
          </div>

          {/* Optional source account */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("payment.payFromAccount")}{" "}
              <span className="text-muted-foreground font-normal">{t("payment.optional")}</span>
            </label>
            <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
              <SelectTrigger className="bg-surface-input border-subtle">
                <SelectValue placeholder={t("payment.noSourceAccount")} />
              </SelectTrigger>
              <SelectContent className="glass-panel border-border">
                <SelectItem value="none">{t("payment.noSourceAccountShort")}</SelectItem>
                {availableAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({formatCOPWithSymbol(acc.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sourceAccount && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 pl-1">
                <ArrowRight className="w-3 h-3" />
                <span>
                  <Trans
                    i18nKey="payment.balanceDecreaseInfo"
                    ns="debts"
                    values={{ account: sourceAccount.name, amount: formatCOPWithSymbol(actualAmount) }}
                    components={{ bold: <strong className="text-foreground" /> }}
                  />
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="border-border"
          >
            {t("common:actions.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !editableAmount || editableAmount <= 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("payment.processing")}
              </>
            ) : (
              t("payment.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
