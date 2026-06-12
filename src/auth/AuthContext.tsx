import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

async function upsertProfile(id: string, displayName: string, email: string) {
  if (!supabase) return;
  await supabase.from("profiles").upsert(
    { id, display_name: displayName, email, color: "#34d399" },
    { onConflict: "id", ignoreDuplicates: true },
  );
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  isLocal: boolean;
}

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const LOCAL_USER_KEY = "batwara:local_user";

const DEFAULT_LOCAL_USER: AppUser = {
  id: "local_user",
  email: "local@batwara.app",
  displayName: "Me",
  isLocal: true,
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Local mode: load or create local user from AsyncStorage
      AsyncStorage.getItem(LOCAL_USER_KEY).then((raw) => {
        const stored = raw ? (JSON.parse(raw) as AppUser) : DEFAULT_LOCAL_USER;
        if (!raw) AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEFAULT_LOCAL_USER));
        setUser(stored);
        setLoading(false);
      });
      return;
    }

    // Supabase mode
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        const displayName = u.user_metadata?.display_name ?? u.email?.split("@")[0] ?? "Me";
        upsertProfile(u.id, displayName, u.email ?? "");
        setUser({ id: u.id, email: u.email ?? "", displayName, isLocal: false });
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const displayName = u.user_metadata?.display_name ?? u.email?.split("@")[0] ?? "Me";
        upsertProfile(u.id, displayName, u.email ?? "");
        setUser({
          id: u.id,
          email: u.email ?? "",
          displayName,
          isLocal: false,
        });
      } else {
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return null;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async function signUp(email: string, password: string, name: string): Promise<string | null> {
    if (!supabase) return null;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    return error?.message ?? null;
  }

  async function signOut() {
    if (!isSupabaseConfigured || !supabase) {
      // Clear local user so a fresh one is created on next launch
      await AsyncStorage.removeItem(LOCAL_USER_KEY);
      setUser(null);
      // Re-create default local user immediately (no login screen in local mode)
      await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEFAULT_LOCAL_USER));
      setUser(DEFAULT_LOCAL_USER);
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
