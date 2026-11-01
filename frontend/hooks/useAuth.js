"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  getSupabaseClient,
  hasSupabaseConfiguration,
} from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(hasSupabaseConfiguration);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return undefined;
    }

    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setAccessToken(session?.access_token ?? "");
        setLoading(false);
        setError("");
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!mounted) return;
        if (sessionError) {
          setError(sessionError.message);
          setUser(null);
          setAccessToken("");
        } else {
          setUser(data.session?.user ?? null);
          setAccessToken(data.session?.access_token ?? "");
        }
        setLoading(false);
      })
      .catch((sessionError) => {
        if (!mounted) return;
        setError(
          sessionError instanceof Error
            ? sessionError.message
            : "Could not check your sign-in status.",
        );
        setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth must be used within the root AuthProvider.");
  }
  return auth;
}
