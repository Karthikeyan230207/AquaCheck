"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AppPage from "./AppPage";
import styles from "./AccountForm.module.css";
import {
  getSupabaseClient,
  hasSupabaseConfiguration,
} from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

export default function AccountForm({ mode }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = isRegister
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;

      if (isRegister && !result.data.session) {
        setMessage("Check your email for the confirmation link to finish signing up.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The account request failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppPage
      description={
        isRegister
          ? "Create an account to save analyzed reports and view them later."
          : "Sign in to save new analyses and access your report history."
      }
      eyebrow="ACCOUNT"
      title={isRegister ? "Create an account" : "Sign in"}
    >
      {authLoading ? (
        <p>Checking your sign-in status…</p>
      ) : !hasSupabaseConfiguration() ? (
        <p className={styles.error} role="alert">
          Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local.
        </p>
      ) : authError ? (
        <p className={styles.error} role="alert">
          Could not verify your sign-in status: {authError}
        </p>
      ) : user ? (
        <>
          <p>You are signed in as {user.email}.</p>
          <p>
            <Link href="/dashboard">Go to your dashboard</Link>
          </p>
        </>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="account-email">Email</label>
          <input
            autoComplete="email"
            id="account-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <label htmlFor="account-password">Password</label>
          <input
            autoComplete={isRegister ? "new-password" : "current-password"}
            id="account-password"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          <button disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className={styles.message} role="status">
              {message}
            </p>
          )}
          <p className={styles.switchLink}>
            {isRegister ? "Already registered?" : "New to AquaCheck?"}{" "}
            <Link href={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>
      )}
    </AppPage>
  );
}
