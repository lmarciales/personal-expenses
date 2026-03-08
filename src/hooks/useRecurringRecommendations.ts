import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/supabase/client";
import { isSameMonth, isSameYear, parseISO, isSameWeek } from "date-fns";

export interface RecurringRecommendation {
    payee: string;
    total_amount: number;
    recurrence_interval: "Monthly" | "Yearly" | "Weekly";
    last_paid_date: string;
    account_id: string; // The account previously used
}

export function useRecurringRecommendations() {
    const [recommendations, setRecommendations] = useState<RecurringRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRecommendations = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) throw new Error("User not authenticated");
            const userId = userData.user.id;

            // Fetch all transactions marked as recurring
            const { data: recurringTxns, error: txnsError } = await supabase
                .from("transactions")
                .select("payee, total_amount, recurrence_interval, date, account_id")
                .eq("user_id", userId)
                .eq("is_recurring", true)
                .order("date", { ascending: false });

            if (txnsError) throw txnsError;

            if (!recurringTxns || recurringTxns.length === 0) {
                setRecommendations([]);
                setIsLoading(false);
                return;
            }

            const now = new Date();

            // Group by payee to find the latest payment for each recurring bill
            const latestPayments = new Map<string, typeof recurringTxns[0]>();

            recurringTxns.forEach(txn => {
                if (!latestPayments.has(txn.payee)) {
                    latestPayments.set(txn.payee, txn);
                }
            });

            const suggestions: RecurringRecommendation[] = [];

            latestPayments.forEach((txn) => {
                const lastPaidDate = parseISO(txn.date);
                let needsRecommendation = false;

                if (txn.recurrence_interval === "Monthly") {
                    // Suggest if not paid this month
                    needsRecommendation = !isSameMonth(lastPaidDate, now);
                } else if (txn.recurrence_interval === "Yearly") {
                    // Suggest if not paid this year, AND it's generally due this month based on the original payment
                    needsRecommendation = !isSameYear(lastPaidDate, now) && lastPaidDate.getMonth() === now.getMonth();
                } else if (txn.recurrence_interval === "Weekly") {
                    needsRecommendation = !isSameWeek(lastPaidDate, now);
                }

                if (needsRecommendation) {
                    suggestions.push({
                        payee: txn.payee,
                        total_amount: txn.total_amount,
                        recurrence_interval: txn.recurrence_interval as any,
                        last_paid_date: txn.date,
                        account_id: txn.account_id
                    });
                }
            });

            setRecommendations(suggestions);
        } catch (err) {
            console.error("Failed to fetch recurring recommendations:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    return { recommendations, isLoading, refetch: fetchRecommendations };
}
