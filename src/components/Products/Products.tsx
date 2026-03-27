import { formatCOPWithSymbol } from "@/lib/currency";
import { supabase } from "@/supabase/client";
import { ArrowUpRight, CreditCard, Loader2, MoreVertical, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AddAccountModal } from "./AddAccountModal";

export interface Product {
  id: string | number;
  name: string;
  balance: number;
  color: string;
  type?: string;
}

const Products = ({ products, onAccountAdded }: { products: Product[]; onAccountAdded: () => void }) => {
  const { t } = useTranslation("accounts");
  const navigate = useNavigate();
  const totalBalance = products.reduce((sum, p) => sum + p.balance, 0);

  // Lifted modal state for edit
  const [editState, setEditState] = useState<{ product: Product } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (product: Product) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const accountId = String(product.id);
      const { count, error: countError } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);

      if (countError) throw countError;

      const txCount = count || 0;
      const message =
        txCount > 0
          ? t("deleteConfirm.withTransactions", { name: product.name, count: txCount })
          : t("deleteConfirm.simple", { name: product.name });

      if (!window.confirm(message)) return;

      setDeletingId(accountId);

      const { error } = await supabase.rpc("delete_account_cascade", {
        p_account_id: accountId,
        p_user_id: userData.user.id,
      });

      if (error) throw error;
      onAccountAdded();
    } catch (error) {
      console.error("Failed to delete account", error);
      toast.error(t("toast.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-card rounded-2xl h-full flex flex-col p-6">
      <div className="flex flex-row items-start justify-between pb-4">
        <div>
          <h2 className="typo-section-label flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" /> {t("products.totalBalance")}
          </h2>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="typo-amount-xl">{formatCOPWithSymbol(totalBalance)}</span>
            <span className="text-sm text-primary font-medium tracking-wide">COP</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover-strong"
          onClick={() => navigate("/accounts")}
          title={t("products.manageAccounts")}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="typo-section-label">{t("products.myAccounts")}</h3>
          <div className="flex items-center gap-1">
            {products.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover-strong"
                  onClick={() => navigate("/accounts")}
                >
                  {t("common:actions.viewAll")} <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
                <AddAccountModal onSuccess={onAccountAdded}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover-strong gap-1"
                    title={t("addAccount")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("common:actions.add")}</span>
                  </Button>
                </AddAccountModal>
              </>
            )}
          </div>
        </div>
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 bg-surface-input border border-subtle rounded-xl text-center space-y-3">
            <p className="text-sm text-muted-foreground italic">{t("products.noAccounts")}</p>
            <AddAccountModal onSuccess={onAccountAdded}>
              <Button
                variant="outline"
                className="w-full border-primary/50 text-primary hover:bg-primary/20 shadow-glow-sm bg-transparent"
              >
                <Plus className="mr-2 h-4 w-4" /> {t("products.addFirst")}
              </Button>
            </AddAccountModal>
          </div>
        ) : (
          <>
            {products.slice(0, 3).map((product) => (
              <DropdownMenu key={product.id}>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-overlay border border-subtle hover:bg-surface-hover transition-colors group cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-lg ${product.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105`}
                      >
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                          {product.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {product.type || t("products.account")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatCOPWithSymbol(product.balance)}</div>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 glass-panel border-border z-50">
                  <DropdownMenuItem onSelect={() => setEditState({ product })} className="cursor-pointer">
                    <Pencil className="w-4 h-4 mr-2" />
                    {t("common:actions.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleDelete(product)}
                    className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    {deletingId === String(product.id) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    {t("common:actions.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
            {products.length > 3 && (
              <button
                onClick={() => navigate("/accounts")}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors py-1.5 cursor-pointer"
              >
                {t("products.moreAccounts", { count: products.length - 3 })}
              </button>
            )}
          </>
        )}
      </div>

      {/* Lifted edit modal */}
      {editState && (
        <AddAccountModal
          editMode
          accountId={String(editState.product.id)}
          initialData={{
            name: editState.product.name,
            type: editState.product.type || "",
            balance: editState.product.balance,
          }}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditState(null);
          }}
          onSuccess={() => {
            setEditState(null);
            onAccountAdded();
          }}
        />
      )}
    </div>
  );
};

export default Products;
