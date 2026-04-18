import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/supabase/client";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Product } from "./Products";

const MAX_FEATURED = 3;

interface FeaturedAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Product[];
  onSuccess: () => void;
}

export function FeaturedAccountsModal({ open, onOpenChange, accounts, onSuccess }: FeaturedAccountsModalProps) {
  const { t } = useTranslation("accounts");
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Key on id+order so the effect re-runs when the underlying featured state
  // changes, not on every parent re-render (where `accounts` gets a new ref).
  const featuredKey = useMemo(
    () =>
      accounts
        .filter((a) => a.display_order != null)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((a) => `${a.id}:${a.display_order}`)
        .join(","),
    [accounts],
  );

  useEffect(() => {
    if (!open) return;
    const ids = featuredKey ? featuredKey.split(",").map((s) => s.split(":")[0]) : [];
    setSelected(ids.slice(0, MAX_FEATURED));
  }, [open, featuredKey]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_FEATURED) return prev;
      return [...prev, id];
    });
  };

  const move = (id: string, dir: -1 | 1) => {
    setSelected((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      // Clear display_order for all user accounts, then set ordered values in
      // parallel. Max 3 featured accounts, so worst case is 3 concurrent writes.
      const { error: clearError } = await supabase
        .from("accounts")
        .update({ display_order: null })
        .eq("user_id", userId);
      if (clearError) throw clearError;

      const results = await Promise.all(
        selected.map((id, i) =>
          supabase
            .from("accounts")
            .update({ display_order: i + 1 })
            .eq("id", id)
            .eq("user_id", userId),
        ),
      );
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;

      toast.success(t("products.featured.savedToast"));
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update featured accounts", err);
      toast.error(t("products.featured.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSet = new Set(selected);
  const unselected = accounts.filter((a) => !selectedSet.has(String(a.id)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-glass max-w-md">
        <DialogHeader>
          <DialogTitle>{t("products.featured.title")}</DialogTitle>
          <DialogDescription>{t("products.featured.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {selected.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("products.featured.selected", { count: selected.length, max: MAX_FEATURED })}
              </p>
              {selected.map((id, idx) => {
                const acc = accounts.find((a) => String(a.id) === id);
                if (!acc) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-overlay border border-subtle"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-4 tabular-nums">{idx + 1}.</span>
                      <span className="text-sm font-medium truncate">{acc.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(id, -1)}
                        disabled={idx === 0}
                        className="w-6 h-6 rounded hover:bg-surface-hover disabled:opacity-30 flex items-center justify-center"
                        aria-label={t("products.featured.moveUp")}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(id, 1)}
                        disabled={idx === selected.length - 1}
                        className="w-6 h-6 rounded hover:bg-surface-hover disabled:opacity-30 flex items-center justify-center"
                        aria-label={t("products.featured.moveDown")}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="text-xs text-muted-foreground hover:text-destructive ml-1 px-2 py-1 rounded"
                      >
                        {t("products.featured.remove")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {unselected.length > 0 && selected.length < MAX_FEATURED && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("products.featured.available")}
              </p>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {unselected.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => toggle(String(acc.id))}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover text-left transition-colors"
                  >
                    <span className="text-sm truncate">{acc.name}</span>
                    <span className="text-xs text-muted-foreground">+</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t("common:actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {t("common:actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
