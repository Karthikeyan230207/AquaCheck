import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Droplets,
  FileText,
  Languages,
  Lock,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import WaterQualityScene from "../components/WaterQualityScene";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./page.module.css";

const sampleParameters = [
  { parameter: "pH", value: 7.4, status: "within_range", reference_minimum: 6.5, reference_maximum: 8.5 },
  { parameter: "TDS", value: 210, status: "within_range", reference_maximum: 500 },
  { parameter: "Turbidity", value: 0.8, status: "within_range", reference_maximum: 1.5 },
  { parameter: "Total Hardness", value: 110, status: "within_range", reference_maximum: 200 },
  { parameter: "Chloride", value: 48, status: "within_range", reference_maximum: 250 },
  { parameter: "Iron", value: 0.12, status: "attention", reference_maximum: 0.3 },
];

const steps = [
  {
    icon: FileText,
    title: "Upload a lab report",
    description: "Bring in a text-based PDF with the measurements you need reviewed.",
  },
  {
    icon: ScanSearch,
    title: "Understand each parameter",
    description: "Compare pH, TDS, turbidity, nitrate, and more against safe drinking ranges.",
  },
  {
    icon: CheckCircle2,
    title: "Act with confidence",
    description: "Get a clear score, recommendations, and a readable explanation for the result.",
  },
];

const features = [
  {
    icon: ScanSearch,
    title: "Automatic extraction",
    description: "Reads the numbers straight from your PDF — no manual typing or spreadsheets.",
  },
  {
    icon: BarChart3,
    title: "Standards comparison",
    description: "Every value is checked against recognized drinking-water reference ranges.",
  },
  {
    icon: Sparkles,
    title: "Plain-language story",
    description: "Turns technical results into a friendly explanation your whole family can read.",
  },
  {
    icon: Languages,
    title: "5 languages",
    description: "Explanations in English, हिंदी, தமிழ், Español, and Français.",
  },
  {
    icon: Droplets,
    title: "3D water preview",
    description: "See suspended particles visualized inside a glass of your sample.",
  },
  {
    icon: Lock,
    title: "Private & secure",
    description: "Sign in to keep every saved report private to your own account.",
  },
];

const parameters = [
  { name: "pH", range: "6.5 – 8.5" },
  { name: "TDS", range: "≤ 500 mg/L" },
  { name: "Turbidity", range: "≤ 1 NTU" },
  { name: "Total Hardness", range: "≤ 200 mg/L" },
  { name: "Chloride", range: "≤ 250 mg/L" },
  { name: "Fluoride", range: "≤ 1 mg/L" },
  { name: "Nitrate", range: "≤ 45 mg/L" },
  { name: "Iron", range: "≤ 0.3 mg/L" },
];

export default function Home() {
  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <main className={styles.page}>
        <div className={styles.orbOne} aria-hidden="true" />
        <div className={styles.orbTwo} aria-hidden="true" />

        <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>CLEARER WATER. SMARTER ACTION.</p>
          <h1>Turn every water report into a clear, confident decision.</h1>
          <p className={styles.lede}>
            AquaCheck helps you read complex lab results through a clean dashboard,
            plain-language explanations, and water-specific insights that feel easy to trust.
          </p>

          <div className={styles.ctaRow}>
            <Link className={styles.primaryButton} href="/upload">
              Analyze a report <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
            </Link>
            <Link className={styles.secondaryButton} href="/dashboard">
              View dashboard
            </Link>
          </div>

          <div className={styles.metrics}>
            <div>
              <strong>8+</strong>
              <span>Water parameters</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Rule-based insights</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Water screening</span>
            </div>
          </div>
        </div>

        <div className={styles.previewShell} aria-label="Example water analysis summary">
          <div className={styles.previewHeader}>
            <div>
              <span className={styles.previewLabel}>LIVE REPORT</span>
              <h2>Water quality profile</h2>
            </div>
            <span className={styles.previewStatus}>
              <CheckCircle2 size={13} strokeWidth={2.6} aria-hidden="true" />
              Healthy
            </span>
          </div>
          <div className={styles.previewScene}>
            <WaterQualityScene parameters={sampleParameters} viewMode="normal" />
          </div>
          <div className={styles.previewStats}>
            <div>
              <span>pH</span>
              <strong>7.4</strong>
            </div>
            <div>
              <span>TDS</span>
              <strong>210</strong>
            </div>
            <div>
              <span>Score</span>
              <strong>92/100</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <p className={styles.eyebrow}>A SIMPLE FLOW</p>
        <h2>From report upload to readable guidance</h2>
        <div className={styles.steps}>
          {steps.map((step, i) => (
            <article className={styles.step} key={step.title}>
              <span className={styles.stepIcon}>
                <step.icon size={22} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className={styles.stepNumber}>0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.featuresSection}>
        <p className={styles.eyebrow}>WHY AQUACHECK</p>
        <h2>Everything you need to trust your water</h2>
        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <article className={styles.featureCard} key={feature.title}>
              <span className={styles.featureIcon}>
                <feature.icon size={22} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.paramsSection}>
        <div className={styles.paramsIntro}>
          <p className={styles.eyebrow}>PARAMETERS WE CHECK</p>
          <h2>Screened against safe drinking ranges</h2>
          <p>
            AquaCheck recognises the most common water-quality measurements and
            compares each one with its recommended reference range.
          </p>
          <Link className={styles.inlineLink} href="/upload">
            Analyze your report <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>
        <ul className={styles.paramsList}>
          {parameters.map((p) => (
            <li key={p.name}>
              <span className={styles.paramName}>{p.name}</span>
              <span className={styles.paramRange}>{p.range}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <span className={styles.ctaIcon}>
            <ShieldCheck size={26} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <h2>Ready to understand your water?</h2>
          <p>
            Upload a report and get a clear score, recommendations, and a friendly
            explanation in seconds — no lab expertise required.
          </p>
          <div className={styles.ctaActions}>
            <Link className={styles.primaryButton} href="/upload">
              <Upload size={18} strokeWidth={2.4} aria-hidden="true" />
              Analyze a report
            </Link>
            <Link className={styles.secondaryButton} href="/register">
              Create free account
            </Link>
          </div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
