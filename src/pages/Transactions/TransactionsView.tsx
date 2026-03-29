import { AddTransactionModal } from "@/components/Transactions/AddTransactionModal";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCategories } from "@/hooks/useCategories";
import { type TransactionFilters, useTransactionsData } from "@/hooks/useTransactionsData";
import { formatCOPWithSymbol } from "@/lib/currency";
import { getDateLocale } from "@/lib/dateFnsLocale";
import { cn } from "@/lib/utils";
import { supabase } from "@/supabase/client";
import { format } from "date-fns";
import {
  Activity,
  Calendar as CalendarIcon,
  CopyPlus,
  FileText,
  Filter,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export function TransactionsView() {
  const { t } = useTranslation("transactions");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { categories } = useCategories();

  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    // Parse as local date (YYYY-MM-DD) to avoid timezone offset issues
    const parseLocal = (s: string) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    return {
      search: "",
      categories: [],
      startDate: startParam ? parseLocal(startParam) : undefined,
      endDate: endParam ? parseLocal(endParam) : undefined,
      limit: 20,
    };
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const parseLocal = (s: string) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    if (startParam) {
      return {
        from: parseLocal(startParam),
        to: endParam ? parseLocal(endParam) : undefined,
      };
    }
    return undefined;
  });

  // Sync local date state to filters
  useEffect(() => {
    setFilters((prev) => ({ ...prev, startDate: dateRange?.from, endDate: dateRange?.to, limit: 20 }));
  }, [dateRange]);

  const toggleCategory = (categoryId: string) => {
    setFilters((prev) => {
      const isSelected = prev.categories.includes(categoryId);
      return {
        ...prev,
        limit: 20,
        categories: isSelected ? prev.categories.filter((c) => c !== categoryId) : [...prev.categories, categoryId],
      };
    });
  };

  const hasActiveFilters = filters.search.length > 0 || filters.categories.length > 0 || dateRange !== undefined;

  const clearFilters = () => {
    setFilters({ search: "", categories: [], startDate: undefined, endDate: undefined, limit: 20 });
    setDateRange(undefined);
  };

  const { transactions, isLoading, error, refetch, hasMore, totalCount } = useTransactionsData(filters);

  const [modalState, setModalState] = useState<{
    mode: "edit" | "duplicate";
    transaction: (typeof transactions)[number];
  } | null>(null);

  const [accounts, setAccounts] = useState<{ id: string; name: string; balance: number }[]>([]);
  useEffect(() => {
    const fetchAccounts = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const { data } = await supabase.from("accounts").select("id, name, balance").eq("user_id", userData.user.id);
      if (data) setAccounts(data);
    };
    fetchAccounts();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("deleteConfirm"))) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      refetch();
    } catch (err) {
      console.error("Failed to delete transaction", err);
      toast.error(t("toast.deleteError"));
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-glass">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("header.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("header.subtitle")}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-surface-hover-strong"
          onClick={() => navigate(-1)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 border-b border-subtle pb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            className="pl-9 bg-surface-hover border-glass"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, limit: 20 }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-glass bg-surface-hover hidden sm:flex">
                <Filter className="h-4 w-4 mr-2" />
                {t("categories")} {filters.categories.length > 0 && `(${filters.categories.length})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 border-glass bg-background/95 backdrop-blur z-50">
              {categories.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-3 px-2">
                  No categories yet. Create one when adding a transaction.
                </div>
              ) : (
                categories.map((cat) => (
                  <DropdownMenuCheckboxItem
                    key={cat.id}
                    checked={filters.categories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  >
                    <span className="flex items-center gap-2">
                      {cat.color && (
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                      {cat.name}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal border-glass bg-surface-hover",
                  !dateRange && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y", { locale: getDateLocale() })} -{" "}
                      {format(dateRange.to, "LLL dd, y", { locale: getDateLocale() })}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y", { locale: getDateLocale() })
                  )
                ) : (
                  <span>{t("pickDateRange")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 border-glass bg-background/95 backdrop-blur z-50 text-foreground"
              align="start"
            >
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground hover:bg-surface-hover-strong"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t("common:actions.clear")}
            </Button>
          )}
        </div>
      </div>

      {/* Transactions List Area */}
      <div className="flex-1 space-y-3">
        {!isLoading && !error && transactions.length > 0 && (
          <div className="text-xs font-medium text-muted-foreground mb-4 pl-1">
            {t("showing", { shown: transactions.length, total: totalCount })}
          </div>
        )}

        {isLoading && transactions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground animate-pulse">
            <p>{t("empty.loading")}</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-danger">
            <p>Error loading transactions: {error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 opacity-50">
            <Activity className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground italic">{t("empty.title")}</p>
          </div>
        ) : (
          <>
            <div className="glass-card rounded-xl border border-subtle overflow-hidden">
              {transactions.map((txn, idx) => (
                <div
                  key={txn.id}
                  className={cn(
                    "group flex flex-col sm:flex-row items-start sm:items-center py-2 px-4 hover:bg-surface-hover transition-colors gap-3",
                    idx !== transactions.length - 1 && "border-b border-subtle",
                  )}
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="relative mt-0.5">
                      <div
                        className="w-8 h-8 rounded-full flex flex-col items-center justify-center border-2 border-background shadow-md opacity-90"
                        style={{ backgroundColor: txn.accounts?.color || "#333" }}
                      >
                        <span className="text-white font-bold text-[10px] tracking-tighter truncate w-full text-center px-1">
                          {txn.accounts?.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {txn.payee}
                        {txn.is_recurring && (
                          <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider">
                            {t("recurring")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="font-medium">{txn.accounts?.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(txn.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {/* Transaction-level category badges */}
                      {txn.transaction_categories?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {txn.transaction_categories.map((tc) => (
                            <span
                              key={tc.category_id}
                              className="text-[10px] px-1.5 py-0.5 rounded-full border border-glass"
                              style={
                                tc.categories?.color
                                  ? {
                                      backgroundColor: `${tc.categories.color}20`,
                                      borderColor: `${tc.categories.color}40`,
                                      color: tc.categories.color,
                                    }
                                  : undefined
                              }
                            >
                              {tc.categories?.name || "Unknown"}
                            </span>
                          ))}
                        </div>
                      )}
                      {txn.notes && (
                        <div className="text-[11px] text-muted-foreground/80 mt-1 flex items-start gap-1">
                          <FileText className="w-3 h-3 mt-0.5 opacity-50" /> {txn.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end pl-11 sm:pl-0">
                    <div
                      className={`font-bold text-base tracking-tight ${txn.type === "expense" ? "text-foreground" : "text-success"}`}
                    >
                      {txn.type === "expense" ? "-" : "+"}
                      {formatCOPWithSymbol(Math.abs(txn.total_amount))}
                    </div>

                    {/* Splits render */}
                    {txn.transaction_splits?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1 md:justify-end">
                        {txn.transaction_splits.map((split) => (
                          <div
                            key={split.id}
                            className="flex items-center text-[10px] bg-surface-hover px-2 py-1 rounded-sm border border-subtle gap-1.5"
                          >
                            <span
                              className={`font-semibold ${split.status === "Settled" ? "text-primary" : "text-warning animate-pulse"}`}
                            >
                              {formatCOPWithSymbol(Math.abs(split.amount))}
                            </span>
                            <span className="uppercase text-[9px] opacity-50 ml-1">{split.assigned_to}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center self-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-surface-hover-strong"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 glass-panel border-border z-50">
                        <DropdownMenuItem
                          onSelect={() => setModalState({ mode: "edit", transaction: txn })}
                          className="cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          <span>{t("common:actions.edit")}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => setModalState({ mode: "duplicate", transaction: txn })}
                          className="cursor-pointer"
                        >
                          <CopyPlus className="w-4 h-4 mr-2" />
                          <span>{t("common:actions.duplicate")}</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-border/50" />

                        <DropdownMenuItem
                          onClick={(e) => handleDelete(txn.id, e)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          <span>{t("common:actions.delete")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="pt-6 pb-4 flex justify-center">
                <Button
                  variant="outline"
                  className="border-glass bg-surface-hover hover:bg-surface-hover-strong text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setFilters((prev) => ({ ...prev, limit: (prev.limit || 20) + 20 }))}
                  disabled={isLoading}
                >
                  {isLoading ? t("empty.loading") : t("common:actions.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lifted modal for Edit/Duplicate */}
      {modalState && (
        <AddTransactionModal
          accounts={accounts}
          onSuccess={() => {
            setModalState(null);
            refetch();
          }}
          editMode={modalState.mode === "edit"}
          transactionId={modalState.mode === "edit" ? modalState.transaction.id : undefined}
          initialData={{
            accountId: modalState.transaction.account_id,
            date:
              modalState.mode === "edit"
                ? new Date(modalState.transaction.date).toISOString().split("T")[0]
                : undefined,
            totalAmount: Math.abs(modalState.transaction.total_amount),
            type: modalState.transaction.type,
            payee: modalState.transaction.payee,
            notes: modalState.mode === "edit" ? modalState.transaction.notes || "" : undefined,
            isRecurring: modalState.mode === "edit" ? modalState.transaction.is_recurring || false : false,
            recurrenceValue:
              modalState.mode === "edit" ? (modalState.transaction.recurrence_value ?? undefined) : undefined,
            recurrenceUnit:
              modalState.mode === "edit"
                ? ((modalState.transaction.recurrence_unit as any) ?? undefined)
                : undefined,
            categoryIds: modalState.transaction.transaction_categories?.map((tc) => tc.category_id) || [],
            splits:
              modalState.mode === "edit"
                ? modalState.transaction.transaction_splits.map((s) => ({
                    amount: Math.abs(s.amount),
                    assigned_to: s.assigned_to || "Me",
                    status: s.status as any,
                  }))
                : undefined,
          }}
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) setModalState(null);
          }}
        />
      )}
    </>
  );
}
