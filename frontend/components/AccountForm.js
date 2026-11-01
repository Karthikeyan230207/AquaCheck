"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, Mail, Lock, ArrowRight, UserPlus, LogIn, AlertCircle, CheckCircle2 } from "lucide-react";
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
        "Authentication service is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local.",
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
        setMessage("Verification email dispatched. Please check your inbox to activate your account.");
      } else {
        router.push("/history");
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The authentication request failed. Please check your credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppPage
      description={
        isRegister
          ? "Create a private account to archive laboratory test reports and track long-term potability benchmarks."
          : "Sign in to access your saved water quality screenings, diagnostic records, and history."
      }
      eyebrow="SECURE ACCESS"
      title={isRegister ? "Create an Account" : "Sign In to AquaCheck"}
    >
      <div className={styles.container}>
        {authLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Verifying secure session…</p>
          </div>
        ) : !hasSupabaseConfiguration() ? (
          <div className={styles.error} role="alert">
            <AlertCircle size={18} />
            <span>Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local.</span>
          </div>
        ) : authError ? (
          <div className={styles.error} role="alert">
            <AlertCircle size={18} />
            <span>Could not verify session: {authError}</span>
          </div>
        ) : user ? (
          <div className={styles.signedInState}>
            <div className={styles.signedInIcon}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <p className={styles.signedInLabel}>Authenticated Account</p>
              <h3 className={styles.signedInEmail}>{user.email}</h3>
            </div>
            <Link href="/history" className={styles.btnPrimary}>
              <span>View Saved Reports</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label htmlFor="account-email">Work or Personal Email</label>
              <div className={styles.inputWrapper}>
                <Mail size={17} className={styles.inputIcon} />
                <input
                  autoComplete="email"
                  id="account-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@domain.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="account-password">Password</label>
                {isRegister && <span className={styles.hintText}>Minimum 6 characters</span>}
              </div>
              <div className={styles.inputWrapper}>
                <Lock size={17} className={styles.inputIcon} />
                <input
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  id="account-password"
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  required
                  type="password"
                  value={password}
                />
              </div>
            </div>

            <button className={styles.submitBtn} disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <div className={styles.spinnerSm} />
                  <span>Authenticating…</span>
                </>
              ) : isRegister ? (
                <>
                  <UserPlus size={17} />
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              ) : (
                <>
                  <LogIn size={17} />
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {error && (
              <div className={styles.error} role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className={styles.message} role="status">
                <CheckCircle2 size={18} />
                <span>{message}</span>
              </div>
            )}

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <div className={styles.switchBox}>
              <span className={styles.switchPrompt}>
                {isRegister ? "Already registered with AquaCheck?" : "New to AquaCheck?"}
              </span>
              <Link
                href={isRegister ? "/login" : "/register"}
                className={styles.switchButton}
              >
                {isRegister ? "Sign In Instead" : "Create New Account"}
              </Link>
            </div>
          </form>
        )}
      </div>
    </AppPage>
  );
}
