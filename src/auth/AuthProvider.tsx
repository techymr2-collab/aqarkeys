import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import type { Profile } from "@/lib/database.types";
import { AuthContext, type AuthState } from "@/auth/context";

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error.message);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    // Initial hydration controls the `loading` gate.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      currentUserId.current = data.session?.user?.id ?? null;
      setSession(data.session);
      const p = data.session?.user ? await fetchProfile(data.session.user.id) : null;
      if (!active) return;
      setProfile(p);
      setLoading(false);
    });

    // Subsequent auth changes update session/profile without re-gating the
    // app. The profile fetch is deferred out of the callback: awaiting a
    // Supabase call inside onAuthStateChange can deadlock its internal lock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user?.id ?? null;
      // The signed-in user changed (login, logout, switch). Drop all cached
      // query data so one user never sees another's rows in the same tab.
      if (nextUserId !== currentUserId.current) {
        currentUserId.current = nextUserId;
        queryClient.clear();
      }
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        return;
      }
      const userId = nextSession.user.id;
      setTimeout(() => {
        void fetchProfile(userId).then((p) => {
          if (active) setProfile(p);
        });
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id ?? currentUserId.current;
    if (!uid) return;
    const p = await fetchProfile(uid);
    setProfile(p);
  }, [session]);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
