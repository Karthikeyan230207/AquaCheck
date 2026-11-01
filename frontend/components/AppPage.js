import { ChevronRight } from "lucide-react";
import AppShell from "./AppShell";
import styles from "./AppPage.module.css";

/**
 * Page wrapper used by history, profile, report detail, and the account forms.
 * Renders a consistent header/intro inside the shared AppShell navigation.
 */
export default function AppPage({
  eyebrow,
  title,
  description,
  wide = false,
  actions = null,
  children,
}) {
  return (
    <AppShell>
      <section className={`${styles.wrap} ${wide ? styles.wrapWide : ""}`}>
        <header className={styles.head}>
          <div className={styles.headContent}>
            {eyebrow && (
              <p className={styles.eyebrow}>
                <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
                {eyebrow}
              </p>
            )}
            <h1 className={styles.title}>{title}</h1>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.headActions}>{actions}</div>}
        </header>
        <div className={`${styles.body} ${wide ? styles.bodyWide : ""}`}>{children}</div>
      </section>
    </AppShell>
  );
}
