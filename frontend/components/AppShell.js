"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import styles from "./AppShell.module.css";

/**
 * Unified application shell: one consistent header + navigation for every
 * signed-in (or signed-out) inner page.
 */
export default function AppShell({ children }) {
  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}
