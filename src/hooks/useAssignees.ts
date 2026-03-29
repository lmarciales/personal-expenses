import { supabase } from "@/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface Assignee {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export function useAssignees() {
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssignees = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("assignees")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("name");

      if (error) throw error;

      let list = (data || []) as Assignee[];

      // Auto-create "Me" if not present
      if (!list.some((a) => a.name === "Me")) {
        const { data: created, error: createError } = await supabase
          .from("assignees")
          .upsert({ user_id: userData.user.id, name: "Me" }, { onConflict: "user_id,name" })
          .select()
          .single();

        if (!createError && created) {
          list = [created as Assignee, ...list];
        }
      }

      setAssignees(list);
    } catch (err) {
      console.error("Failed to fetch assignees:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  const createAssignee = useCallback(async (name: string): Promise<Assignee> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("assignees")
      .upsert({ user_id: userData.user.id, name }, { onConflict: "user_id,name" })
      .select()
      .single();

    if (error) throw error;

    const newAssignee = data as Assignee;

    setAssignees((prev) => {
      const exists = prev.some((a) => a.id === newAssignee.id);
      if (exists) return prev;
      return [...prev, newAssignee].sort((a, b) => a.name.localeCompare(b.name));
    });

    return newAssignee;
  }, []);

  return { assignees, isLoading, createAssignee, refetch: fetchAssignees };
}
