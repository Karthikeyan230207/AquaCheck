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
  RefreshCw,
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

// Professional, human-designed parameter explanations (clinical & practical household implications)
const PARAMETER_DETAILS = {
  pH: {
    category: "Chemical Balance",
    title: "pH (Acidity & Alkalinity)",
    simple:
      "Measures whether water is acidic, neutral, or alkaline. Balanced pH (6.5 – 8.5) protects pipes from metallic corrosion and provides a smooth, refreshing taste.",
    impactGood: "Optimal balance — neutral, gentle on plumbing, and refreshing.",
    impactBad:
      "Acidic water can leach metals from copper pipes, while highly alkaline water causes bitter taste and mineral scaling.",
    actionGood: "No chemical neutralization required.",
    actionBad:
      "Install an inline calcite neutralizer filter (for low pH) or specialized pH correction cartridge.",
    icon: Gauge,
  },
  TDS: {
    category: "Dissolved Minerals",
    title: "TDS (Total Dissolved Solids)",
    simple:
      "Total combined concentration of dissolved minerals, salts, and inorganic compounds. Moderate levels (< 500 mg/L) provide healthy minerals, while elevated levels cause a salty or mineral taste.",
    impactGood: "Fresh, crisp taste with wholesome mineral balance.",
    impactBad:
      "High mineral content leaves white chalky deposits on kettles and fixtures, and can cause a heavy mineral taste.",
    actionGood: "Mineral concentration is within the ideal drinking range.",
    actionBad:
      "Install a point-of-use Reverse Osmosis (RO) drinking system to lower dissolved mineral salts.",
    icon: Layers,
  },
  Turbidity: {
    category: "Physical Clarity",
    title: "Turbidity (Clarity & Sediment)",
    simple:
      "The optical haziness caused by suspended microscopic matter such as silt, organic dust, or clay. Clean drinking water must be crystal clear.",
    impactGood: "Crystal clear optical clarity meeting WHO guidelines.",
    impactBad:
      "Cloudiness can shelter microorganisms, reduce the efficacy of UV disinfection, and cause sediment buildup in appliances.",
    actionGood: "Water is optically clear with no suspended silt.",
    actionBad:
      "Install a 5-micron spun polypropylene sediment pre-filter to clarify incoming water.",
    icon: Eye,
  },
  "Total Hardness": {
    category: "Mineral Hardness",
    title: "Total Hardness (Ca & Mg)",
    simple:
      "Concentration of dissolved calcium and magnesium. Hard water creates chalky limescale inside geysers, boilers, and fixtures, reducing appliance efficiency.",
    impactGood: "Moderate hardness — provides dietary minerals without scaling appliances.",
    impactBad:
      "Limescale reduces water heater efficiency and leaves residue on bathroom tiles and glassware.",
    actionGood: "No water softener needed.",
    actionBad:
      "Install an ion-exchange water softening unit to protect heaters, washing machines, and plumbing.",
    icon: Waves,
  },
  Chloride: {
    category: "Inorganic Salts",
    title: "Chloride (Salts)",
    simple:
      "Naturally occurring salt compound present in groundwater and coastal aquifers. High chloride gives water a briny taste and accelerates metal corrosion.",
    impactGood: "Standard level with no briny or brackish flavor.",
    impactBad:
      "Salty aftertaste and potential pitting corrosion in stainless steel fixtures and hot water tanks.",
    actionGood: "Within normal taste and corrosion thresholds.",
    actionBad:
      "Point-of-use Reverse Osmosis (RO) filtration is recommended to eliminate excess salinity.",
    icon: Droplets,
  },
  Fluoride: {
    category: "Trace Minerals",
    title: "Fluoride (Dental Enamel)",
    simple:
      "A trace mineral that protects tooth enamel at moderate levels (~0.7 mg/L). Excessive fluoride can cause dental fluorosis or mottling in developing teeth.",
    impactGood: "Protective concentration safe for all age groups.",
    impactBad:
      "Exceeds recommended guidelines. Chronic exposure in children can lead to tooth staining and dental fluorosis.",
    actionGood: "Within safe and protective dental health guidelines.",
    actionBad:
      "Install activated alumina or high-rejection RO membrane filtration to remove excess fluoride.",
    icon: Smile,
  },
  Nitrate: {
    category: "Chemical Contaminant",
    title: "Nitrate (Agricultural Runoff)",
    simple:
      "Inorganic nitrogen compound from agricultural fertilizers, septic tanks, and livestock waste. High levels reduce oxygen transport in the bloodstream.",
    impactGood: "Clean and safe — free of hazardous agricultural contamination.",
    impactBad:
      "Health Alert: Poses serious oxygen-deprivation risk to infants ('blue baby syndrome') and pregnant women.",
    actionGood: "Safe for baby formula and direct household consumption.",
    actionBad:
      "CRITICAL: Do not use for baby formula or direct drinking until purified via RO or distillation.",
    icon: Sprout,
  },
  Iron: {
    category: "Heavy Metals",
    title: "Iron (Pipe Corrosion & Soil)",
    simple:
      "Secondary mineral leached from natural iron-bearing soils or aging iron plumbing. Excess iron produces a metallic taste and stains fixtures and laundry.",
    impactGood: "Clear water with no metallic odor, taste, or staining.",
    impactBad:
      "Produces reddish-brown stains on sanitaryware and laundry, plus an astringent metallic aftertaste.",
    actionGood: "No iron contamination or pipe leaching detected.",
    actionBad:
      "Install an oxidizing iron/manganese filter or inspect older galvanized supply lines.",
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

function calculateMeter(param) {
  if (param.value == null || typeof param.value !== "number") return null;
  const val = param.value;
  const min = param.reference_minimum ?? 0;
  const max = param.reference_maximum ?? param.permissible_maximum ?? (val * 1.5 || 10);

  const lowerBound = Math.min(min * 0.8, val * 0.8, 0);
  const upperBound = Math.max(max * 1.25, val * 1.15, max + 1);
  const span = upperBound - lowerBound || 1;

  const valuePercent = Math.min(100, Math.max(0, ((val - lowerBound) / span) * 100));
  const safeLeft = Math.min(100, Math.max(0, ((min - lowerBound) / span) * 100));
  const safeWidth = Math.min(100 - safeLeft, Math.max(6, (((max - min) / span) * 100)));

  return {
    valuePercent,
    safeLeft,
    safeWidth,
    minDisplay: param.reference_minimum != null ? param.reference_minimum : "0",
    maxDisplay:
      param.reference_maximum != null
        ? param.reference_maximum
        : param.permissible_maximum ?? "—",
  };
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
        level: "unknown",
        badge: "INCOMPLETE DATASET",
        headline: "More Measurements Needed",
        subline:
          "This report does not contain enough recognized measurements for a complete screening result.",
        color: "#94a3b8",
        bg: "rgba(148, 163, 184, 0.08)",
        icon: CircleHelp,
      };
    }

    const hasDanger = currentAnalysis.parameters.some((p) => p.status === "outside_range");
    const hasWarning = currentAnalysis.parameters.some((p) => p.status === "attention");

    if (hasDanger) {
      return {
        level: "danger",
        badge: "OUTSIDE APPLIED RANGE",
        headline: "Some Measurements Need Review",
        subline:
          "One or more measured values fall outside the reference ranges used in this screening. Review the parameter details and consult a qualified local laboratory about next steps.",
        color: "#f43f5e",
        bg: "rgba(244, 63, 94, 0.08)",
        icon: OctagonAlert,
      };
    }

    if (hasWarning) {
      return {
        level: "warning",
        badge: "REVIEW SUGGESTED",
        headline: "Some Measurements Need Attention",
        subline:
          "One or more measured values are outside the preferred ranges used in this screening. Review the parameter details and any recommendations.",
        color: "#f59e0b",
        bg: "rgba(245, 158, 11, 0.08)",
        icon: TriangleAlert,
      };
    }

    return {
      level: "safe",
      badge: "NO FLAGGED RESULTS",
      headline: "Evaluated Measurements Are Within Range",
      subline:
        "All measured parameters with reference ranges in this screening are within range. Unmeasured contaminants are not assessed.",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.08)",
      icon: ShieldCheck,
    };
  }, [currentAnalysis]);

  // Statistics Summary
  const stats = useMemo(() => {
    if (!currentAnalysis?.parameters) return { total: 0, safe: 0, issues: 0 };
    const total = currentAnalysis.parameters.length;
    const safe = currentAnalysis.parameters.filter((p) => p.status === "within_range").length;
    const issues = total - safe;
    return { total, safe, issues };
  }, [currentAnalysis]);

  // Action Remediation Checklist
  const actionChecklist = useMemo(() => {
    const actions = [];
    if (!currentAnalysis?.parameters) return actions;

    const nit = currentAnalysis.parameters.find(
      (p) => p.parameter === "Nitrate" && p.status !== "within_range",
    );
    if (nit) {
      actions.push({
        priority: "CRITICAL",
        category: "Health Hazard",
        text: "Elevated nitrate detected: Do not use for infant formula or baby food. Install a certified Reverse Osmosis (RO) system or source bottled water.",
        icon: Baby,
      });
    }

    const turb = currentAnalysis.parameters.find(
      (p) => p.parameter === "Turbidity" && p.status !== "within_range",
    );
    if (turb) {
      actions.push({
        priority: "HIGH",
        category: "Sediment Filtration",
        text: "Cloudiness detected: Install a 5-micron sediment pre-filter to clarify incoming water and protect plumbing appliances.",
        icon: Filter,
      });
    }

    const tds = currentAnalysis.parameters.find(
      (p) => p.parameter === "TDS" && p.status !== "within_range",
    );
    if (tds) {
      actions.push({
        priority: "MEDIUM",
        category: "Mineral Reduction",
        text: "High total dissolved solids: Install a kitchen Reverse Osmosis (RO) purification unit to improve palatability and reduce mineral salts.",
        icon: Droplets,
      });
    }

    const hard = currentAnalysis.parameters.find(
      (p) => p.parameter === "Total Hardness" && p.status !== "within_range",
    );
    if (hard) {
      actions.push({
        priority: "MEDIUM",
        category: "Scale Mitigation",
        text: "Hard water minerals: Install an ion-exchange water softener to prevent scale buildup on heating elements and plumbing fixtures.",
        icon: Sparkles,
      });
    }

    const fe = currentAnalysis.parameters.find(
      (p) => p.parameter === "Iron" && p.status !== "within_range",
    );
    if (fe) {
      actions.push({
        priority: "MEDIUM",
        category: "Corrosion & Taste",
        text: "Iron content detected: Install an oxidizing iron filter or inspect galvanized supply lines to eliminate metallic taste and rust stains.",
        icon: Wrench,
      });
    }

    const ph = currentAnalysis.parameters.find(
      (p) => p.parameter === "pH" && p.status !== "within_range",
    );
    if (ph) {
      actions.push({
        priority: "LOW",
        category: "pH Stabilization",
        text: "Imbalanced pH: Consider an inline calcite neutralizing filter to protect metal plumbing against accelerated corrosion or scaling.",
        icon: Gauge,
      });
    }

    if (actions.length === 0) {
      actions.push({
        priority: "ROUTINE",
        category: "Standard Monitoring",
        text: "All tested parameters meet quality benchmarks. Schedule routine annual water testing or re-test if water taste, clarity, or odor changes.",
        icon: CheckCircle2,
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
          style={{
            borderColor: "var(--border-strong)",
            background: `linear-gradient(135deg, ${verdict.bg} 0%, rgba(6, 20, 32, 0.85) 100%)`,
          }}
        >
          <div className={styles.executiveHeader}>
            <div className={styles.executiveIdentity}>
              <div className={styles.executiveIconWrap} style={{ color: verdict.color }}>
                <verdict.icon size={28} strokeWidth={2.2} />
              </div>
              <div>
                <div className={styles.badgeRow}>
                  <span
                    className={styles.trafficBadge}
                    style={{ backgroundColor: verdict.color }}
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
                <strong className={styles.kpiValue} style={{ color: verdict.color }}>
                  {currentAnalysis.overall_score != null ? currentAnalysis.overall_score : "—"}
                </strong>
                <span className={styles.kpiSub}>/ 100</span>
              </div>
              <div className={styles.kpiBarTrack}>
                <div
                  className={styles.kpiBarFill}
                  style={{
                    width: `${Math.min(100, Math.max(0, currentAnalysis.overall_score ?? 0))}%`,
                    backgroundColor: verdict.color,
                  }}
                />
              </div>
            </div>

            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Parameters Analyzed</span>
              <div className={styles.kpiValueRow}>
                <strong className={styles.kpiValue}>{stats.total}</strong>
                <span className={styles.kpiSub}>analytes</span>
              </div>
              <p className={styles.kpiText}>Measurements found in this report</p>
            </div>

            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Within applied range</span>
              <div className={styles.kpiValueRow}>
                <strong className={styles.kpiValue} style={{ color: "var(--success)" }}>
                  {stats.safe}
                </strong>
                <span className={styles.kpiSub}>/ {stats.total} within spec</span>
              </div>
              <p className={styles.kpiText}>Of the measurements evaluated</p>
            </div>

            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Remediation Items</span>
              <div className={styles.kpiValueRow}>
                <strong
                  className={styles.kpiValue}
                  style={{ color: stats.issues > 0 ? "var(--warning)" : "var(--success)" }}
                >
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
              <span className={styles.pillTag}>ENGINEERING REMEDIATION</span>
              <h3 className={styles.actionPlanTitle}>Recommended Action Steps</h3>
              <p className={styles.actionPlanSubtitle}>
                Actionable engineering solutions prioritized by health urgency and home plumbing impact.
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

        {/* 3. PARAMETER DIAGNOSTICS & BENCHMARK RANGE METERS */}
        <section aria-label="Tested water parameters" className={styles.diagnosticsSection}>
          <div className={styles.sectionHeadingWrap}>
            <div>
              <span className={styles.pillTag}>ANALYTE METRICS</span>
              <h3 className={styles.friendlyTitle}>Water Composition & Clinical Significance</h3>
              <p className={styles.friendlySubtitle}>
                Tested laboratory measurements compared against safe drinking standards, with practical home implications.
              </p>
            </div>
          </div>

          <div className={styles.friendlyGrid}>
            {currentAnalysis.parameters.map((param) => {
              const info = PARAMETER_DETAILS[param.parameter] || {
                category: "General Analyte",
                title: param.parameter,
                simple: "A standard physical or chemical water test measurement.",
                impactGood: "Reading is within acceptable limits.",
                impactBad: "Parameter deviates from the recommended baseline.",
                actionGood: "No intervention needed.",
                actionBad: "Consider routine filtration.",
                icon: Droplets,
              };
              const isGood = param.status === "within_range";
              const isAttention = param.status === "attention";
              const isBad = param.status === "outside_range";
              const meter = calculateMeter(param);
              const isSelected = selectedParam === param.parameter;

              return (
                <div
                  key={param.parameter}
                  className={`${styles.paramCard} ${
                    isBad
                      ? styles.paramCardBad
                      : isAttention
                      ? styles.paramCardWarn
                      : styles.paramCardGood
                  } ${isSelected ? styles.paramCardActive : ""}`}
                  onClick={() => handleParameterSelect(param.parameter)}
                >
                  {/* Header: Category & Status */}
                  <div className={styles.paramCardTop}>
                    <div className={styles.paramHeaderTitle}>
                      <span className={styles.paramIcon}>
                        <info.icon size={20} strokeWidth={2.2} />
                      </span>
                      <div>
                        <span className={styles.categoryBadge}>{info.category}</span>
                        <h4 className={styles.paramName}>{info.title}</h4>
                      </div>
                    </div>
                    <span
                      className={`${styles.statusChip} ${
                        isBad ? styles.chipRed : isAttention ? styles.chipYellow : styles.chipGreen
                      }`}
                    >
                      {isBad ? (
                        <CircleX size={12} strokeWidth={2.4} />
                      ) : isAttention ? (
                        <TriangleAlert size={12} strokeWidth={2.4} />
                      ) : (
                        <CircleCheck size={12} strokeWidth={2.4} />
                      )}
                      {isBad ? "Action Required" : isAttention ? "Attention" : "Within Spec"}
                    </span>
                  </div>

                  {/* Plain-Language Clinical Significance */}
                  <p className={styles.paramDescription}>{info.simple}</p>

                  {/* Visual Benchmark Range Meter */}
                  {meter && (
                    <div className={styles.meterContainer}>
                      <div className={styles.meterLabels}>
                        <span>Target: {meter.minDisplay} – {meter.maxDisplay} {param.unit}</span>
                        <span className={styles.meterReadingText}>
                          Reading: <strong>{param.value} {param.unit}</strong>
                        </span>
                      </div>
                      <div className={styles.meterTrack}>
                        <div
                          className={styles.meterSafeZone}
                          style={{
                            left: `${meter.safeLeft}%`,
                            width: `${meter.safeWidth}%`,
                          }}
                        />
                        <div
                          className={styles.meterMarker}
                          style={{
                            left: `${meter.valuePercent}%`,
                            backgroundColor: isBad
                              ? "var(--danger)"
                              : isAttention
                              ? "var(--warning)"
                              : "var(--success)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Practical Advice Banner */}
                  <div
                    className={`${styles.adviceBox} ${
                      isBad
                        ? styles.adviceBoxBad
                        : isAttention
                        ? styles.adviceBoxWarn
                        : styles.adviceBoxGood
                    }`}
                  >
                    <strong className={styles.adviceLabel}>Recommendation:</strong>{" "}
                    <span>{isGood ? info.actionGood : info.actionBad}</span>
                  </div>

                  {/* Card Footer: Button to highlight in 3D */}
                  <div className={styles.paramFooter}>
                    <div className={styles.paramFooterData}>
                      <span>Tested Value:</span>
                      <strong>
                        {param.value != null ? `${param.value} ${param.unit}` : "Not detected"}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className={`${styles.btnChipSm} ${isSelected ? styles.btnChipSmActive : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleParameterSelect(param.parameter);
                      }}
                      title="Isolate particle in the 3D water simulation"
                    >
                      <Microscope size={13} strokeWidth={2.2} />
                      <span>{isSelected ? "Isolating in 3D" : "View in 3D Glass"}</span>
                    </button>
                  </div>
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
              <span className={styles.pillTag}>INTELLIGENT DIAGNOSTICS</span>
              <h4 className={styles.actionPlanTitle}>AI Water Quality Executive Summary</h4>
              <p className={styles.intro}>
                Synthesized natural language summary tailored for homeowners, facility managers, and families. Choose your preferred language below.
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
              className={styles.btnPrimary}
              disabled={loading}
              onClick={() => requestExplanation()}
              type="button"
            >
              <BookOpen size={16} strokeWidth={2.2} />
              <span>Generate Summary ({LANGUAGES.find((l) => l.code === selectedLang)?.label ?? "English"})</span>
            </button>
          ) : null}

          {loading ? (
            <div className={styles.loadingRow}>
              <span className={styles.loadingSpinner} aria-hidden="true" />
              <span>Analyzing laboratory figures and synthesizing summary…</span>
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
              <div className={styles.retryRow}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => {
                    setExplanation("");
                    requestExplanation();
                  }}
                  type="button"
                >
                  <RefreshCw size={15} strokeWidth={2.2} />
                  <span>Regenerate Summary</span>
                </button>
              </div>
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
