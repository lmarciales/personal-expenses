import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface DebtItem {
  transactionId: string;
  splitId: string;
  payee: string;
  date: string;
  amount: number;
  transactionTotal: number;
  notes: string | null;
}

export interface AccountDebtGroup {
  account: {
    id: string;
    name: string;
    type: string;
    color: string | null;
    balance: number;
  };
  items: DebtItem[];
  total: number;
  transactionTotal: number;
}

export interface PersonDebtGroup {
  person: string;
  items: (DebtItem & { accountName: string })[];
  total: number;
}

export interface PersonCombinedGroup {
  person: string;
  iOweItems: DebtItem[];
  owedToMeItems: (DebtItem & { accountName: string })[];
  totalIOwe: number;
  totalOwedToMe: number;
  netBalance: number; // positive = they owe me more, negative = I owe more
}

export interface SimpleAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

const EXTERNAL_ACCOUNT_ID = "external";

type DebtAccountRow = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  balance: number;
};

type MyDebtSplitRow = {
  id: string;
  amount: number;
  assigned_to: string;
  status: string;
  transactions: {
    id: string;
    payee: string;
    date: string;
    total_amount: number;
    account_id: string | null;
    notes: string | null;
    creditor: string | null;
    accounts: DebtAccountRow | null;
  };
};

type OwedDebtSplitRow = {
  id: string;
  amount: number;
  assigned_to: string;
  status: string;
  transactions: {
    id: string;
    payee: string;
    date: string;
    total_amount: number;
    notes: string | null;
    accounts: { name: string } | null;
  };
};

