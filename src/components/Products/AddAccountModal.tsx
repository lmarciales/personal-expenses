import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/supabase/client";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

const accountSchema = z.object({
    name: z.string().min(1, "Name is required"),
    balance: z.number({ required_error: "Balance is required", invalid_type_error: "Balance is required" }).min(0, "Balance must be zero or positive"),
    type: z.string().min(1, "Type is required"),
});

type FormValues = z.infer<typeof accountSchema>;

export function AddAccountModal({ onSuccess, children }: { onSuccess: () => void, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accountTypes, setAccountTypes] = useState<{ name: string, color: string }[]>([]);

    const form = useForm<FormValues>({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            name: "",
            balance: undefined,
            type: "",
        },
    });

    useEffect(() => {
        const fetchTypes = async () => {
            const { data, error } = await supabase.from('account_types').select('name, color').order('name');
            if (data && !error) {
                setAccountTypes(data);
                if (data.length > 0) {
                    form.setValue("type", data[0].name);
                }
            }
        };
        fetchTypes();
    }, [form]);

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) throw new Error("User not authenticated");

            // Find the color from accountTypes
            const accountTypeObj = accountTypes.find(t => t.name === data.type);
            const color = accountTypeObj ? accountTypeObj.color : "bg-primary";

            const { error } = await supabase.from("accounts").insert({
                user_id: userData.user.id,
                name: data.name,
                type: data.type,
                balance: data.balance,
                color: color,
            });

            if (error) throw error;

            setOpen(false);
            form.reset();
            onSuccess();
        } catch (error) {
            console.error("Failed to add account", error);
            alert("Failed to add account. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-panel border-glass text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Add New Account</DialogTitle>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-surface-input border-glass">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="glass-panel border-glass">
                                            {accountTypes.map((t) => (
                                                <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
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
                                    <FormLabel>Initial Balance</FormLabel>
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

                        <div className="flex justify-end gap-3 pt-4 border-t border-glass">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="hover:bg-surface-hover-strong border border-glass">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-accent-lg">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Add Account
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
