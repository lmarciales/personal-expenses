import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCOPWithSymbol } from "@/lib/currency";
import { useDebtActions } from "@/hooks/useDebtActions";
import { Loader2, ArrowRight, Info } from "lucide-react";
import { useState } from "react";
import type { SimpleAccount } from "@/hooks/useDebtsData";

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
  const { settleReceivables, isProcessing } = useDebtActions();
  const [receivingAccountId, setReceivingAccountId] = useState<string>("");

  const handleConfirm = async () => {
    await settleReceivables(
      selectedSplitIds,
      totalAmount,
      personName,
      receivingAccountId && receivingAccountId !== "none" ? receivingAccountId : undefined
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
          <DialogTitle className="text-xl font-bold">Mark as Received</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Settle {selectedSplitIds.length} item{selectedSplitIds.length !== 1 ? "s" : ""} from{" "}
            <span className="text-foreground font-semibold">{personName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Amount */}
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Received</p>
            <p className="text-3xl font-extrabold tracking-tight text-success">
              {formatCOPWithSymbol(totalAmount)}
            </p>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <span>
              This will mark all selected splits as <span className="text-foreground font-medium">Settled</span>.
            </span>
          </div>

          {/* Optional receiving account */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Received into account <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Select value={receivingAccountId} onValueChange={setReceivingAccountId}>
              <SelectTrigger className="bg-surface-input border-subtle">
                <SelectValue placeholder="No account (just mark settled)" />
              </SelectTrigger>
              <SelectContent className="glass-panel border-border">
                <SelectItem value="none">No account</SelectItem>
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
                  {receivingAccount.name} balance will increase by {formatCOPWithSymbol(totalAmount)} and an income transaction will be auto-created.
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing} className="border-border">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-success text-success-foreground hover:bg-success/90 shadow-glow-success-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Received"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