export function useDebtsData() {
  const [myDebts, setMyDebts] = useState<AccountDebtGroup[]>([]);
  const [owedToMe, setOwedToMe] = useState<PersonDebtGroup[]>([]);
  const [peopleDebts, setPeopleDebts] = useState<PersonCombinedGroup[]>([]);
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");
      const userId = userData.user.id;

      // Fetch all accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, name, type, color, balance")
        .eq("user_id", userId);
      if (accountsError) throw accountsError;
      setAccounts((accountsData || []) as SimpleAccount[]);

      // Fetch My Debts: splits assigned to "Me" with status "Pending Payment"
      const { data: myDebtsData, error: myDebtsError } = await supabase
        .from("transaction_splits")
        .select(`
          id,
          amount,
          assigned_to,
          status,
          transactions!inner(
            id,
            payee,
            date,
            total_amount,
            account_id,
            notes,
            creditor,
            accounts(id, name, type, color, balance)
          )
        `)
        .eq("user_id", userId)
        .eq("assigned_to", "Me")
        .eq("status", "Pending Payment");

      if (myDebtsError) throw myDebtsError;

      // Group by account (or "external" for no-account transactions)
      const accountMap = new Map<string, AccountDebtGroup>();
      const myDebtSplits = (myDebtsData || []) as MyDebtSplitRow[];
      for (const split of myDebtSplits) {
        const txn = split.transactions;
        const acc = txn.accounts;
        const accountId = acc?.id || EXTERNAL_ACCOUNT_ID;

        let group = accountMap.get(accountId);
        if (!group) {
          group = {
            account: acc
              ? {
                  id: acc.id,
                  name: acc.name,
                  type: acc.type,
                  color: acc.color,
                  balance: acc.balance,
                }
              : {
                  id: EXTERNAL_ACCOUNT_ID,
                  name: "External",
                  type: "External",
                  color: null,
                  balance: 0,
                },
            items: [],
            total: 0,
            transactionTotal: 0,
          };
          accountMap.set(accountId, group);
        }

        group.items.push({
          transactionId: txn.id,
          splitId: split.id,
          payee: txn.payee,
          date: txn.date,
          amount: split.amount,
          transactionTotal: txn.total_amount,
          notes: txn.notes,
        });
        group.total += split.amount;
        group.transactionTotal += txn.total_amount;
      }
      const myDebtsGroups = Array.from(accountMap.values());
      for (const group of myDebtsGroups) {
        group.items.sort((a, b) => b.date.localeCompare(a.date));
      }
      setMyDebts(myDebtsGroups);

      // Fetch Owed to Me: splits NOT assigned to "Me" with status "Pending Receival"
      const { data: owedData, error: owedError } = await supabase
        .from("transaction_splits")
        .select(`
          id,
          amount,
          assigned_to,
          status,
          transactions!inner(
            id,
            payee,
            date,
            total_amount,
            notes,
            accounts(name)
          )
        `)
        .eq("user_id", userId)
        .neq("assigned_to", "Me")
        .eq("status", "Pending Receival");

      if (owedError) throw owedError;

      // Group by person
      const personMap = new Map<string, PersonDebtGroup>();
      const owedSplits = (owedData || []) as OwedDebtSplitRow[];
      for (const split of owedSplits) {
        const txn = split.transactions;
        const person = split.assigned_to;

        let group = personMap.get(person);
        if (!group) {
          group = {
            person,
            items: [],
            total: 0,
          };
          personMap.set(person, group);
        }

        group.items.push({
          transactionId: txn.id,
          splitId: split.id,
          payee: txn.payee,
          date: txn.date,
          amount: split.amount,
          transactionTotal: txn.total_amount,
          notes: txn.notes,
          accountName: txn.accounts?.name || "External",
        });
        group.total += split.amount;
      }
      const owedGroups = Array.from(personMap.values());
      for (const group of owedGroups) {
        group.items.sort((a, b) => b.date.localeCompare(a.date));
      }
      setOwedToMe(owedGroups);

      // Build People aggregation (combining both directions by person name)
      const peopleMap = new Map<string, PersonCombinedGroup>();

      // Add "I owe" items from external debts with a creditor
      for (const split of myDebtSplits) {
        const txn = split.transactions;
        const creditor = txn.creditor;
        if (!creditor) continue; // Only external debts with creditor

        let group = peopleMap.get(creditor);
        if (!group) {
          group = {
            person: creditor,
            iOweItems: [],
            owedToMeItems: [],
            totalIOwe: 0,
            totalOwedToMe: 0,
            netBalance: 0,
          };
          peopleMap.set(creditor, group);
        }
        group.iOweItems.push({
          transactionId: txn.id,
          splitId: split.id,
          payee: txn.payee,
          date: txn.date,
          amount: split.amount,
          transactionTotal: txn.total_amount,
          notes: txn.notes,
        });
        group.totalIOwe += split.amount;
      }

      // Add "Owed to me" items
      for (const split of owedSplits) {
        const txn = split.transactions;
        const person = split.assigned_to;

        let group = peopleMap.get(person);
        if (!group) {
          group = {
            person,
            iOweItems: [],
            owedToMeItems: [],
            totalIOwe: 0,
            totalOwedToMe: 0,
            netBalance: 0,
          };
          peopleMap.set(person, group);
        }
        group.owedToMeItems.push({
          transactionId: txn.id,
          splitId: split.id,
          payee: txn.payee,
          date: txn.date,
          amount: split.amount,
          transactionTotal: txn.total_amount,
          notes: txn.notes,
          accountName: txn.accounts?.name || "External",
        });
        group.totalOwedToMe += split.amount;
      }

      // Calculate net balances and sort items
      const peopleGroups = Array.from(peopleMap.values());
      for (const group of peopleGroups) {
        group.netBalance = group.totalOwedToMe - group.totalIOwe;
        group.iOweItems.sort((a, b) => b.date.localeCompare(a.date));
        group.owedToMeItems.sort((a, b) => b.date.localeCompare(a.date));
      }
      setPeopleDebts(peopleGroups);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { myDebts, owedToMe, peopleDebts, accounts, isLoading, error, refetch: fetchData };
}
