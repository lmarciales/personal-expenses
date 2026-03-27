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

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSplitIds: string[];
  totalAmount: number;
  targetAccount: { id: string; name: string };
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
  const { settleDebts, isProcessing } = useDebtActions();
  const [sourceAccountId, setSourceAccountId] = useState<string>("");

  const availableAccounts = accounts.filter((a) => a.id !== targetAccount.id && a.type !== "Credit Card");

  const handleConfirm = async () => {
    await settleDebts(selectedSplitIds, totalAmount, targetAccount.id, sourceAccountId || undefined);
    setSourceAccountId("");
    onOpenChange(false);
    onSuccess();
  };

  const sourceAccount = availableAccounts.find((a) => a.id === sourceAccountId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Confirm Payment</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Settle {selectedSplitIds.length} item{selectedSplitIds.length !== 1 ? "s" : ""} on{" "}
            <span className="text-foreground font-semibold">{targetAccount.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Payment amount */}
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Payment</p>
            <p className="text-3xl font-extrabold tracking-tight text-primary">{formatCOPWithSymbol(totalAmount)}</p>
          </div>

          {/* What will happen */}
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <span>
                This will mark all selected splits as <span className="text-foreground font-medium">Settled</span> and
                reduce <span className="text-foreground font-medium">{targetAccount.name}</span> balance by{" "}
                <span className="text-foreground font-medium">{formatCOPWithSymbol(totalAmount)}</span>.
              </span>
            </div>
          </div>

          {/* Optional source account */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Pay from account <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
              <SelectTrigger className="bg-surface-input border-subtle">
                <SelectValue placeholder="No source account (just settle)" />
              </SelectTrigger>
              <SelectContent className="glass-panel border-border">
                <SelectItem value="none">No source account</SelectItem>
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
                  {sourceAccount.name} balance will decrease by {formatCOPWithSymbol(totalAmount)} and a transfer
                  transaction will be auto-created.
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
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
