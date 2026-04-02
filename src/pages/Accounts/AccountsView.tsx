import { AccountDetailModal } from "@/components/Accounts/AccountDetailModal";
import { AddAccountModal } from "@/components/Products/AddAccountModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type AccountWithStats, useAccountsData } from "@/hooks/useAccountsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { getProjectedBalance } from "@/lib/projectedBalance";
import { supabase } from "@/supabase/client";
import {
  ArrowUpDown,
  CreditCard,
  Hash,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const AccountsView = () => {
  const { t } = useTranslation("accounts");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"balance" | "name" | "type" | "created_at">("balance");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { accounts, accountTypes, isLoading, error, refetch, totalBalance, countByType } = useAccountsData({
    search,
    types: typeFilter,
    sortBy,
    sortDir,
  });

  // Lifted modal states
  const [detailAccount, setDetailAccount] = useState<AccountWithStats | null>(null);
  const [editState, setEditState] = useState<{ account: AccountWithStats } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (account: AccountWithStats) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const { count, error: countError } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id);

      if (countError) throw countError;

      const txCount = count || 0;
      const message =
        txCount > 0
          ? t("deleteConfirm.withTransactions", { name: account.name, count: txCount })
          : t("deleteConfirm.simple", { name: account.name });

      if (!window.confirm(message)) return;

      setDeletingId(account.id);

      const { error } = await supabase.rpc("delete_account_cascade", {
        p_account_id: account.id,
        p_user_id: userData.user.id,
      });

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error("Failed to delete account", error);
      toast.error(t("toast.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const totalAccounts = Object.values(countByType).reduce((s, n) => s + n, 0);
  const typeBreakdown = Object.entries(countByType)
    .map(([type, count]) => `${count} ${type}`)
    .join(" · ");

  const isFiltered = search.length > 0 || typeFilter.length > 0;
  const filteredBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center flex-col gap-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">{t("error.title")}</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("common:actions.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="glass-card p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="typo-page-title">{t("header.title")}</h1>
          <p className="typo-page-subtitle">{t("header.subtitle")}</p>
        </div>
        <AddAccountModal onSuccess={refetch}>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-xl transition-all">
            <Plus className="w-4 h-4 mr-2" />
            {t("addAccount")}
          </Button>
        </AddAccountModal>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {isFiltered ? t("filteredBalance") : t("totalBalance")}
            </span>
          </div>
          <p className="typo-amount-md">{formatCOPWithSymbol(isFiltered ? filteredBalance : totalBalance)}</p>
          {isFiltered && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("of")} {formatCOPWithSymbol(totalBalance)}
            </p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {isFiltered ? t("showing") : t("totalAccounts")}
            </span>
          </div>
          <p className="typo-amount-md">{isFiltered ? accounts.length : totalAccounts}</p>
          {isFiltered && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("of")} {totalAccounts}
            </p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("byType")}</span>
          </div>
          <p className="text-sm font-medium text-foreground">{typeBreakdown || "—"}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
          />
        </div>

        <Select
          value={typeFilter.length === 1 ? typeFilter[0] : "all"}
          onValueChange={(v) => setTypeFilter(v === "all" ? [] : [v])}
        >
          <SelectTrigger className="w-full sm:w-44 bg-secondary/50 border-border rounded-full">
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent className="glass-panel border-glass">
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            {accountTypes.map((t) => (
              <SelectItem key={t.name} value={t.name}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={`${sortBy}-${sortDir}`}
          onValueChange={(v) => {
            const [field, dir] = v.split("-") as [typeof sortBy, typeof sortDir];
            setSortBy(field);
            setSortDir(dir);
          }}
        >
          <SelectTrigger className="w-full sm:w-48 bg-secondary/50 border-border rounded-full">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="glass-panel border-glass">
            <SelectItem value="balance-desc">{t("sort.balanceHighToLow")}</SelectItem>
            <SelectItem value="balance-asc">{t("sort.balanceLowToHigh")}</SelectItem>
            <SelectItem value="name-asc">{t("sort.nameAZ")}</SelectItem>
            <SelectItem value="name-desc">{t("sort.nameZA")}</SelectItem>
            <SelectItem value="type-asc">{t("sort.typeAZ")}</SelectItem>
            <SelectItem value="created_at-desc">{t("sort.newestFirst")}</SelectItem>
            <SelectItem value="created_at-asc">{t("sort.oldestFirst")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-card rounded-2xl p-8">
          <EmptyState
            icon={Wallet}
            title={search || typeFilter.length > 0 ? t("emptyFiltered.title") : t("empty.title")}
            description={search || typeFilter.length > 0 ? t("emptyFiltered.description") : t("empty.description")}
            action={
              !search && typeFilter.length === 0 ? (
                <AddAccountModal onSuccess={refetch}>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("empty.addFirst")}
                  </Button>
                </AddAccountModal>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const utilization =
              account.credit_limit != null && account.credit_limit > 0
                ? (account.credit_limit - account.balance) / account.credit_limit
                : 0;
            return (
              <div
                key={account.id}
                className="glass-card rounded-2xl p-5 group hover:border-primary/30 transition-all cursor-pointer relative"
                onClick={() => setDetailAccount(account)}
              >
                {/* Dropdown - stop propagation to prevent detail modal */}
                <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-hover-strong"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 glass-panel border-border z-50">
                      <DropdownMenuItem onSelect={() => setEditState({ account })} className="cursor-pointer">
                        <Pencil className="w-4 h-4 mr-2" />
                        {t("common:actions.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleDelete(account)}
                        className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        {deletingId === account.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        {t("common:actions.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Card Content */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${account.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105`}
                  >
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base group-hover:text-primary transition-colors">{account.name}</h3>
                    <span className="text-xs text-muted-foreground">{account.type}</span>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    {account.type === "Credit Card" ? (
                      <>
                        <p className="text-xs text-muted-foreground mb-0.5">{t("card.availableCredit")}</p>
                        <p className="text-lg font-bold tabular-nums">{formatCOPWithSymbol(account.balance)}</p>
                        {account.credit_limit != null && (
                          <>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("card.currentDebt")}:{" "}
                              {formatCOPWithSymbol(Math.max(0, account.credit_limit - account.balance))}
                            </p>
                            <div className="w-full bg-muted/50 rounded-full h-1.5 mt-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(0, utilization * 100))}%`,
                                  backgroundColor:
                                    utilization > 0.8 ? "#ef4444" : utilization > 0.5 ? "#f59e0b" : "#22c55e",
                                }}
                              />
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {account.interest_rate != null ? (
                          <>
                            <p className="text-xs text-muted-foreground mb-0.5">{t("card.projectedBalance")}</p>
                            <p className="text-lg font-bold tabular-nums">
                              ~{formatCOPWithSymbol(getProjectedBalance(account))}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t("card.annualRate", { rate: account.interest_rate })}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground mb-0.5">{t("card.balance")}</p>
                            <p className="text-lg font-bold tabular-nums">{formatCOPWithSymbol(account.balance)}</p>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {account.transactionCount} {t("card.transactions")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("card.since")}{" "}
                      {new Date(account.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lifted modals */}
      <AccountDetailModal
        account={detailAccount}
        open={!!detailAccount}
        onOpenChange={(open) => {
          if (!open) setDetailAccount(null);
        }}
        onEdit={(account) => {
          setDetailAccount(null);
          setEditState({ account });
        }}
      />

      {editState && (
        <AddAccountModal
          editMode
          accountId={editState.account.id}
          initialData={{
            name: editState.account.name,
            type: editState.account.type,
            balance: editState.account.balance,
            credit_limit: editState.account.credit_limit,
            interest_rate: editState.account.interest_rate,
            is_4x1000_subject: editState.account.is_4x1000_subject,
            maturity_date: editState.account.maturity_date,
            on_maturity: editState.account.on_maturity as "transfer_back" | "auto_renew" | null,
            linked_account_id: editState.account.linked_account_id,
          }}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditState(null);
          }}
          onSuccess={() => {
            setEditState(null);
            refetch();
          }}
        />
      )}
    </>
  );
};
