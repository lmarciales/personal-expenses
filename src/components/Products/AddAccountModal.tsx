import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";

const TYPE_COLOR_PRESETS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const createAccountSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, t("validation:nameRequired")),
    balance: z.number({
      required_error: t("validation:balanceRequired"),
      invalid_type_error: t("validation:balanceRequired"),
    }),
    type: z.string().min(1, t("validation:typeRequired")),
    credit_limit: z.number().nonnegative().nullable().optional(),
    interest_rate: z.number().min(0).max(100).nullable().optional(),
    is_4x1000_subject: z.boolean().optional(),
    opening_date: z.string().nullable().optional(),
    maturity_date: z.string().nullable().optional(),
    on_maturity: z.enum(["transfer_back", "auto_renew"]).nullable().optional(),
    linked_account_id: z.string().nullable().optional(),
    create_transfer: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof createAccountSchema>>;

interface AddAccountModalProps {
  onSuccess: () => void;
  children?: React.ReactNode;
  editMode?: boolean;
  accountId?: string;
  initialData?: {
    name: string;
    type: string;
    balance: number;
    credit_limit?: number | null;
    interest_rate?: number | null;
    is_4x1000_subject?: boolean;
    opening_date?: string | null;
    maturity_date?: string | null;
    on_maturity?: "transfer_back" | "auto_renew" | null;
    linked_account_id?: string | null;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddAccountModal({
  onSuccess,
  children,
  editMode = false,
  accountId,
  initialData,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddAccountModalProps) {
  const { t } = useTranslation(["accounts", "validation"]);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange ?? (() => {}) : setInternalOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accountTypes, setAccountTypes] = useState<{ name: string; color: string }[]>([]);
  const [creatingType, setCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#6366f1");
  const [isCreatingType, setIsCreatingType] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<{ id: string; name: string }[]>([]);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    const trimmedName = newTypeName.trim();
    if (trimmedName.length > 50) {
      toast.error(t("accounts:modalToast.createError"));
      return;
    }
    // Check for duplicate among loaded types
    if (accountTypes.some((at) => at.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error(t("accounts:modalToast.createError"));
      return;
    }
    setIsCreatingType(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("account_types").insert({
        name: trimmedName,
        color: newTypeColor,
        user_id: userData.user.id,
      });
      if (error) throw error;

      // Refresh types list and select the new type
      const { data: refreshed } = await supabase.from("account_types").select("name, color").order("name");
      if (refreshed) {
        setAccountTypes(refreshed);
        form.setValue("type", trimmedName);
      }

      setCreatingType(false);
      setNewTypeName("");
      setNewTypeColor("#6366f1");
    } catch (error) {
      console.error("Failed to create account type", error);
      toast.error(t("accounts:modalToast.createError"));
    } finally {
      setIsCreatingType(false);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(createAccountSchema(t)),
    defaultValues: {
      name: initialData?.name ?? "",
      balance: initialData?.balance ?? undefined,
      type: initialData?.type ?? "",
      credit_limit: initialData?.credit_limit ?? undefined,
      interest_rate: initialData?.interest_rate ?? undefined,
      is_4x1000_subject: initialData?.is_4x1000_subject ?? false,
      opening_date: initialData?.opening_date ?? undefined,
      maturity_date: initialData?.maturity_date ?? undefined,
      on_maturity: initialData?.on_maturity ?? undefined,
      linked_account_id: initialData?.linked_account_id ?? undefined,
      create_transfer: true,
    },
  });

  // Reset form when initialData changes (edit mode) or when modal opens
  useEffect(() => {
    if (open && initialData && editMode) {
      form.reset({
        name: initialData.name,
        balance: initialData.balance,
        type: initialData.type,
        credit_limit: initialData.credit_limit ?? undefined,
        interest_rate: initialData.interest_rate ?? undefined,
        is_4x1000_subject: initialData.is_4x1000_subject ?? false,
        opening_date: initialData.opening_date ?? undefined,
        maturity_date: initialData.maturity_date ?? undefined,
        on_maturity: initialData.on_maturity ?? undefined,
        linked_account_id: initialData.linked_account_id ?? undefined,
        create_transfer: false,
      });
    } else if (open && !editMode) {
      form.reset({
        name: "",
        balance: undefined,
        type: accountTypes.length > 0 ? accountTypes[0].name : "",
        credit_limit: undefined,
        interest_rate: undefined,
        is_4x1000_subject: false,
        opening_date: undefined,
        maturity_date: undefined,
        on_maturity: undefined,
        linked_account_id: undefined,
        create_transfer: true,
      });
    }
  }, [open, editMode, initialData, form, accountTypes]);

  // Clear type-specific fields when type changes
  const watchedType = form.watch("type");
  useEffect(() => {
    if (watchedType === "Credit Card" || watchedType === "CDT") {
      form.setValue("is_4x1000_subject", false);
    }
    if (watchedType !== "Credit Card") {
      form.setValue("credit_limit", undefined);
    }
    if (watchedType === "Credit Card") {
      form.setValue("interest_rate", undefined);
    }
    if (watchedType !== "CDT") {
      form.setValue("opening_date", undefined);
      form.setValue("maturity_date", undefined);
      form.setValue("on_maturity", undefined);
      form.setValue("linked_account_id", undefined);
    }
  }, [watchedType, form]);

  useEffect(() => {
    const fetchTypes = async () => {
      const { data, error } = await supabase.from("account_types").select("name, color").order("name");
      if (data && !error) {
        setAccountTypes(data);
        if (data.length > 0 && !editMode && !initialData) {
          form.setValue("type", data[0].name);
        }
      }

      // Fetch user accounts for CDT linked account dropdown
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: accData } = await supabase
          .from("accounts")
          .select("id, name, type")
          .eq("user_id", userData.user.id)
          .neq("type", "CDT");
        if (accData) setLinkedAccounts(accData.map((a) => ({ id: a.id, name: a.name })));
      }
    };
    fetchTypes();
  }, [form, editMode, initialData]);

  const isLegacyType =
    editMode &&
    initialData?.type &&
    accountTypes.length > 0 &&
    !accountTypes.some((at) => at.name === initialData.type);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const accountTypeObj = accountTypes.find((t) => t.name === data.type);
      const color = accountTypeObj ? accountTypeObj.color : "bg-primary";

      // For CDTs with an opening date, use it as the interest reference date
      const referenceDate =
        data.type === "CDT" && data.opening_date
          ? new Date(data.opening_date).toISOString()
          : data.interest_rate != null
            ? new Date().toISOString()
            : null;

      if (editMode && accountId) {
        const { error } = await supabase
          .from("accounts")
          .update({
            name: data.name,
            type: data.type,
            balance: data.balance,
            color: color,
            credit_limit: data.type === "Credit Card" ? data.credit_limit ?? null : null,
            interest_rate: data.interest_rate ?? null,
            interest_reference_balance: data.interest_rate != null ? data.balance : null,
            interest_reference_date: referenceDate,
            is_4x1000_subject: data.is_4x1000_subject ?? false,
            maturity_date: data.type === "CDT" ? data.maturity_date ?? null : null,
            on_maturity: data.type === "CDT" ? data.on_maturity ?? null : null,
            linked_account_id: data.type === "CDT" ? data.linked_account_id ?? null : null,
          })
          .eq("id", accountId)
          .eq("user_id", userData.user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").insert({
          user_id: userData.user.id,
          name: data.name,
          type: data.type,
          balance: data.balance,
          color: color,
          credit_limit: data.type === "Credit Card" ? data.credit_limit ?? null : null,
          interest_rate: data.interest_rate ?? null,
          interest_reference_balance: data.interest_rate != null ? data.balance : null,
          interest_reference_date: referenceDate,
          is_4x1000_subject: data.is_4x1000_subject ?? false,
          maturity_date: data.type === "CDT" ? data.maturity_date ?? null : null,
          on_maturity: data.type === "CDT" ? data.on_maturity ?? null : null,
          linked_account_id: data.type === "CDT" ? data.linked_account_id ?? null : null,
        });

        if (error) throw error;

        // Auto-create transfer from linked account for new CDTs
        if (
          data.type === "CDT" &&
          data.create_transfer &&
          data.linked_account_id &&
          data.balance > 0
        ) {
          await supabase.rpc("add_transaction_with_splits", {
            p_user_id: userData.user.id,
            p_account_id: data.linked_account_id,
            p_date: data.opening_date ?? new Date().toISOString().split("T")[0],
            p_total_amount: data.balance,
            p_payee: `CDT - ${data.name}`,
            p_notes: "Apertura de CDT",
            p_type: "transfer",
            p_splits: JSON.stringify([]),
            p_category_ids: [],
          });
        }
      }

