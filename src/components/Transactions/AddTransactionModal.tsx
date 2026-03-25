import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Trash2, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/supabase/client";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatCOPWithSymbol } from "@/lib/currency";
import { useCategories } from "@/hooks/useCategories";
import { CategoryMultiSelect } from "@/components/ui/CategoryMultiSelect";

const splitSchema = z.object({
    amount: z.number({ required_error: "Amount is required", invalid_type_error: "Amount is required" }).min(0, "Amount must be positive"),
    assigned_to: z.string().min(1, "Assignee is required"),
    status: z.enum(["Settled", "Pending Receival", "Pending Payment", "Ignored"]),
});

const formSchema = z.object({
    accountId: z.string().uuid("Please select an account"),
    date: z.string().min(1, "Date is required"),
    totalAmount: z.number({ required_error: "Amount is required", invalid_type_error: "Amount is required" }).min(0.01, "Amount must be greater than 0"),
    payee: z.string().min(1, "Payee is required"),
    notes: z.string().optional(),
    type: z.enum(["expense", "income", "transfer"]).default("expense"),
    isRecurring: z.boolean().default(false),
    recurrenceInterval: z.enum(["Monthly", "Yearly", "Weekly"]).optional().nullable(),
    categoryIds: z.array(z.string()).default([]),
    splits: z.array(splitSchema).min(1, "At least one split is required"),
}).refine(data => {
    if (data.isRecurring && !data.recurrenceInterval) return false;
    return true;
}, {
    message: "Recurrence interval required",
    path: ["recurrenceInterval"]
}).refine(data => {
    const totalSplits = data.splits.reduce((acc, curr) => acc + curr.amount, 0);
    return Math.abs(totalSplits - data.totalAmount) < 0.01;
}, {
    message: "Splits must sum up to the total amount",
    path: ["splits"]
});

type FormValues = z.infer<typeof formSchema>;

interface AddTransactionModalProps {
    accounts: { id: string; name: string; balance: number }[];
    onSuccess: () => void;
    initialData?: Partial<FormValues>;
    editMode?: boolean;
    transactionId?: string;
    children: React.ReactNode;
}

export function AddTransactionModal({ accounts, onSuccess, initialData, editMode, transactionId, children }: AddTransactionModalProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { categories, createCategory } = useCategories();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
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
                }
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
            const splitsPayload = data.splits.map(s => ({
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
            alert("Failed to save transaction");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDelete = async () => {
        if (!transactionId) return;
        const confirmDelete = window.confirm("Are you sure you want to delete this transaction? This action cannot be undone.");
        if (!confirmDelete) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
            if (error) throw error;

            setOpen(false);
            onSuccess();
        } catch (err) {
            console.error("Error deleting transaction:", err);
            alert("Failed to delete transaction");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px] glass-panel border-glass text-foreground max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">{editMode ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="accountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>From Account</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-surface-input border-glass">
                                                    <SelectValue placeholder="Select account" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="glass-panel border-glass">
                                                {accounts.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCOPWithSymbol(acc.balance)})</SelectItem>
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
                                        <FormLabel>Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal bg-surface-input border-glass hover:bg-surface-hover-strong hover:text-foreground",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(new Date(field.value + "T12:00:00"), "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 glass-panel border border-glass shadow-[0_10px_40px_rgba(0,0,0,0.8)]" align="start">
                                                <Calendar
                                                    mode="single"
                                                    className="bg-background text-foreground"
                                                    selected={field.value ? new Date(field.value + "T12:00:00") : undefined}
                                                    onSelect={(date: Date | undefined) => field.onChange(date ? format(date, "yyyy-MM-dd") : field.value)}
                                                    disabled={(date: Date) =>
                                                        date > new Date() || date < new Date("1900-01-01")
                                                    }
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
                                        <FormLabel>Transaction Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-surface-input border-glass">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="glass-panel border-glass">
                                                <SelectItem value="expense">Expense</SelectItem>
                                                <SelectItem value="income">Income</SelectItem>
                                                <SelectItem value="transfer">Transfer</SelectItem>
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
                                        <FormLabel>Total Amount</FormLabel>
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
                                        <FormLabel>Payee</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Uber, Vanti, etc." {...field} className="bg-surface-input border-glass" />
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
                                    <FormLabel>Categories</FormLabel>
                                    <FormControl>
                                        <CategoryMultiSelect
                                            categories={categories}
                                            selectedIds={field.value}
                                            onChange={(ids) => field.onChange(ids)}
                                            onCreateCategory={createCategory}
                                            placeholder="Select or create categories..."
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
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Dinner with friends..." {...field} className="bg-surface-input border-glass" />
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
                                        <FormLabel>Mark as Recurring Bill</FormLabel>
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
                                                        <SelectValue placeholder="Interval" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="glass-panel border-glass">
                                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                                    <SelectItem value="Yearly">Yearly</SelectItem>
                                                    <SelectItem value="Weekly">Weekly</SelectItem>
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
                                <h3 className="text-lg font-semibold text-primary">Splits</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="bg-transparent border-primary text-primary hover:bg-primary/20"
                                    onClick={() => append({ amount: undefined as any, assigned_to: "", status: "Pending Receival" })}
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    Add Split
                                </Button>
                            </div>

                            <FormMessage>{form.formState.errors.splits?.root?.message}</FormMessage>

                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="relative grid grid-cols-12 gap-3 items-end bg-surface-hover p-4 rounded-xl border border-glass">
                                        <FormField
                                            control={form.control}
                                            name={`splits.${index}.amount`}
                                            render={({ field: inputField }) => (
                                                <FormItem className="col-span-4">
                                                    <FormLabel className="text-xs">Amount</FormLabel>
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
                                                    <FormLabel className="text-xs">Assigned To</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Me, Mamá..." {...inputField} className="bg-surface-input border-glass text-sm" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name={`splits.${index}.status`}
                                            render={({ field: selectField }) => (
                                                <FormItem className="col-span-3">
                                                    <FormLabel className="text-xs">Status</FormLabel>
                                                    <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-surface-input border-glass text-sm px-2">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="glass-panel border-glass">
                                                            <SelectItem value="Settled">Settled</SelectItem>
                                                            <SelectItem value="Pending Receival">Receivable</SelectItem>
                                                            <SelectItem value="Pending Payment">Payable</SelectItem>
                                                            <SelectItem value="Ignored">Ignored</SelectItem>
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
                                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50"
                                    >
                                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                        Delete
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="hover:bg-surface-hover-strong border border-glass">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting || isDeleting} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {editMode ? 'Save Changes' : 'Save Transaction'}
                                </Button>
                            </div>
                        </div>

                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
