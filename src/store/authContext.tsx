import { supabase } from "@/supabase/client.ts";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { type ReactNode, createContext, useEffect, useMemo, useState } from "react";

interface Props {
  children?: ReactNode;
}

interface AuthContextValue {
  session: Session | null;
}

export const AuthContext = createContext<AuthContextValue>({
  session: {} as Session | null,
});

export const AuthProvider = ({ children }: Props) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  console.log(session);

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

  const value = useMemo(() => ({ session }), [session]);

  return <AuthContext.Provider value={value}>{loading ? <div>Loading...</div> : children}</AuthContext.Provider>;
};
