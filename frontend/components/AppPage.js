import Link from "next/link";
import styles from "./AppPage.module.css";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Analyze report" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
];

export default function AppPage({ eyebrow, title, description, children }) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          AquaCheck
        </Link>
        <nav aria-label="Main navigation" className={styles.navigation}>
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <section className={styles.content}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
        {children && <div className={styles.card}>{children}</div>}
      </section>
    </main>
  );
}
