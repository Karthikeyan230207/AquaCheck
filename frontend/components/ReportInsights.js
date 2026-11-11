"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Baby,
  BookOpen,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  CircleX,
  Droplets,
  Eye,
  Filter,
  Gauge,
  Languages,
  Layers,
  Microscope,
  OctagonAlert,
  Printer,
  ShieldCheck,
  Smile,
  Sparkles,
  Sprout,
  TriangleAlert,
  Waves,
  Wrench,
  CheckCircle2,
  X,
  RotateCcw,
} from "lucide-react";
import WaterQualityScene from "./WaterQualityScene";
import styles from "./ReportInsights.module.css";

const LANGUAGES = [
  { code: "en", locale: "en-US", label: "English" },
  { code: "ta", locale: "ta-IN", label: "தமிழ்" },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MANUAL_PARAMETERS = [
  { parameter: "pH", unit: "", step: "any" },
  { parameter: "TDS", unit: "mg/L", step: "any" },
  { parameter: "Turbidity", unit: "NTU", step: "any" },
  { parameter: "Total Hardness", unit: "mg/L", step: "any" },
  { parameter: "Chloride", unit: "mg/L", step: "any" },
  { parameter: "Fluoride", unit: "mg/L", step: "any" },
  { parameter: "Nitrate", unit: "mg/L", step: "any" },
  { parameter: "Iron", unit: "mg/L", step: "any" },
];

// Everyday explanations for water-test measurements.
const PARAMETER_DETAILS = {
  pH: {
    title: "Water's acid balance",
    simple: "Shows how acidic or alkaline (not acidic) the water is. Very high or low readings can affect taste and pipes.",
    actionBad: "This result is outside the suggested range. Ask a water-testing lab what it means.",
    icon: Gauge,
  },
  TDS: {
    title: "Dissolved salts and minerals",
    simple: "Counts salts and minerals mixed into the water. High amounts can change its taste.",
    actionBad: "Ask a water-testing lab whether a home water filter would help.",
    icon: Layers,
  },
  Turbidity: {
    title: "Cloudiness",
    simple: "Tells how cloudy the water is. Cloudiness often comes from tiny particles.",
    actionBad: "If the water looks cloudy, have it checked before drinking it.",
    icon: Eye,
  },
  "Total Hardness": {
    title: "Minerals that cause scale",
    simple: "Measures minerals that can leave white marks on taps, dishes, and kettles.",
    actionBad: "A water softener may help reduce marks on taps and appliances.",
    icon: Waves,
  },
  Chloride: {
    title: "Salt in the water",
    simple: "Measures salt in the water. High amounts can make it taste salty.",
    actionBad: "Ask a water-testing lab to check why the salt level is high.",
    icon: Droplets,
  },
  Fluoride: {
    title: "Fluoride for healthy teeth",
    simple: "A small amount helps protect teeth. Too much over time can leave marks on teeth.",
    actionBad: "Ask a dentist or water-testing lab what this result means, especially for children.",
    icon: Smile,
  },
  Nitrate: {
    title: "Nitrate from soil and fertilizer",
    simple: "Can get into water from fertilizer or waste. High amounts can be harmful, especially to babies.",
    actionBad: "Do not use this water for baby formula. Ask a water-testing lab what to do.",
    icon: Sprout,
  },
  Iron: {
    title: "Iron that can leave rust marks",
    simple: "Can give water a metal taste and leave orange-brown marks on sinks and clothes.",
    actionBad: "Check for rusty pipes and ask a water-testing lab what to do.",
    icon: Wrench,
  },
};

const PARTICLE_LEGEND = [
  ["#bcecff", "TDS (Dissolved Solids)", "TDS"],
  ["#82e8c1", "Turbidity (Clarity)", "Turbidity"],
  ["#9bd5f2", "Total Hardness (Minerals)", "Total Hardness"],
  ["#c5e7ff", "Chloride (Salinity)", "Chloride"],
  ["#9ce4ff", "Fluoride (Dental Health)", "Fluoride"],
  ["#c5a9ff", "Nitrate (Runoff)", "Nitrate"],
  ["#ffc080", "Iron (Metallic Rust)", "Iron"],
];

function formatRange(min, max, unit) {
  if (min == null && max == null) return "None specified";
  if (min != null && max != null) {
    return `${min} – ${max} ${unit}`.trim();
  }
  if (min != null) return `≥ ${min} ${unit}`.trim();
  return `≤ ${max} ${unit}`.trim();
}

export default function ReportInsights({
  analysis,
  reportMetadata = null,
  fileName = "Water_Quality_Report",
}) {
  const [viewMode, setViewMode] = useState("sample"); // 'sample' vs 'normal'
  const [selectedParam, setSelectedParam] = useState(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explanationError, setExplanationError] = useState("");
  const [loading, setLoading] = useState(false);
  const explanationRequestId = useRef(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [manualAnalysis, setManualAnalysis] = useState(null);
  const sceneStickyRef = useRef(null);

  const currentAnalysis = manualAnalysis ?? analysis;
  const hasAnalysis = Boolean(currentAnalysis?.parameters?.length);

  const handleParameterSelect = useCallback((paramName) => {
    setSelectedParam((previous) => (previous === paramName ? null : paramName));
  }, []);

  // Executive Safety Verdict
  const verdict = useMemo(() => {
    if (!currentAnalysis?.parameters || currentAnalysis.parameters.length === 0) {
      return {
        badge: "NO MEASUREMENTS",
        headline: "No numeric results to show",
        subline:
          "The report did not include any readable measurement values. Try a clearer image or enter the values manually.",
        icon: CircleHelp,
      };
    }

    const hasMeasuredValues = currentAnalysis.parameters.some((p) => p.status !== "unavailable");
    if (!hasMeasuredValues) {
      return {
        badge: "NO MEASUREMENTS",
        headline: "No numeric results to show",
        subline:
          "The report did not include any readable measurement values. Try a clearer image or enter the values manually.",
        icon: CircleHelp,
      };
    }

    const hasDanger = currentAnalysis.parameters.some((p) => p.status === "outside_range");
    const hasWarning = currentAnalysis.parameters.some((p) => p.status === "attention");

    if (hasDanger) {
      return {
        badge: "OUTSIDE APPLIED RANGE",
        headline: "Some Measurements Need Review",
        subline:
          "One or more measured values fall outside the reference ranges used in this screening. Review the parameter details and consult a qualified local laboratory about next steps.",
        icon: OctagonAlert,
      };
    }

    if (hasWarning) {
      return {
        badge: "REVIEW SUGGESTED",
        headline: "Some Measurements Need Attention",
        subline:
          "One or more measured values are outside the preferred ranges used in this screening. Review the parameter details and any recommendations.",
        icon: TriangleAlert,
      };
    }

    return {
      badge: "NO FLAGGED RESULTS",
      headline: "Evaluated Measurements Are Within Range",
      subline:
        "All measured parameters with reference ranges in this screening are within range. Unmeasured contaminants are not assessed.",
      icon: ShieldCheck,
    };
  }, [currentAnalysis]);

  // Statistics Summary
  const stats = useMemo(() => {
    if (!currentAnalysis?.parameters) return { assessed: 0, safe: 0, issues: 0 };
    const assessed = currentAnalysis.parameters.filter((p) => p.status !== "unavailable").length;
    const safe = currentAnalysis.parameters.filter((p) => p.status === "within_range").length;
    const issues = currentAnalysis.parameters.filter(
      (p) => p.status === "outside_range" || p.status === "attention",
    ).length;
    return { assessed, safe, issues };
  }, [currentAnalysis]);

  // Action Remediation Checklist
  const actionChecklist = useMemo(() => {
    const actions = [];
    if (!currentAnalysis?.parameters) return actions;

    const nit = currentAnalysis.parameters.find(
      (p) => p.parameter === "Nitrate" && ["outside_range", "attention"].includes(p.status),
    );
    if (nit) {
      actions.push({
        priority: "CRITICAL",
        category: "Health Hazard",
        text: "Do not use this water for baby formula. Ask a certified water professional about safe treatment.",
        icon: Baby,
      });
    }

    const turb = currentAnalysis.parameters.find(
      (p) => p.parameter === "Turbidity" && ["outside_range", "attention"].includes(p.status),
    );
    if (turb) {
      actions.push({
        priority: "HIGH",
        category: "Sediment Filtration",
        text: "The water may be cloudy. Use a sediment filter and have the water checked before drinking.",
        icon: Filter,
      });
    }

    const tds = currentAnalysis.parameters.find(
      (p) => p.parameter === "TDS" && ["outside_range", "attention"].includes(p.status),
    );
    if (tds) {
      actions.push({
        priority: "MEDIUM",
        category: "Mineral Reduction",
        text: "A reverse-osmosis (RO) filter can reduce dissolved salts and minerals.",
        icon: Droplets,
      });
    }

    const hard = currentAnalysis.parameters.find(
      (p) => p.parameter === "Total Hardness" && ["outside_range", "attention"].includes(p.status),
    );
    if (hard) {
      actions.push({
        priority: "MEDIUM",
        category: "Scale Mitigation",
        text: "A water softener can reduce scale on taps and appliances.",
        icon: Sparkles,
      });
    }

    const fe = currentAnalysis.parameters.find(
      (p) => p.parameter === "Iron" && ["outside_range", "attention"].includes(p.status),
    );
    if (fe) {
      actions.push({
        priority: "MEDIUM",
        category: "Corrosion & Taste",
        text: "Check for rusty pipes. An iron filter can help reduce stains and metallic taste.",
        icon: Wrench,
      });
    }

    const ph = currentAnalysis.parameters.find(
      (p) => p.parameter === "pH" && ["outside_range", "attention"].includes(p.status),
    );
    if (ph) {
      actions.push({
        priority: "LOW",
        category: "pH Stabilization",
        text: "Ask a water professional whether pH treatment is needed.",
        icon: Gauge,
      });
    }

    if (actions.length === 0 && currentAnalysis.parameters.some((p) => p.status !== "unavailable")) {
      actions.push({
        priority: "ROUTINE",
        category: "Standard Monitoring",
        text: "No issues were flagged in the measured values. Retest if the water’s taste, smell, or appearance changes.",
        icon: CheckCircle2,
      });
    } else if (actions.length === 0) {
      actions.push({
        priority: "REVIEW",
        category: "No Readings Found",
        text: "No numeric measurements were recognized. Try uploading a clearer report or enter your results manually.",
        icon: CircleHelp,
      });
    }

    return actions;
  }, [currentAnalysis]);

  async function requestExplanation(langOverride) {
    const lang = langOverride ?? selectedLang;
    const requestId = ++explanationRequestId.current;
    setLoading(true);
    setExplanationError("");

    const sanitizedAnalysis = {
      parameters: (currentAnalysis?.parameters ?? []).map((p) => ({
        parameter: p.parameter,
        value: p.value ?? null,
        unit: p.unit ?? "",
        status: p.status,
        reference_minimum: p.reference_minimum ?? null,
        reference_maximum: p.reference_maximum ?? null,
        permissible_minimum: p.permissible_minimum ?? null,
        permissible_maximum: p.permissible_maximum ?? null,
      })),
      overall_score: currentAnalysis?.overall_score ?? null,
      score_method: currentAnalysis?.score_method ?? "unspecified",
      recommendations: currentAnalysis?.recommendations ?? [],
    };

    try {
      let payload;
      let response;

      try {
        response = await fetch(`${API_BASE_URL}/api/ai/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis: sanitizedAnalysis, language: lang }),
        });
        payload = await response.json();
      } catch (networkError) {
        throw new Error("Network error — could not reach the server. Is the backend running?");
      }

      if (!response.ok) {
        let detailMsg;
        if (typeof payload.detail === "string") {
          detailMsg = payload.detail;
        } else if (Array.isArray(payload.detail)) {
          detailMsg = payload.detail
            .map((e) => `${e.loc?.slice(-1)?.[0] ?? "field"}: ${e.msg}`)
            .join("; ");
        } else if (payload.detail) {
          detailMsg = JSON.stringify(payload.detail);
        } else {
          detailMsg = `Request failed (${response.status})`;
        }
        throw new Error(detailMsg);
      }

      if (typeof payload.explanation !== "string" || !payload.explanation) {
        throw new Error("The server returned an empty explanation.");
      }

      if (requestId === explanationRequestId.current) {
        setExplanation(payload.explanation);
      }
    } catch (requestError) {
      if (requestId === explanationRequestId.current) {
        setExplanationError(
          requestError instanceof Error
            ? requestError.message
            : "Could not generate an explanation.",
        );
      }
    } finally {
      if (requestId === explanationRequestId.current) {
        setLoading(false);
      }
    }
  }

  function handleLangChange(code) {
    setSelectedLang(code);
    if (explanation || loading) {
      setExplanation("");
      requestExplanation(code);
    }
  }

  function handleDownloadReport() {
    setIsDownloading(true);
    try {
      window.print();
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  }

  if (!hasAnalysis) {
    return <ManualParameterForm onAnalysis={setManualAnalysis} />;
  }

  return (
    <div className={styles.reportSplitLayout}>
      
      {/* ============================================================
          LEFT COLUMN: Scrollable Laboratory Analysis & Findings
         ============================================================ */}
      <div className={styles.scrollableContent}>
        
        {/* 1. EXECUTIVE ASSESSMENT & HEALTH SCORE CARD */}
        <section
          aria-label="Executive water quality evaluation"
          className={styles.executiveCard}
        >
          <div className={styles.executiveHeader}>
            <div className={styles.executiveIdentity}>
              <div className={styles.executiveIconWrap}>
                <verdict.icon size={28} strokeWidth={2.2} />
              </div>
              <div>
                <div className={styles.badgeRow}>
                  <span
                    className={styles.trafficBadge}
                  >
                    {verdict.badge}
                  </span>
                  <span className={styles.scopeMeta}>AquaCheck screening ranges</span>
                </div>
                <h2 className={styles.verdictTitle}>{verdict.headline}</h2>
                <p className={styles.verdictSub}>{verdict.subline}</p>
              </div>
            </div>

            <div className={styles.executiveActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleDownloadReport}
                disabled={isDownloading}
                title="Save or print this laboratory report as PDF"
              >
                <Printer size={15} strokeWidth={2.2} aria-hidden="true" />
                <span>{isDownloading ? "Preparing PDF…" : "Export / Print"}</span>
              </button>
            </div>
          </div>

          {/* Executive KPI Bar */}
          <div className={styles.executiveKpiGrid}>
            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Screening score</span>
              <div className={styles.kpiValueRow}>
                <strong className={styles.kpiValue}>
                  {currentAnalysis.overall_score != null ? currentAnalysis.overall_score : "—"}
                </strong>
                <span className={styles.kpiSub}>/ 100</span>
              </div>
              <div className={styles.kpiBarTrack}>
                <div
                  className={styles.kpiBarFill}
                  style={{
                    width: `${Math.min(100, Math.max(0, currentAnalysis.overall_score ?? 0))}%`,
                  }}
                />
              </div>
            </div>

            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Readings analyzed</span>
              <div className={styles.kpiValueRow}>
                <strong className={styles.kpiValue}>{stats.assessed}</strong>
                <span className={styles.kpiSub}>values</span>
              </div>
              <p className={styles.kpiText}>Numeric results evaluated</p>
            </div>

            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Within applied range</span>
              <div className={styles.kpiValueRow}>
                <strong className={styles.kpiValue}>
                  {stats.safe}
                </strong>
                <span className={styles.kpiSub}>/ {stats.assessed} within range</span>
              </div>
              <p className={styles.kpiText}>Of the measurements evaluated</p>
            </div>

            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Needs review</span>
              <div className={styles.kpiValueRow}>
                <strong className={styles.kpiValue}>
                  {stats.issues}
                </strong>
                <span className={styles.kpiSub}>flagged</span>
              </div>
              <p className={styles.kpiText}>
                {stats.issues === 0 ? "Zero interventions needed" : "Filtration or review advised"}
              </p>
            </div>
          </div>
          <p className={styles.scoreContext}>
            The score summarizes only the measurements evaluated against the ranges shown; it does not guarantee drinking-water safety.
          </p>
        </section>

        {/* 2. REMEDIATION & ACTION CHECKLIST */}
        <section aria-label="Remediation action steps" className={styles.actionPlanCard}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.pillTag}>NEXT STEPS</span>
              <h3 className={styles.actionPlanTitle}>What to do next</h3>
              <p className={styles.actionPlanSubtitle}>
                Simple actions for any readings that need attention.
              </p>
            </div>
          </div>
          <div className={styles.actionGrid}>
            {actionChecklist.map((act, i) => (
              <div
                key={i}
                className={`${styles.actionItem} ${styles[`actionItem_${act.priority.toLowerCase()}`] || ""}`}
              >
                <span className={styles.actionIcon}>
                  <act.icon size={20} strokeWidth={2.1} />
                </span>
                <div className={styles.actionItemContent}>
                  <div className={styles.actionBadgeRow}>
                    <span
                      className={`${styles.priorityBadge} ${styles[act.priority.toLowerCase()] || ""}`}
                    >
                      {act.priority}
                    </span>
                    {act.category && <span className={styles.actionCategory}>{act.category}</span>}
                  </div>
                  <p className={styles.actionDesc}>{act.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. PLAIN-LANGUAGE PARAMETER EXPLANATIONS */}
        <section aria-label="Tested water parameters" className={styles.diagnosticsSection}>
          <div className={styles.sectionHeadingWrap}>
            <div>
              <span className={styles.pillTag}>YOUR RESULTS</span>
              <h3 className={styles.friendlyTitle}>What each result means</h3>
              <p className={styles.friendlySubtitle}>
                Each result explains what the test measures and what the number may mean.
              </p>
            </div>
          </div>

          <div className={styles.friendlyGrid}>
            {currentAnalysis.parameters.map((param) => {
              const info = PARAMETER_DETAILS[param.parameter] || {
                title: param.parameter,
                simple: "This test checks for this substance or quality in the water.",
                actionBad: "Ask a water-testing lab what this result means.",
                icon: Droplets,
              };
              const isGood = param.status === "within_range";
              const isAttention = param.status === "attention";
              const isBad = param.status === "outside_range";
              const isSelected = selectedParam === param.parameter;
              const statusLabel = isGood
                ? "Within range"
                : isBad
                  ? "Outside range"
                  : isAttention
                    ? "Review"
                    : "Not measured";

              return (
                <div
                  key={param.parameter}
                  className={`${styles.paramCard} ${isSelected ? styles.paramCardActive : ""}`}
                >
                  {/* Always-visible header */}
                  <div className={styles.paramHeader}>
                    <div className={styles.paramHeaderTitle}>
                      <span className={styles.paramIcon}>
                        <info.icon size={20} strokeWidth={2.2} />
                      </span>
                      <div>
                        <h4 className={styles.paramName}>{info.title}</h4>
                        <span className={styles.paramTechnicalName}>{param.parameter}</span>
                      </div>
                    </div>
                    <span
                      className={`${styles.statusChip} ${styles.chipNeutral}`}
                    >
                      {isBad ? (
                        <CircleX size={13} strokeWidth={2.4} />
                      ) : isAttention ? (
                        <TriangleAlert size={13} strokeWidth={2.4} />
                      ) : isGood ? (
                        <CircleCheck size={13} strokeWidth={2.4} />
                      ) : (
                        <CircleHelp size={13} strokeWidth={2.4} />
                      )}
                      {statusLabel}
                    </span>
                  </div>

                  {/* Always-visible value display */}
                  <div className={styles.paramValueBlock}>
                    <span className={styles.paramValueLabel}>Measured</span>
                    <strong className={styles.paramValueBig}>
                      {param.value != null ? param.value : "—"}
                    </strong>
                    <span className={styles.paramValueUnit}>{param.unit || ""}</span>
                  </div>

                  {/* Description & advice */}
                  <p className={styles.paramDescription}>{info.simple}</p>
                  {isBad || isAttention || param.status === "unavailable" ? (
                    <div className={styles.adviceBox}>
                      <strong className={styles.adviceLabel}>
                        {param.status === "unavailable" ? "Note:" : "What to do:"}
                      </strong>{" "}
                      <span>
                        {param.status === "unavailable"
                          ? "No numeric result was found, so this parameter was not assessed."
                          : info.actionBad}
                      </span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className={`${styles.btnChipSm} ${isSelected ? styles.btnChipSmActive : ""}`}
                    onClick={() => handleParameterSelect(param.parameter)}
                    title="Highlight this parameter in the 3D water simulation"
                  >
                    <Microscope size={13} strokeWidth={2.2} />
                    <span>{isSelected ? "Remove 3D highlight" : "Highlight in 3D"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. LABORATORY REGULATORY BENCHMARK TABLE (IS 10500 / WHO) */}
        <section aria-label="Laboratory compliance table" className={styles.technicalAccordion}>
          <button
            type="button"
            className={styles.accordionToggle}
            onClick={() => setShowTechnicalDetails((v) => !v)}
            aria-expanded={showTechnicalDetails}
          >
            <span>
              <Microscope size={16} strokeWidth={2.2} />{" "}
              {showTechnicalDetails
                ? "Hide Complete Laboratory Regulatory Benchmark Table"
                : "View Complete Laboratory Data & Standards (IS 10500 / WHO)"}
            </span>
            <span className={styles.arrowIcon} style={{ display: "inline-flex" }}>
              <ChevronDown
                size={17}
                strokeWidth={2.4}
                style={{
                  transform: showTechnicalDetails ? "rotate(180deg)" : "none",
                  transition: "transform 200ms ease",
                }}
              />
            </span>
          </button>

          {showTechnicalDetails && (
            <div className={styles.tableWrap}>
              <table className={styles.metricsTable}>
                <thead>
                  <tr>
                    <th>Analyte Parameter</th>
                    <th>Measured Value</th>
                    <th>Acceptable Standard</th>
                    <th>Permissible Limit</th>
                    <th>Compliance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAnalysis.parameters.map((param) => (
                    <tr key={param.parameter}>
                      <td>
                        <strong>{param.parameter}</strong>
                      </td>
                      <td>
                        {param.value != null ? `${param.value} ${param.unit}` : "Unavailable"}
                      </td>
                      <td>
                        {formatRange(
                          param.reference_minimum,
                          param.reference_maximum,
                          param.unit,
                        )}
                      </td>
                      <td>
                        {formatRange(
                          param.permissible_minimum,
                          param.permissible_maximum,
                          param.unit,
                        )}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[param.status] || ""}`}>
                          {param.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 5. AI WATER QUALITY EXECUTIVE SUMMARY (TEXT & MULTI-LANGUAGE) */}
        <section aria-label="AI summary and language translation" className={styles.explanation}>
          <div className={styles.aiStoryHeader}>
            <div>
              <span className={styles.pillTag}>WATER SUMMARY</span>
              <h4 className={styles.actionPlanTitle}>Plain-language summary</h4>
              <p className={styles.intro}>
                Get a short explanation of your results in English or Tamil.
              </p>
            </div>
            {/* Language Selector */}
            <div
              className={styles.langSelector}
              role="group"
              aria-label="Select explanation language"
            >
              <span className={styles.langIcon} aria-hidden="true">
                <Languages size={15} strokeWidth={2.2} />
              </span>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`${styles.btnChip} ${
                    selectedLang === lang.code ? styles.btnChipActive : ""
                  }`}
                  onClick={() => handleLangChange(lang.code)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {!explanation && !loading ? (
            <button
              className={styles.btnSecondary}
              disabled={loading}
              onClick={() => requestExplanation()}
              type="button"
            >
              <BookOpen size={16} strokeWidth={2.2} />
              <span>Show summary ({LANGUAGES.find((l) => l.code === selectedLang)?.label ?? "English"})</span>
            </button>
          ) : null}

          {loading ? (
            <div className={styles.loadingRow}>
              <span className={styles.loadingSpinner} aria-hidden="true" />
              <span>Putting your results into simple words…</span>
            </div>
          ) : null}

          {explanation ? (
            <div aria-live="polite" className={styles.explanationText}>
              {explanation
                .split(/\s*\n\n\s*/)
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>
          ) : null}

          {explanationError ? (
            <p aria-live="polite" className={styles.error} role="alert">
              {explanationError}
            </p>
          ) : null}
        </section>

      </div>

      {/* ============================================================
          RIGHT COLUMN: Sticky / Fixed 3D Water Glass & Inspector
         ============================================================ */}
      <details className={styles.visualizationDetails}>
        <summary className={styles.visualizationSummary}>
          <span>
            <Microscope size={17} aria-hidden="true" />
            Explore water particles in 3D
          </span>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
      <aside className={styles.stickyColumn} ref={sceneStickyRef}>
        <div className={styles.stickyCard}>
          {/* Header */}
          <div className={styles.sceneHeader}>
            <div>
              <span className={styles.pillTag}>3D MOLECULAR LAB</span>
              <h3 className={styles.sceneTitle}>Interactive Water Glass</h3>
            </div>
            <div className={styles.modeToggle} role="group" aria-label="Comparison visual mode">
              <button
                type="button"
                className={`${styles.btnChip} ${
                  viewMode === "sample" ? styles.btnChipActive : ""
                }`}
                onClick={() => setViewMode("sample")}
              >
                Sample
              </button>
              <button
                type="button"
                className={`${styles.btnChip} ${
                  viewMode === "normal" ? styles.btnChipActive : ""
                }`}
                onClick={() => setViewMode("normal")}
              >
                Pure
              </button>
            </div>
          </div>

          {/* Interactive 3D Water Glass Canvas */}
          <div className={styles.canvasFrame}>
            <WaterQualityScene
              parameters={currentAnalysis.parameters}
              viewMode={viewMode}
              selectedParameterName={selectedParam}
              onSelectParameter={handleParameterSelect}
            />
          </div>

          {/* Highlighted Parameter Banner */}
          {selectedParam ? (
            <div className={styles.activeIsolateBanner}>
              <div className={styles.isolateInfo}>
                <span className={styles.isolateDot} />
                <span>Isolating: <strong>{selectedParam}</strong></span>
              </div>
              <button
                type="button"
                className={styles.clearSelectionBtn}
                onClick={() => setSelectedParam(null)}
                title="Clear isolation"
              >
                <X size={13} />
                <span>Show All</span>
              </button>
            </div>
          ) : (
            <div className={styles.idleHintBanner}>
              <span>All particulate matter rendered</span>
            </div>
          )}

          {/* Clickable Legend */}
          <div className={styles.legendWrap}>
            <div className={styles.legendHeaderRow}>
              <span className={styles.legendTitle}>Click Analyte to Isolate:</span>
              {selectedParam && (
                <button
                  type="button"
                  className={styles.resetLegendBtn}
                  onClick={() => setSelectedParam(null)}
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>
            <ul aria-label="Particle color legend" className={styles.legend}>
              {PARTICLE_LEGEND.map(([color, label, key]) => (
                <li key={key}>
                  <button
                    type="button"
                    className={`${styles.legendItemButton} ${
                      selectedParam === key ? styles.legendItemActive : ""
                    }`}
                    onClick={() => handleParameterSelect(key)}
                  >
                    <span aria-hidden="true" style={{ "--particle-color": color }} />
                    <span>{label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.sceneTip}>
            <span className={styles.tipBadge}>360° Rotatable</span>
            <p>
              Click & drag with your mouse or finger to inspect particulate distribution from any angle.
            </p>
          </div>
        </div>
      </aside>
      </details>

    </div>
  );
}

function ManualParameterForm({ onAnalysis }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(MANUAL_PARAMETERS.map(({ parameter }) => [parameter, ""])),
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const parameters = MANUAL_PARAMETERS.map(({ parameter, unit }) => ({
        parameter,
        value: Number(values[parameter]),
        unit,
      }));
      const response = await fetch(`${API_BASE_URL}/api/analysis/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters }),
      });
      const payload = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(payload.detail)
          ? payload.detail.map((issue) => issue.msg).join("; ")
          : payload.detail;
        throw new Error(detail || `Analysis failed (${response.status}).`);
      }
      onAnalysis(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not analyze the entered measurements.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section aria-label="Enter water quality measurements" className={styles.manualEntry}>
      <div>
        <span className={styles.pillTag}>MANUAL WATER ANALYSIS</span>
        <h2 className={styles.actionPlanTitle}>Enter Standard Water Quality Measurements</h2>
        <p className={styles.intro}>
          Input laboratory test figures below to generate an instant potability assessment, 3D molecular simulation, and filtration recommendations.
        </p>
      </div>
      <form className={styles.manualForm} onSubmit={handleSubmit}>
        {MANUAL_PARAMETERS.map(({ parameter, unit, step }) => (
          <label
            className={styles.manualField}
            htmlFor={`manual-${parameter.toLowerCase().replace(/\s+/g, "-")}`}
            key={parameter}
          >
            <span>
              {parameter}
              {unit ? ` (${unit})` : ""}
            </span>
            <input
              id={`manual-${parameter.toLowerCase().replace(/\s+/g, "-")}`}
              name={parameter}
              onChange={(event) =>
                setValues((previous) => ({ ...previous, [parameter]: event.target.value }))
              }
              required
              step={step}
              type="number"
              value={values[parameter]}
            />
          </label>
        ))}
        <button
          className={styles.btnPrimary}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Evaluating measurements…" : "Evaluate measurements"}
        </button>
      </form>
      {error ? (
        <p aria-live="polite" className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
