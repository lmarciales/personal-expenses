import { supabase } from "@/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("name");

      if (error) throw error;
      setCategories((data || []) as Category[]);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(async (name: string): Promise<Category> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error("User not authenticated");

    const userId = userData.user.id;

    // Try insert; on conflict return existing
    const { data, error } = await supabase
      .from("categories")
      .upsert({ user_id: userId, name }, { onConflict: "user_id,name" })
      .select()
      .single();

    if (error) throw error;

    const newCategory = data as Category;

    // Update local state
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === newCategory.id);
      if (exists) return prev;
      return [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name));
    });

    return newCategory;
  }, []);

  return { categories, isLoading, createCategory, refetch: fetchCategories };
}
