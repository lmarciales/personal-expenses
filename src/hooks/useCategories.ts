import { supabase } from "@/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
  is_group: boolean;
  parent_id: string | null;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("categories")
        .select("id, user_id, name, color, created_at, is_group, parent_id")
        .eq("user_id", userData.user.id)
        .order("name");

      if (error) throw error;

      const all = (data || []) as Category[];
      setCategories(all.filter((c) => !c.is_group));
      setGroups(all.filter((c) => c.is_group));
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(async (name: string, parentId?: string): Promise<Category> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error("User not authenticated");

    const userId = userData.user.id;

    const upsertData: { user_id: string; name: string; parent_id?: string } = { user_id: userId, name };
    if (parentId) {
      upsertData.parent_id = parentId;
    }

    // Try insert; on conflict return existing
    const { data, error } = await supabase
      .from("categories")
      .upsert(upsertData, { onConflict: "user_id,name" })
      .select()
      .single();

    if (error) throw error;

    const newCategory = data as Category;

    // Update local state — tags only (is_group defaults to false on new rows)
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === newCategory.id);
      if (exists) return prev;
      return [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name));
    });

    return newCategory;
  }, []);

  return { categories, groups, isLoading, createCategory, refetch: fetchCategories };
}
