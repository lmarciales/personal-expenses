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
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

interface SettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSplitIds: string[];
  totalAmount: number;
  personName: string;
  accounts: SimpleAccount[];
  onSuccess: () => void;
}

export const SettlementDialog = ({
  open,
  onOpenChange,
  selectedSplitIds,
  totalAmount,
  personName,
  accounts,
  onSuccess,
}: SettlementDialogProps) => {
  const { t } = useTranslation("debts");
  const { settleReceivables, isProcessing } = useDebtActions();
  const [receivingAccountId, setReceivingAccountId] = useState<string>("");

  const handleConfirm = async () => {
    await settleReceivables(
      selectedSplitIds,
      totalAmount,
      personName,
      receivingAccountId && receivingAccountId !== "none" ? receivingAccountId : undefined,
    );
    setReceivingAccountId("");
    onOpenChange(false);
    onSuccess();
  };

  const receivingAccount = accounts.find((a) => a.id === receivingAccountId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t("settlement.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("settlement.settleItems", { count: selectedSplitIds.length, from: personName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Amount */}
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">{t("settlement.totalReceived")}</p>
            <p className="text-3xl font-extrabold tracking-tight text-success">{formatCOPWithSymbol(totalAmount)}</p>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <span>
              <Trans
                i18nKey="settlement.description"
                ns="debts"
                components={{ bold: <strong className="text-foreground" /> }}
              />
            </span>
          </div>

          {/* Optional receiving account */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("settlement.receivedIntoAccount")}{" "}
              <span className="text-muted-foreground font-normal">{t("settlement.optional")}</span>
            </label>
            <Select value={receivingAccountId} onValueChange={setReceivingAccountId}>
              <SelectTrigger className="bg-surface-input border-subtle">
                <SelectValue placeholder={t("settlement.noAccount")} />
              </SelectTrigger>
              <SelectContent className="glass-panel border-border">
                <SelectItem value="none">{t("settlement.noAccountShort")}</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({formatCOPWithSymbol(acc.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {receivingAccount && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 pl-1">
                <ArrowRight className="w-3 h-3" />
                <span>
                  <Trans
                    i18nKey="settlement.balanceIncreaseInfo"
                    ns="debts"
                    values={{ account: receivingAccount.name, amount: formatCOPWithSymbol(totalAmount) }}
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
            disabled={isProcessing}
            className="bg-success text-success-foreground hover:bg-success/90 shadow-glow-success-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("settlement.processing")}
              </>
            ) : (
              t("settlement.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
