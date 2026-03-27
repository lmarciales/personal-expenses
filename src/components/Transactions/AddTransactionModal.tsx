import { CategoryMultiSelect } from "@/components/ui/CategoryMultiSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCategories } from "@/hooks/useCategories";
import { formatCOPWithSymbol } from "@/lib/currency";
import { getDateLocale } from "@/lib/dateFnsLocale";
import { cn } from "@/lib/utils";
import { supabase } from "@/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import type { TFunction } from "i18next";
import { CalendarIcon, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";

const createSplitSchema = (t: TFunction) =>
  z.object({
    amount: z
      .number({ required_error: t("validation:amountRequired"), invalid_type_error: t("validation:amountRequired") })
      .min(0, t("validation:amountPositive")),
    assigned_to: z.string().min(1, t("validation:assigneeRequired")),
    status: z.enum(["Settled", "Pending Receival", "Pending Payment", "Ignored"]),
  });

const createFormSchema = (t: TFunction) => {
  const splitSchema = createSplitSchema(t);
  return z
    .object({
      accountId: z.string().uuid(t("validation:accountRequired")),
      date: z.string().min(1, t("validation:dateRequired")),
      totalAmount: z
        .number({ required_error: t("validation:amountRequired"), invalid_type_error: t("validation:amountRequired") })
        .min(0.01, t("validation:amountGreaterThanZero")),
      payee: z.string().min(1, t("validation:payeeRequired")),
      notes: z.string().optional(),
      type: z.enum(["expense", "income", "transfer"]).default("expense"),
      isRecurring: z.boolean().default(false),
      recurrenceInterval: z.enum(["Monthly", "Yearly", "Weekly"]).optional().nullable(),
      categoryIds: z.array(z.string()).default([]),
      splits: z.array(splitSchema).min(1, t("validation:splitsRequired")),
    })
    .refine(
      (data) => {
        if (data.isRecurring && !data.recurrenceInterval) return false;
        return true;
      },
      {
        message: t("validation:recurrenceRequired"),
        path: ["recurrenceInterval"],
      },
    )
    .refine(
      (data) => {
        const totalSplits = data.splits.reduce((acc, curr) => acc + curr.amount, 0);
        return Math.abs(totalSplits - data.totalAmount) < 0.01;
      },
      {
        message: t("validation:splitsSumMismatch"),
        path: ["splits"],
      },
    );
};

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface AddTransactionModalProps {
  accounts: { id: string; name: string; balance: number }[];
  onSuccess: () => void;
  initialData?: Partial<FormValues>;
  editMode?: boolean;
  transactionId?: string;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddTransactionModal({
  accounts,
  onSuccess,
  initialData,
  editMode,
  transactionId,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddTransactionModalProps) {
  const { t } = useTranslation(["transactions", "validation"]);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange ?? (() => {}) : setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { categories, createCategory } = useCategories();

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(t)),
    defaultValues: {
      accountId: initialData?.accountId || (accounts.length > 0 ? accounts[0].id : ""),
      date: initialData?.date || format(new Date(), "yyyy-MM-dd"),
      totalAmount: initialData?.totalAmount ?? undefined,
      type: initialData?.type || "expense",
      payee: initialData?.payee || "",
      notes: initialData?.notes || "",
      isRecurring: initialData?.isRecurring || false,
      recurrenceInterval: initialData?.recurrenceInterval || "Monthly",
      categoryIds: initialData?.categoryIds || [],
      splits: initialData?.splits || [
        {
          amount: initialData?.totalAmount ?? undefined,
          assigned_to: "Me",
          status: "Settled",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "splits",
    control: form.control,
  });

  // Automatically update the first split amount when totalAmount changes if there's only one split
  const isRecurring = form.watch("isRecurring");

  const handleTotalAmountChange = (val: number | undefined) => {
    form.setValue("totalAmount", val as number, { shouldValidate: true });
    if (fields.length === 1) {
      form.setValue("splits.0.amount", val as number, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      // Prepare splits without category (category is now at transaction level)
      const splitsPayload = data.splits.map((s) => ({
        amount: s.amount,
        assigned_to: s.assigned_to,
        status: s.status,
      }));

      if (editMode && transactionId) {
        const { error } = await supabase.rpc("update_transaction_with_splits", {
          p_transaction_id: transactionId,
          p_user_id: userId,
          p_account_id: data.accountId,
          p_date: data.date,
          p_total_amount: data.totalAmount,
          p_payee: data.payee,
          p_notes: data.notes || ("" as any),
          p_type: data.type,
          p_is_recurring: data.isRecurring,
          p_recurrence_interval: (data.isRecurring ? data.recurrenceInterval : null) as any,
          p_splits: splitsPayload as any,
          p_category_ids: data.categoryIds,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("add_transaction_with_splits", {
          p_user_id: userId,
          p_account_id: data.accountId,
          p_date: data.date,
          p_total_amount: data.totalAmount,
          p_payee: data.payee,
          p_notes: data.notes || ("" as any),
          p_type: data.type,
          p_is_recurring: data.isRecurring,
          p_recurrence_interval: (data.isRecurring ? data.recurrenceInterval : null) as any,
          p_splits: splitsPayload as any,
          p_category_ids: data.categoryIds,
        });
        if (error) throw error;
      }

      setOpen(false);
      if (!editMode) form.reset();
      onSuccess();
    } catch (err) {
      console.error("Error saving transaction:", err);
      toast.error(t("transactions:modalToast.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!transactionId) return;
    const confirmDelete = window.confirm(t("transactions:modal.deleteConfirm"));
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
      if (error) throw error;

      setOpen(false);
      onSuccess();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast.error(t("transactions:toast.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] glass-panel border-glass text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {editMode ? t("transactions:modal.editTitle") : t("transactions:modal.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("transactions:modal.account")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface-input border-glass">
                          <SelectValue placeholder={t("transactions:modal.selectAccount")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-panel border-glass">
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name.trim()} ({formatCOPWithSymbol(acc.balance)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2.5">
                    <FormLabel>{t("transactions:modal.date")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal bg-surface-input border-glass hover:bg-surface-hover-strong hover:text-foreground",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value + "T12:00:00"), "PPP", { locale: getDateLocale() })
                            ) : (
                              <span>{t("transactions:modal.pickDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 glass-panel border border-glass shadow-float" align="start">
                        <Calendar
                          mode="single"
                          className="bg-background text-foreground"
                          selected={field.value ? new Date(field.value + "T12:00:00") : undefined}
                          onSelect={(date: Date | undefined) =>
                            field.onChange(date ? format(date, "yyyy-MM-dd") : field.value)
                          }
                          disabled={(date: Date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("transactions:modal.type")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface-input border-glass">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-panel border-glass">
                        <SelectItem value="expense">{t("transactions:modal.expense")}</SelectItem>
                        <SelectItem value="income">{t("transactions:modal.income")}</SelectItem>
                        <SelectItem value="transfer">{t("transactions:modal.transfer")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("transactions:modal.amount")}</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={handleTotalAmountChange}
                        placeholder="0"
                        className="bg-surface-input border-glass"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="payee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("transactions:modal.payee")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("transactions:modal.payeePlaceholder")}
                        {...field}
                        className="bg-surface-input border-glass"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Categories - Transaction Level */}
            <FormField
              control={form.control}
              name="categoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("transactions:modal.category")}</FormLabel>
                  <FormControl>
                    <CategoryMultiSelect
                      categories={categories}
                      selectedIds={field.value}
                      onChange={(ids) => field.onChange(ids)}
                      onCreateCategory={createCategory}
                      placeholder={t("transactions:modal.selectCategory")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("transactions:modal.notes")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("transactions:modal.notesPlaceholder")}
                      {...field}
                      className="bg-surface-input border-glass"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring Toggle */}
            <div className="flex items-center gap-4 bg-surface-hover p-4 rounded-xl border border-glass">
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between shadow-sm flex-1">
                    <FormLabel>{t("transactions:modal.recurringTransaction")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isRecurring && (
                <FormField
                  control={form.control}
                  name="recurrenceInterval"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select onValueChange={field.onChange} defaultValue={field.value || "Monthly"}>
                        <FormControl>
                          <SelectTrigger className="bg-surface-input border-glass">
                            <SelectValue placeholder={t("transactions:modal.recurrenceInterval")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass-panel border-glass">
                          <SelectItem value="Monthly">{t("transactions:modal.monthly")}</SelectItem>
                          <SelectItem value="Yearly">{t("transactions:modal.yearly")}</SelectItem>
                          <SelectItem value="Weekly">{t("transactions:modal.weekly")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Splits Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">{t("transactions:modal.splits")}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-primary text-primary hover:bg-primary/20"
                  onClick={() => append({ amount: undefined as any, assigned_to: "", status: "Pending Receival" })}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {t("transactions:modal.addSplit")}
                </Button>
              </div>

              <FormMessage>{form.formState.errors.splits?.root?.message}</FormMessage>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative grid grid-cols-12 gap-3 items-end bg-surface-hover p-4 rounded-xl border border-glass"
                  >
                    <FormField
                      control={form.control}
                      name={`splits.${index}.amount`}
                      render={({ field: inputField }) => (
                        <FormItem className="col-span-4">
                          <FormLabel className="text-xs">{t("transactions:modal.splitAmount")}</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              value={inputField.value}
                              onChange={(val) => inputField.onChange(val)}
                              placeholder="0"
                              className="bg-surface-input border-glass text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`splits.${index}.assigned_to`}
                      render={({ field: inputField }) => (
                        <FormItem className="col-span-4">
                          <FormLabel className="text-xs">{t("transactions:modal.splitAssignee")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`${t("transactions:modal.me")}, ...`}
                              {...inputField}
                              className="bg-surface-input border-glass text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`splits.${index}.status`}
                      render={({ field: selectField }) => (
                        <FormItem className="col-span-3">
                          <FormLabel className="text-xs">{t("transactions:modal.splitStatus")}</FormLabel>
                          <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                            <FormControl>
                              <SelectTrigger className="bg-surface-input border-glass text-sm px-2">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="glass-panel border-glass">
                              <SelectItem value="Settled">{t("transactions:modal.settled")}</SelectItem>
                              <SelectItem value="Pending Receival">
                                {t("transactions:modal.pendingReceival")}
                              </SelectItem>
                              <SelectItem value="Pending Payment">{t("transactions:modal.pendingPayment")}</SelectItem>
                              <SelectItem value="Ignored">{t("transactions:modal.ignored")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <div className="col-span-1 flex justify-end pb-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/20 h-9 w-9"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-glass mt-6">
              <div>
                {editMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onDelete}
                    disabled={isDeleting || isSubmitting}
                    className="bg-danger/20 text-danger hover:bg-danger/30 border border-danger/50"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
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
                  disabled={isSubmitting || isDeleting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-accent-lg"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editMode ? t("transactions:modal.saveChanges") : t("transactions:modal.addTransaction")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
