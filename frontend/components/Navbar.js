"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Droplets,
  Home,
  LayoutDashboard,
  History as HistoryIcon,
  LogOut,
  Menu,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getSupabaseClient } from "../lib/supabase";
import styles from "./Navbar.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Analyze", icon: Upload },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

/**
 * Unified Navigation Bar used across Home, Dashboard, and all application pages.
 * Guarantees 100% consistent format, styling, branding, and auth state.
 */
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" onClick={closeMenu}>
          <span className={styles.brandMark} aria-hidden="true">
            <Droplets size={18} strokeWidth={2.4} />
          </span>
          <span className={styles.brandText}>AquaCheck</span>
        </Link>

        <nav aria-label="Primary navigation" className={styles.desktopNav}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                href={href}
              >
                <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.headerActions}>
          {loading ? (
            <span className={styles.headerStatus}>Checking…</span>
          ) : user ? (
            <>
              <span className={styles.userChip} title={user.email}>
                <UserIcon size={14} strokeWidth={2.2} aria-hidden="true" />
                <span className={styles.userEmail}>{user.email}</span>
              </span>
              <button
                className={styles.signOutBtn}
                disabled={signingOut}
                onClick={handleSignOut}
                type="button"
              >
                <LogOut size={15} strokeWidth={2.2} aria-hidden="true" />
                {signingOut ? "…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link className={styles.signInLink} href="/login">
                Sign in
              </Link>
              <Link className={styles.signUpBtn} href="/register">
                Get started
              </Link>
            </>
          )}

          <button
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
            className={styles.menuButton}
            onClick={() => setMenuOpen((v) => !v)}
            type="button"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="Mobile navigation" className={styles.mobileNav}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                className={`${styles.mobileNavLink} ${active ? styles.navLinkActive : ""}`}
                href={href}
                onClick={closeMenu}
              >
                <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
                {label}
              </Link>
            );
          })}

          <div className={styles.mobileActions}>
            {user ? (
              <button
                className={styles.mobileSignOutBtn}
                disabled={signingOut}
                onClick={handleSignOut}
                type="button"
              >
                <LogOut size={16} strokeWidth={2.2} aria-hidden="true" />
                Sign out ({user.email})
              </button>
            ) : (
              <div className={styles.mobileAuthRow}>
                <Link
                  className={styles.mobileSignIn}
                  href="/login"
                  onClick={closeMenu}
                >
                  Sign in
                </Link>
                <Link
                  className={styles.mobileSignUp}
                  href="/register"
                  onClick={closeMenu}
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

