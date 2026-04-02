import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AccountWithStats } from "@/hooks/useAccountsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { getProjectedBalance } from "@/lib/projectedBalance";
import { supabase } from "@/supabase/client";
import { ArrowUpRight, CreditCard, Pencil, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface RecentTransaction {
  id: string;
  payee: string;
  total_amount: number;
  date: string;
  type: "expense" | "income" | "transfer";
}

interface AccountDetailModalProps {
  account: AccountWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (account: AccountWithStats) => void;
  allAccounts?: AccountWithStats[];
}

const RETENCION_RATE = 0.04;

function CdtDetail({
  account,
  linkedAccountName,
  t,
  i18n,
}: { account: AccountWithStats; linkedAccountName: string | null; t: any; i18n: any }) {
  const principal = account.interest_reference_balance ?? account.balance;
  const rate = account.interest_rate ?? 0;
  const refDate = account.interest_reference_date ? new Date(account.interest_reference_date) : null;
  const maturityDate = account.maturity_date ? new Date(account.maturity_date) : null;
  const now = new Date();

  // Daily compounding with retención deducted each day (matches Colombian bank CDT calculation)
  const ea = rate / 100;
  const effectiveDailyRate = Math.pow(1 + ea, 1 / 365) - 1;
  const daysElapsed = refDate ? Math.max(0, Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  // Gross: compound without retención
  const grossTotal = principal * Math.pow(1 + effectiveDailyRate, daysElapsed);
  const grossYield = grossTotal - principal;

  // Net: compound with retención deducted daily
  const netDailyRate = effectiveDailyRate * (1 - RETENCION_RATE);
  const netTotal = principal * Math.pow(1 + netDailyRate, daysElapsed);
  const netYield = netTotal - principal;
  const retention = grossYield - netYield;
  const currentNetTotal = netTotal;

  // Expected at maturity
  const totalDays =
    refDate && maturityDate ? Math.max(0, Math.floor((maturityDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const expectedTotal = principal * Math.pow(1 + netDailyRate, totalDays);

  const daysRemaining = maturityDate ? Math.ceil((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const formatDate = (date: Date) =>
    date.toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="space-y-4 mt-4">
      {/* Financial Breakdown */}
      <div className="glass-card rounded-xl p-4 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("cdt.principal")}</span>
          <span className="font-semibold tabular-nums">{formatCOPWithSymbol(principal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("cdt.grossYield")}</span>
          <span className="font-semibold text-success tabular-nums">+{formatCOPWithSymbol(grossYield)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("cdt.retention")}</span>
          <span className="font-semibold text-danger tabular-nums">-{formatCOPWithSymbol(retention)}</span>
        </div>
        <div className="border-t border-glass pt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">{t("cdt.netYield")}</span>
          <span className="font-semibold text-success tabular-nums">+{formatCOPWithSymbol(netYield)}</span>
        </div>
        <div className="border-t border-glass pt-2 flex justify-between">
          <span className="font-semibold">{t("cdt.currentNetTotal")}</span>
          <span className="font-bold text-lg tabular-nums">{formatCOPWithSymbol(currentNetTotal)}</span>
        </div>
      </div>

      {/* Expected at Maturity */}
      {maturityDate && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex justify-between">
            <span className="text-sm font-semibold">{t("cdt.expectedAtMaturity")}</span>
            <span className="font-bold text-lg tabular-nums text-primary">{formatCOPWithSymbol(expectedTotal)}</span>
          </div>
        </div>
      )}

      {/* CDT Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-3">
          <p className="text-xs text-muted-foreground">{t("cdt.rate")}</p>
          <p className="text-sm font-bold">{rate}% EA</p>
        </div>
        {refDate && (
          <div className="glass-card rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{t("cdt.opening")}</p>
            <p className="text-sm font-bold">{formatDate(refDate)}</p>
          </div>
        )}
        {maturityDate && (
          <div className="glass-card rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{t("cdt.maturity")}</p>
            <p className="text-sm font-bold">{formatDate(maturityDate)}</p>
            {daysRemaining > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("cdt.daysRemaining", { days: daysRemaining })}
              </p>
            )}
          </div>
        )}
        {account.on_maturity && (
          <div className="glass-card rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{t("cdt.behavior")}</p>
            <span
              className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded ${
                account.on_maturity === "auto_renew" ? "bg-blue-500/20 text-blue-600" : "bg-green-500/20 text-green-600"
              }`}
            >
              {account.on_maturity === "auto_renew" ? t("card.autoRenew") : t("card.transferBack")}
            </span>
          </div>
        )}
        {linkedAccountName && (
          <div className="glass-card rounded-xl p-3 col-span-2">
            <p className="text-xs text-muted-foreground">{t("cdt.linkedAccount")}</p>
            <p className="text-sm font-bold">{linkedAccountName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountDetailModal({ account, open, onOpenChange, onEdit, allAccounts }: AccountDetailModalProps) {
  const { t, i18n } = useTranslation("accounts");
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  const isCdt = account?.type === "CDT";

  const fetchRecentTransactions = useCallback(async () => {
    if (!account || isCdt) return;
    setLoadingTxns(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, payee, total_amount, date, type")
        .eq("account_id", account.id)
        .order("date", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentTransactions((data || []) as RecentTransaction[]);
    } catch {
      setRecentTransactions([]);
    } finally {
      setLoadingTxns(false);
    }
  }, [account, isCdt]);

  useEffect(() => {
    if (open && account) {
      fetchRecentTransactions();
    }
  }, [open, account, fetchRecentTransactions]);

  if (!account) return null;

  const linkedAccountName = account.linked_account_id
    ? (allAccounts?.find((a) => a.id === account.linked_account_id)?.name ?? null)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-panel border-glass text-foreground">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {isCdt ? t("cdt.detailTitle") : t("detail.title")}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(account);
              }}
              className="text-muted-foreground hover:text-foreground rounded-full"
            >
              <Pencil className="w-4 h-4 mr-1" />
              {t("common:actions.edit")}
            </Button>
          </div>
        </DialogHeader>

        {/* Account Header */}
        <div className="flex items-center gap-4 mt-2">
          <div className={`w-14 h-14 rounded-2xl ${account.color} flex items-center justify-center shadow-lg`}>
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{account.name}</h3>
            <span className="text-sm text-muted-foreground">{account.type}</span>
          </div>
          <div className="ml-auto text-right">
            {account.type === "Credit Card" ? (
              <>
                <p className="text-xl font-bold">{formatCOPWithSymbol(account.balance)}</p>
                <span className="text-xs text-muted-foreground">{t("detail.availableCredit")}</span>
                {account.credit_limit != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("detail.currentDebt")}:{" "}
                    {formatCOPWithSymbol(Math.max(0, account.credit_limit - account.balance))}
                  </p>
                )}
              </>
            ) : isCdt ? (
              <>
                <p className="text-xl font-bold">{formatCOPWithSymbol(getProjectedBalance(account))}</p>
                <span className="text-xs text-muted-foreground">{t("cdt.currentNetTotal")}</span>
              </>
            ) : (
              <>
                <p className="text-xl font-bold">{formatCOPWithSymbol(account.balance)}</p>
                <span className="text-xs text-muted-foreground">{t("detail.currentBalance")}</span>
              </>
            )}
          </div>
        </div>

        {/* CDT-specific detail OR standard account detail */}
        {isCdt ? (
          <CdtDetail account={account} linkedAccountName={linkedAccountName} t={t} i18n={i18n} />
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="glass-card rounded-xl p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <p className="text-xs text-muted-foreground">{t("detail.income")}</p>
                <p className="text-sm font-bold text-success">{formatCOPWithSymbol(account.totalIncome)}</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingDown className="w-4 h-4 text-danger" />
                </div>
                <p className="text-xs text-muted-foreground">{t("detail.expenses")}</p>
                <p className="text-sm font-bold text-danger">{formatCOPWithSymbol(account.totalExpenses)}</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Receipt className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">{t("detail.transactions")}</p>
                <p className="text-sm font-bold">{account.transactionCount}</p>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("detail.recentTransactions")}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs rounded-full hover:bg-surface-hover-strong text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/transactions");
                  }}
                >
                  {t("common:actions.viewAll")} <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>

              {loadingTxns ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-xl bg-surface-overlay animate-pulse" />
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("detail.noTransactions")}</p>
              ) : (
                <div className="space-y-1">
                  {recentTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface-overlay border border-subtle"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-overlay border-2 border-background shadow-sm flex items-center justify-center">
                          <span className="text-xs font-bold text-muted-foreground">
                            {txn.payee.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{txn.payee}</p>
                          <p className="text-xs text-muted-foreground">{txn.date}</p>
                        </div>
                      </div>
                      <span
                        className={`font-bold text-sm tabular-nums ${txn.type === "income" ? "text-income" : "text-foreground"}`}
                      >
                        {txn.type === "income" ? "+" : txn.type === "expense" ? "-" : ""}
                        {formatCOPWithSymbol(Math.abs(txn.total_amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Created date */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          {t("detail.created")}{" "}
          {new Date(account.created_at).toLocaleDateString(i18n.language, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </DialogContent>
    </Dialog>
  );
}
