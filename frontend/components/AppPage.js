import { ChevronRight } from "lucide-react";
import AppShell from "./AppShell";
import styles from "./AppPage.module.css";

/**
 * Page wrapper used by history, profile, report detail, and the account forms.
 * Renders a consistent header/intro inside the shared AppShell navigation.
 */
export default function AppPage({ eyebrow, title, description, children }) {
  return (
    <AppShell>
      <section className={styles.wrap}>
        <header className={styles.head}>
          {eyebrow && (
            <p className={styles.eyebrow}>
              <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
              {eyebrow}
            </p>
          )}
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </header>
        <div className={styles.body}>{children}</div>
      </section>
    </AppShell>
  );
}
