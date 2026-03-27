import { supabase } from "@/supabase/client.ts";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { type ReactNode, createContext, useEffect, useMemo, useState } from "react";

interface Props {
  children?: ReactNode;
}

interface AuthContextValue {
  session: Session | null;
  userRole: "user" | "admin" | null;
  emailConfirmed: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  session: {} as Session | null,
  userRole: null,
  emailConfirmed: false,
});

export const AuthProvider = ({ children }: Props) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"user" | "admin" | null>(null);

  const emailConfirmed = session?.user?.email_confirmed_at != null;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, session: Session | null) => {
      setLoading(false);
      setSession(session || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setUserRole(null);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => setUserRole((data?.role as "user" | "admin") ?? null));
  }, [session?.user?.id]);

  const value = useMemo(() => ({ session, userRole, emailConfirmed }), [session, userRole, emailConfirmed]);

  return <AuthContext.Provider value={value}>{loading ? <div>Loading...</div> : children}</AuthContext.Provider>;
};
