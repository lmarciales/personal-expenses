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

interface OffsetSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myDebtSplitIds: string[];
  receivableSplitIds: string[];
  netAmount: number;
  netDirection: "i_owe" | "owed_to_me";
  personName: string;
  accounts: SimpleAccount[];
  onSuccess: () => void;
}

export const OffsetSettlementDialog = ({
  open,
  onOpenChange,
  myDebtSplitIds,
  receivableSplitIds,
  netAmount,
  netDirection,
  personName,
  accounts,
  onSuccess,
}: OffsetSettlementDialogProps) => {
  const { t } = useTranslation("debts");
  const { settleOffset, isProcessing } = useDebtActions();
  const [accountId, setAccountId] = useState<string>("");

  const handleConfirm = async () => {
    await settleOffset(
      myDebtSplitIds,
      receivableSplitIds,
      netAmount,
      netDirection,
      personName,
      accountId && accountId !== "none" ? accountId : undefined,
    );
    setAccountId("");
    onOpenChange(false);
    onSuccess();
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isIOwe = netDirection === "i_owe";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t("offset.confirmTitle")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("offset.confirmDescription", { person: personName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Net Amount */}
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">{t("offset.netAmount")}</p>
            <p className={`text-3xl font-extrabold tracking-tight ${isIOwe ? "text-danger" : "text-success"}`}>
              {formatCOPWithSymbol(netAmount)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isIOwe ? t("offset.youOwe", { person: personName }) : t("offset.theyOwe", { person: personName })}
            </p>
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

          {/* Optional account */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {isIOwe ? t("offset.sourceAccount") : t("offset.receivingAccount")}{" "}
              <span className="text-muted-foreground font-normal">{t("offset.optional")}</span>
            </label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="bg-surface-input border-subtle">
                <SelectValue placeholder={t("offset.noAccount")} />
              </SelectTrigger>
              <SelectContent className="glass-panel border-border">
                <SelectItem value="none">{t("offset.noAccountShort")}</SelectItem>
                {accounts
                  .filter((a) => a.type !== "Credit Card")
                  .map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatCOPWithSymbol(acc.balance)})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 pl-1">
                <ArrowRight className="w-3 h-3" />
                <span>
                  <Trans
                    i18nKey={isIOwe ? "offset.balanceDecreaseInfo" : "offset.balanceIncreaseInfo"}
                    ns="debts"
                    values={{ account: selectedAccount.name, amount: formatCOPWithSymbol(netAmount) }}
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
            className={`shadow-glow-lg ${
              isIOwe
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-success text-success-foreground hover:bg-success/90"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("offset.processing")}
              </>
            ) : (
              t("offset.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
