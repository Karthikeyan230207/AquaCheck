import Link from "next/link";
import { Droplets, ShieldCheck, HeartPulse, FileText, ExternalLink } from "lucide-react";
import styles from "./Footer.module.css";

/**
 * Global comprehensive Footer for AquaCheck.
 * Features brand mission, quick navigation, parameter guidelines, and medical/lab disclaimer.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Col 1: Brand & Mission */}
          <div className={styles.brandCol}>
            <Link className={styles.brand} href="/">
              <span className={styles.brandMark} aria-hidden="true">
                <Droplets size={18} strokeWidth={2.4} />
              </span>
              <span className={styles.brandText}>AquaCheck</span>
            </Link>
            <p className={styles.mission}>
              Pure clarity for every drop. AquaCheck converts complex laboratory
              water testing documents into instant, easy-to-understand insights,
              interactive 3D simulations, and actionable guidance for homes and families.
            </p>
            <div className={styles.trustBadge}>
              <ShieldCheck size={16} strokeWidth={2.2} />
              <span>Standards-grounded analysis</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Navigation</h3>
            <ul className={styles.linkList}>
              <li>
                <Link href="/">Home Overview</Link>
              </li>
              <li>
                <Link href="/dashboard">Water Dashboard</Link>
              </li>
              <li>
                <Link href="/upload">Analyze PDF Report</Link>
              </li>
              <li>
                <Link href="/history">Saved History</Link>
              </li>
              <li>
                <Link href="/profile">Account Profile</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Screened Parameters */}
          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Key Parameters</h3>
            <ul className={styles.linkList}>
              <li>
                <span>pH Acidity & Alkalinity (6.5 – 8.5)</span>
              </li>
              <li>
                <span>Total Dissolved Solids (TDS &le; 500 mg/L)</span>
              </li>
              <li>
                <span>Turbidity & Suspended Dust (&le; 1 NTU)</span>
              </li>
              <li>
                <span>Total Hardness & Scale (&le; 200 mg/L)</span>
              </li>
              <li>
                <span>Nitrate, Fluoride & Iron Safety</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Water Standards & Health */}
          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Drinking Guidelines</h3>
            <ul className={styles.linkList}>
              <li>
                <span className={styles.refItem}>
                  <FileText size={13} strokeWidth={2} />
                  WHO Drinking-water Guidelines
                </span>
              </li>
              <li>
                <span className={styles.refItem}>
                  <FileText size={13} strokeWidth={2} />
                  BIS IS 10500 Drinking Norms
                </span>
              </li>
              <li>
                <span className={styles.refItem}>
                  <FileText size={13} strokeWidth={2} />
                  EPA Safe Drinking Water Standards
                </span>
              </li>
              <li>
                <span className={styles.refItem}>
                  <HeartPulse size={13} strokeWidth={2} />
                  Infant & Family Safety Scoring
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Bar */}
        <div className={styles.disclaimerBar}>
          <p>
            <strong>Health Notice:</strong> AquaCheck is an informational screening
            platform that evaluates test numbers against public water quality standards.
            It does not replace certified clinical, governmental, or certified laboratory
            inspections.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            &copy; {currentYear} AquaCheck. All rights reserved.
          </p>
          <div className={styles.bottomLinks}>
            <Link href="/upload">Start Screening</Link>
            <span aria-hidden="true">&bull;</span>
            <Link href="/dashboard">Dashboard</Link>
            <span aria-hidden="true">&bull;</span>
            <Link href="/login">Sign In</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

