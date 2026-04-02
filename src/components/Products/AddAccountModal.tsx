import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Button } from "@/components/ui/button";
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

const createAccountSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, t("validation:nameRequired")),
    balance: z.number({
      required_error: t("validation:balanceRequired"),
      invalid_type_error: t("validation:balanceRequired"),
    }),
    type: z.string().min(1, t("validation:typeRequired")),
    credit_limit: z.number().nullable().optional(),
  });

type FormValues = z.infer<ReturnType<typeof createAccountSchema>>;

interface AddAccountModalProps {
  onSuccess: () => void;
  children?: React.ReactNode;
  editMode?: boolean;
  accountId?: string;
  initialData?: { name: string; type: string; balance: number; credit_limit?: number | null };
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

  const form = useForm<FormValues>({
    resolver: zodResolver(createAccountSchema(t)),
    defaultValues: {
      name: initialData?.name ?? "",
      balance: initialData?.balance ?? undefined,
      type: initialData?.type ?? "",
      credit_limit: initialData?.credit_limit ?? undefined,
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
      });
    } else if (open && !editMode) {
      form.reset({
        name: "",
        balance: undefined,
        type: accountTypes.length > 0 ? accountTypes[0].name : "",
        credit_limit: undefined,
      });
    }
  }, [open, editMode, initialData, form, accountTypes]);

  useEffect(() => {
    const fetchTypes = async () => {
      const { data, error } = await supabase.from("account_types").select("name, color").order("name");
      if (data && !error) {
        setAccountTypes(data);
        if (data.length > 0 && !editMode && !initialData) {
          form.setValue("type", data[0].name);
        }
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

      if (editMode && accountId) {
        const { error } = await supabase
          .from("accounts")
          .update({
            name: data.name,
            type: data.type,
            balance: data.balance,
            color: color,
            credit_limit: data.type === "Credit Card" ? (data.credit_limit ?? null) : null,
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
          credit_limit: data.type === "Credit Card" ? (data.credit_limit ?? null) : null,
        });

        if (error) throw error;
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
                        {at.name}
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
