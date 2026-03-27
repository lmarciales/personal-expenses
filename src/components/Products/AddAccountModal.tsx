import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  balance: z.number({ required_error: "Balance is required", invalid_type_error: "Balance is required" }),
  type: z.string().min(1, "Type is required"),
});

type FormValues = z.infer<typeof accountSchema>;

interface AddAccountModalProps {
  onSuccess: () => void;
  children?: React.ReactNode;
  editMode?: boolean;
  accountId?: string;
  initialData?: { name: string; type: string; balance: number };
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
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange ?? (() => {}) : setInternalOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accountTypes, setAccountTypes] = useState<{ name: string; color: string }[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      balance: initialData?.balance ?? undefined,
      type: initialData?.type ?? "",
    },
  });

  // Reset form when initialData changes (edit mode) or when modal opens
  useEffect(() => {
    if (open && initialData && editMode) {
      form.reset({
        name: initialData.name,
        balance: initialData.balance,
        type: initialData.type,
      });
    } else if (open && !editMode) {
      form.reset({
        name: "",
        balance: undefined,
        type: accountTypes.length > 0 ? accountTypes[0].name : "",
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
        });

        if (error) throw error;
      }

      setOpen(false);
      form.reset();
      onSuccess();
    } catch (error) {
      console.error(editMode ? "Failed to update account" : "Failed to add account", error);
      toast.error(editMode ? "No se pudo actualizar la cuenta" : "No se pudo agregar la cuenta");
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
      toast.error("No se pudo eliminar la cuenta");
    } finally {
      setIsDeleting(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px] glass-panel border-glass text-foreground">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">{editMode ? "Edit Account" : "Add New Account"}</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Chase Checking" {...field} className="bg-surface-input border-glass" />
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
                <FormLabel>Account Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-input border-glass">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="glass-panel border-glass">
                    {accountTypes.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name}
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
                <FormLabel>{editMode ? "Balance" : "Initial Balance"}</FormLabel>
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
                  Delete
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-accent-lg"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editMode ? "Save Changes" : "Add Account"}
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