      setOpen(false);
      form.reset();
      onSuccess();
    } catch (error) {
      console.error(editMode ? "Failed to update account" : "Failed to add account", error);
      toast.error(editMode ? t("accounts:modalToast.updateError") : t("accounts:modalToast.createError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!accountId) return;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      // Check linked transactions count
      const { count, error: countError } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);

      if (countError) throw countError;

      const txCount = count || 0;
      const message =
        txCount > 0
          ? `This account has ${txCount} linked transaction${txCount !== 1 ? "s" : ""}. Deleting it will also remove all associated transactions and their data. Are you sure?`
          : "Are you sure you want to delete this account?";

      if (!window.confirm(message)) return;

      setIsDeleting(true);

      const { error } = await supabase.rpc("delete_account_cascade", {
        p_account_id: accountId,
        p_user_id: userData.user.id,
      });

      if (error) throw error;

      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to delete account", error);
      toast.error(t("accounts:toast.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px] glass-panel border-glass text-foreground">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">
          {editMode ? t("accounts:modal.editTitle") : t("accounts:modal.addTitle")}
        </DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("accounts:modal.name")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("accounts:modal.namePlaceholder")}
                    {...field}
                    className="bg-surface-input border-glass"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("accounts:modal.type")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-input border-glass">
                      <SelectValue placeholder={t("accounts:modal.selectType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="glass-panel border-glass">
                    {/* Intentional: when a legacy type (no longer in account_types) is present,
                        show it as a disabled option so the form value passes through unchanged
                        on submit. This is graceful degradation — not a bug. */}
                    {isLegacyType && initialData?.type && (
                      <SelectItem key={initialData.type} value={initialData.type} disabled>
                        {initialData.type} ({t("accounts:modal.legacy")})
                      </SelectItem>
                    )}
                    {accountTypes.map((at) => (
                      <SelectItem key={at.name} value={at.name}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: at.color }} />
                          {at.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!creatingType ? (
                  <button
                    type="button"
                    onClick={() => setCreatingType(true)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    + {t("accounts:modal.createType")}
                  </button>
                ) : (
                  <div className="mt-2 p-3 rounded-lg border border-glass bg-surface-overlay space-y-3">
                    <Input
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder={t("accounts:modal.newTypeNamePlaceholder")}
                      className="bg-surface-input border-glass text-sm"
                    />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">{t("accounts:modal.newTypeColor")}</p>
                      <div className="flex gap-2">
                        {TYPE_COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewTypeColor(c)}
                            className={`w-6 h-6 rounded-full transition-all ${newTypeColor === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCreatingType(false);
                          setNewTypeName("");
                        }}
                      >
                        {t("accounts:modal.cancelCreateType")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateType}
                        disabled={isCreatingType || !newTypeName.trim()}
                        className="bg-primary text-primary-foreground"
                      >
                        {isCreatingType ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        {t("accounts:modal.createTypeButton")}
                      </Button>
                    </div>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{editMode ? t("accounts:modal.balance") : t("accounts:modal.initialBalance")}</FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    placeholder="0"
                    className="bg-surface-input border-glass"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("type") === "Credit Card" && (
            <FormField
              control={form.control}
              name="credit_limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts:modal.creditLimit")}</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value ?? undefined}
                      onChange={(val) => field.onChange(val ?? null)}
                      placeholder={t("accounts:modal.creditLimitPlaceholder")}
                      className="bg-surface-input border-glass"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Interest Rate — hidden for Credit Cards */}
          {form.watch("type") !== "Credit Card" && (
            <FormField
              control={form.control}
              name="interest_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts:modal.interestRate")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      placeholder={t("accounts:modal.interestRatePlaceholder")}
                      className="bg-surface-input border-glass"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* 4x1000 checkbox — shown for non-Credit Card, non-CDT types */}
          {form.watch("type") !== "Credit Card" && form.watch("type") !== "CDT" && (
            <FormField
              control={form.control}
              name="is_4x1000_subject"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">{t("accounts:modal.is4x1000")}</FormLabel>
                </FormItem>
              )}
            />
          )}

          {/* CDT-specific fields */}
          {form.watch("type") === "CDT" && (
            <>
              <FormField
                control={form.control}
                name="opening_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts:modal.openingDate")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="bg-surface-input border-glass"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maturity_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts:modal.maturityDate")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="bg-surface-input border-glass"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="on_maturity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts:modal.onMaturity")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="bg-surface-input border-glass">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-panel border-glass">
                        <SelectItem value="transfer_back">{t("accounts:modal.onMaturityTransferBack")}</SelectItem>
                        <SelectItem value="auto_renew">{t("accounts:modal.onMaturityAutoRenew")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linked_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts:modal.linkedAccount")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="bg-surface-input border-glass">
                          <SelectValue placeholder={t("accounts:modal.linkedAccountPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-panel border-glass">
                        {linkedAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!editMode && (
                <FormField
                  control={form.control}
                  name="create_transfer"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value ?? true} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        {t("accounts:modal.createTransfer")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              )}
            </>
          )}

          <div className="flex justify-between gap-3 pt-4 border-t border-glass">
            <div>
              {editMode && accountId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  {t("common:actions.delete")}
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="hover:bg-surface-hover-strong border border-glass"
              >
                {t("common:actions.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-accent-lg"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editMode ? t("common:actions.saveChanges") : t("accounts:modal.addAccount")}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </DialogContent>
  );

  // Controlled mode (no trigger, rendered externally)
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode (with trigger children)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
