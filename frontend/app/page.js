import Link from "next/link";
import styles from "./page.module.css";

const steps = [
  {
    number: "01",
    title: "Upload a text-based PDF",
    description: "Choose a lab report that contains selectable PDF text.",
  },
  {
    number: "02",
    title: "Review extracted measurements",
    description: "Check the supported water-quality values found in the report.",
  },
  {
    number: "03",
    title: "Understand the results",
    description: "See reference-range statuses, a score, and recommendations.",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <span aria-hidden="true" className={styles.brandMark}>
            A
          </span>
          AquaCheck
        </Link>
        <nav aria-label="Main navigation" className={styles.nav}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/login">Sign in</Link>
          <Link className={styles.navCta} href="/upload">
            Analyze a report
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>CLEARER WATER DATA STARTS HERE</p>
          <h1>Make sense of your water quality report.</h1>
          <p className={styles.lede}>
            Upload a text-based lab report and get its supported measurements
            organized with easy-to-understand range checks and recommendations.
          </p>
          <Link className={styles.primaryButton} href="/upload">
            Analyze a report <span aria-hidden="true">→</span>
          </Link>
          <p className={styles.note}>
            Text-based PDFs only for now. Scanned reports need OCR support.
          </p>
        </div>
        <div aria-label="Example water analysis summary" className={styles.preview}>
          <div className={styles.previewHeader}>
            <div>
              <span className={styles.previewLabel}>SAMPLE ANALYSIS</span>
              <h2>Water report</h2>
            </div>
            <span className={styles.previewIcon} aria-hidden="true">
              ✓
            </span>
          </div>
          <div className={styles.previewScore}>
            <span>Results are based on measured values</span>
            <strong>Within range</strong>
          </div>
          <div className={styles.previewRow}>
            <span>pH</span>
            <strong>Reference range check</strong>
            <span className={styles.ok}>Within range</span>
          </div>
          <div className={styles.previewRow}>
            <span>TDS</span>
            <strong>Reference range check</strong>
            <span className={styles.ok}>Within range</span>
          </div>
          <p className={styles.previewFootnote}>
            Example only — your uploaded report supplies the results.
          </p>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <p className={styles.eyebrow}>A SIMPLE FIRST LOOK</p>
        <h2>From report to readable results</h2>
        <div className={styles.steps}>
          {steps.map((step) => (
            <article className={styles.step} key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className={styles.footer}>
        AquaCheck provides an informational screening, not a substitute for
        professional laboratory advice.
      </footer>
    </main>
  );
}
