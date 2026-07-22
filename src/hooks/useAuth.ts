"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/utils/supabase/client";
import { useRouter } from "next/navigation";

type AuthState = {
  user: import("@supabase/supabase-js").User | null;
  token: string | null;
  loading: boolean;
};

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        const user = data.session?.user ?? null;
        const token = data.session?.access_token ?? null;
        if (!user && requireAuth) {
          router.replace("/login");
          return;
        }
        setState({ user, token, loading: false });
      })
      .catch(() => {
        setState({ user: null, token: null, loading: false });
      });
  }, [requireAuth, router]);

  return state;
}
