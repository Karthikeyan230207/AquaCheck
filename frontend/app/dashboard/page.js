"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Droplets,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";
import WaterQualityScene from "../../components/WaterQualityScene";
import AppShell from "../../components/AppShell";
import { useAuth } from "../../hooks/useAuth";
import styles from "./dashboard.module.css";

const recentParameters = [
  {
    parameter: "pH",
    value: 7.5,
    unit: "",
    status: "within_range",
    reference_minimum: 6.5,
    reference_maximum: 8.5,
  },
  {
    parameter: "TDS",
    value: 220,
    unit: "mg/L",
    status: "within_range",
    reference_maximum: 500,
  },
  {
    parameter: "Turbidity",
    value: 1.2,
    unit: "NTU",
    status: "within_range",
    reference_maximum: 1.5,
  },
  {
    parameter: "Total Hardness",
    value: 140,
    unit: "mg/L",
    status: "within_range",
    reference_maximum: 200,
  },
  {
    parameter: "Chloride",
    value: 60,
    unit: "mg/L",
    status: "within_range",
    reference_maximum: 250,
  },
  {
    parameter: "Iron",
    value: 0.18,
    unit: "mg/L",
    status: "attention",
    reference_maximum: 0.3,
  },
];

export default function DashboardPage() {
  const { user, loading, error: authError } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className={styles.centerCard}>Checking your account…</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className={styles.accessCard}>
          <div className={styles.lockBadge}>
            <Droplets size={28} strokeWidth={2.2} />
          </div>
          <p className={styles.eyebrow}>PRIVATE WATER DASHBOARD</p>
          <h1>Sign in to unlock your AquaCheck dashboard</h1>
          <p>
            Your recent reports, score history, and analysis insights are kept private
            to your account.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/login">
              Sign in
            </Link>
            <Link className={styles.secondary} href="/register">
              Create account
            </Link>
          </div>
          <div className={styles.previewRow}>
            <span>Status</span>
            <strong>Private</strong>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>
              <LayoutDashboard size={13} strokeWidth={2.6} aria-hidden="true" />
              OVERVIEW
            </p>
            <h1>Welcome back</h1>
          </div>
          <div className={styles.userPill}>{user.email}</div>
        </header>

        <div className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricIcon}>
              <Activity size={18} strokeWidth={2.2} />
            </span>
            <span className={styles.metricLabel}>Overall score</span>
            <strong>92</strong>
            <small>Healthy water profile</small>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricIcon}>
              <ListChecks size={18} strokeWidth={2.2} />
            </span>
            <span className={styles.metricLabel}>Parameters checked</span>
            <strong>08</strong>
            <small>Across recent report</small>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricIcon}>
              <CircleAlert size={18} strokeWidth={2.2} />
            </span>
            <span className={styles.metricLabel}>Attention items</span>
            <strong>01</strong>
            <small>Minor follow-up</small>
          </article>
        </div>

        <div className={styles.mainGrid}>
          <article className={styles.reportCard}>
            <div className={styles.reportHeader}>
              <div>
                <p className={styles.eyebrow}>RECENT REPORT</p>
                <h2>Well water sample</h2>
              </div>
              <span className={styles.badge}>
                <CheckCircle2 size={13} strokeWidth={2.4} />
                Healthy
              </span>
            </div>

            <div className={styles.sceneWrap}>
              <WaterQualityScene parameters={recentParameters} viewMode="normal" />
            </div>

            <div className={styles.chartWrap}>
              <div className={styles.chartLegend}>
                <span className={styles.legendItem}>
                  <i className={`${styles.legendDot} ${styles.legendDotUser}`} />
                  Your report
                </span>
                <span className={styles.legendItem}>
                  <i className={`${styles.legendDot} ${styles.legendDotSafe}`} />
                  Safe limit
                </span>
              </div>
              <div className={styles.compareGrid}>
                {recentParameters.map((p) => {
                  const safe = p.reference_maximum ?? p.permissible_maximum ?? 1;
                  const pct = Math.max(4, Math.min(100, (p.value / safe) * 100));
                  const state =
                    p.status === "outside_range"
                      ? "bad"
                      : p.status === "attention"
                        ? "warn"
                        : "good";
                  return (
                    <div className={styles.compareRow} key={p.parameter}>
                      <span className={styles.compareLabel}>{p.parameter}</span>
                      <div className={styles.compareTrack}>
                        <span
                          className={`${styles.compareFill} ${styles[`fill_${state}`]}`}
                          style={{ width: `${pct}%` }}
                        />
                        <span
                          className={styles.compareSafe}
                          style={{ left: "100%" }}
                          title={`Safe limit: ${safe}`}
                        />
                      </div>
                      <span className={styles.compareValue}>
                        {p.value}
                        <small>{p.unit}</small>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className={styles.chartCaption}>
                Each bar shows your measured value as a share of the safe drinking
                limit — shorter is safer.
              </p>
            </div>
          </article>

          <aside className={styles.sideColumn}>
            <article className={styles.summaryCard}>
              <p className={styles.eyebrow}>INSIGHTS</p>
              <h3>Latest assessment</h3>
              <ul>
                <li>pH is stable and within the acceptable range.</li>
                <li>TDS remains comfortably below the action threshold.</li>
                <li>Iron is slightly elevated and worth a quick filter check.</li>
              </ul>
              <Link className={styles.primaryAction} href="/upload">
                Analyze another report
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
            </article>
          </aside>
        </div>

        {authError && <p className={styles.error}>Could not verify your sign-in status: {authError}</p>}
      </section>
    </AppShell>
  );
}
