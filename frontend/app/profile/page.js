"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AppPage from "../../components/AppPage";
import { useAuth } from "../../hooks/useAuth";
import { getSupabaseClient } from "../../lib/supabase";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, error: authError } = useAuth();
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not configured for this application.");
      return;
    }

    setSigningOut(true);
    setError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.push("/");
      router.refresh();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Could not sign out. Please try again.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <AppPage
      description="Account information and sign-in controls."
      eyebrow="ACCOUNT"
      title="Profile"
    >
      {loading ? (
        <p>Checking your sign-in status…</p>
      ) : authError ? (
        <p className={styles.error} role="alert">
          Could not verify your sign-in status: {authError}
        </p>
      ) : user ? (
        <>
          <p>Signed in as</p>
          <p className={styles.email}>{user.email}</p>
          <button
            className={styles.signOutButton}
            disabled={signingOut}
            onClick={signOut}
            type="button"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </>
      ) : (
        <>
          <p>You are not signed in.</p>
          <p>
            <Link href="/login">Sign in</Link>
          </p>
        </>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </AppPage>
  );
}
