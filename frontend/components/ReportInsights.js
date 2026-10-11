"use client";

import { useMemo, useRef, useState } from "react";
import WaterQualityScene from "./WaterQualityScene";
import styles from "./ReportInsights.module.css";

const LANGUAGES = [
  { code: "en", label: "🇬🇧 English" },
  { code: "hi", label: "🇮🇳 हिंदी" },
  { code: "ta", label: "🇮🇳 தமிழ்" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "fr", label: "🇫🇷 Français" },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Ultra-clear kid/family explanations (analogies anyone can understand)
const TODDLER_EXPLANATIONS = {
  pH: {
    title: "Lemon vs. Soap Balance",
    simple: "Tells us if the water is sour like a lemon or slippery like soap. Good water should be just right in the middle (like sweet rain) so it doesn't hurt your tummy or bite the pipes.",
    actionGood: "Perfect balance! Smooth and gentle.",
    actionBad: "Too sour or too bitter. Needs a simple filter to balance it.",
    icon: "🍋",
  },
  TDS: {
    title: "Tiny Salt & Mineral Bits",
    simple: "Think of invisible sprinkles dissolved in water. A few sprinkles make water taste fresh, but too many turn water salty and leave white chalky spots on cups.",
    actionGood: "Nice and crisp water without gritty chalk.",
    actionBad: "Lots of extra salt bits. An RO (Reverse Osmosis) filter cleans this right away.",
    icon: "🧂",
  },
  Turbidity: {
    title: "Water Clarity (Cloudiness)",
    simple: "Is the water crystal clear like glass, or cloudy like muddy pond water? We always want crystal clear water with zero floating dust.",
    actionGood: "Super clear, like a glass of mountain ice!",
    actionBad: "A bit foggy or dusty. Let's run it through a sediment filter.",
    icon: "🔍",
  },
  "Total Hardness": {
    title: "Soap Bubble Maker",
    simple: "Measures calcium rock dust. When it is too high, soap won't make fluffy bubbles and it leaves crusty white rings on taps and pots.",
    actionGood: "Makes big fluffy soap bubbles easily!",
    actionBad: "Hard water minerals found. A water softener helps soap bubble up.",
    icon: "🫧",
  },
  Chloride: {
    title: "Table Salt Level",
    simple: "Too much chloride makes water taste salty like seawater and can rust metal pipes over time.",
    actionGood: "Clean fresh taste, no salty bite.",
    actionBad: "Salty taste detected. Check where groundwater is coming from.",
    icon: "🌊",
  },
  Fluoride: {
    title: "Tooth Shield Mineral",
    simple: "A tiny pinch protects teeth from cavities! But too much can turn baby teeth spotty or brown.",
    actionGood: "Just the right pinch for strong teeth.",
    actionBad: "Too much for little teeth! Use activated alumina or RO purification.",
    icon: "🦷",
  },
  Nitrate: {
    title: "Farm Fertilizer Runoff",
    simple: "Sneaks into wells from farm dirt and fertilizers. Very important for babies because high nitrate makes it hard for little bodies to carry oxygen.",
    actionGood: "Clean and safe from fertilizer runoff.",
    actionBad: "Keep away from babies & pregnant moms until purified with RO or distillation!",
    icon: "🌱",
  },
  Iron: {
    title: "Rusty Metal Taste",
    simple: "Comes from red earth or rusty old pipes. It turns water brownish-orange, tastes like chewing on a coin, and stains laundry.",
    actionGood: "No metallic taste or reddish stains.",
    actionBad: "Rusty reddish tint! Install an iron filter to take out the metal.",
    icon: "🔩",
  },
};

const PARTICLE_LEGEND = [
  ["#bcecff", "TDS (Dissolved Bits)", "TDS"],
  ["#82e8c1", "Turbidity (Cloudiness)", "Turbidity"],
  ["#9bd5f2", "Total Hardness (Rock Dust)", "Total Hardness"],
  ["#c5e7ff", "Chloride (Salt)", "Chloride"],
  ["#9ce4ff", "Fluoride (Tooth Shield)", "Fluoride"],
  ["#c5a9ff", "Nitrate (Fertilizer)", "Nitrate"],
  ["#ffc080", "Iron (Rusty Metal)", "Iron"],
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const sceneRef = useRef(null);

  // Determine Overall Traffic Light Verdict
  const verdict = useMemo(() => {
    if (!analysis?.parameters || analysis.parameters.length === 0) {
      return {
        level: "unknown",
        badge: "Needs More Information",
        headline: "We need more test numbers to be sure!",
        subline: "This report doesn't have enough measurements yet. Don't guess—get a full water test.",
        color: "#6b7280",
        bg: "#f3f4f6",
        icon: "❓",
      };
    }

    const hasDanger = analysis.parameters.some((p) => p.status === "outside_range");
    const hasWarning = analysis.parameters.some((p) => p.status === "attention");

    if (hasDanger) {
      return {
        level: "danger",
        badge: "STOP & FIX (Action Needed)",
        headline: "Do NOT drink directly from tap right now!",
        subline: "Some levels are too high for drinking. Check the quick action steps below before drinking or cooking.",
        color: "#b91c1c",
        bg: "#fef2f2",
        icon: "🛑",
      };
    }

    if (hasWarning) {
      return {
        level: "warning",
        badge: "CAUTION (Review Needed)",
        headline: "Okay for some uses, but needs attention!",
        subline: "The water is mostly fine, but a few parameters are approaching limits. A basic filter or softener will fix it.",
        color: "#b45309",
        bg: "#fffbeb",
        icon: "⚠️",
      };
    }

    return {
      level: "safe",
      badge: "ALL CLEAR (Great Water)",
      headline: "Yay! This water is clean, fresh, and happy!",
      subline: "All tested numbers look great and safe. No extra filters or treatments are required right now.",
      color: "#15803d",
      bg: "#f0fdf4",
      icon: "✅",
    };
  }, [analysis]);

  // Group concerning parameters
  const concerningParameters = useMemo(() => {
    if (!analysis?.parameters) return [];
    return analysis.parameters.filter(
      (p) => p.status === "outside_range" || p.status === "attention",
    );
  }, [analysis]);

  // Concrete Action Checklist
  const actionChecklist = useMemo(() => {
    const actions = [];
    if (!analysis?.parameters) return actions;

    const nit = analysis.parameters.find((p) => p.parameter === "Nitrate" && p.status !== "within_range");
    if (nit) {
      actions.push({
        priority: "CRITICAL",
        text: "Keep away from babies and formula: Nitrate is elevated. Use reverse osmosis (RO) filtration or bottled water.",
        icon: "🍼",
      });
    }

    const turb = analysis.parameters.find((p) => p.parameter === "Turbidity" && p.status !== "within_range");
    if (turb) {
      actions.push({
        priority: "HIGH",
        text: "Clean out cloudiness: Install a 5-micron sediment filter before drinking or using appliances.",
        icon: "🧹",
      });
    }

    const fe = analysis.parameters.find((p) => p.parameter === "Iron" && p.status !== "within_range");
    if (fe) {
      actions.push({
        priority: "MEDIUM",
        text: "Stop rust & staining: Add an iron/manganese removal filter or check older iron plumbing.",
        icon: "🛠️",
      });
    }

    const tds = analysis.parameters.find((p) => p.parameter === "TDS" && p.status !== "within_range");
    if (tds) {
      actions.push({
        priority: "MEDIUM",
        text: "High dissolved solids: Install a kitchen RO drinking system to reduce mineral salts.",
        icon: "💧",
      });
    }

    const hard = analysis.parameters.find((p) => p.parameter === "Total Hardness" && p.status !== "within_range");
    if (hard) {
      actions.push({
        priority: "LOW",
        text: "Hard water scale: An ion-exchange water softener will protect your geyser and pipes.",
        icon: "✨",
      });
    }

    if (actions.length === 0) {
      actions.push({
        priority: "ROUTINE",
        text: "Everything is healthy! Just re-test once a year or whenever taste or smell changes.",
        icon: "🎉",
      });
    }

    return actions;
  }, [analysis]);

  async function requestExplanation(langOverride) {
    const lang = langOverride ?? selectedLang;
    setLoading(true);
    setExplanationError("");

    // Sanitize the analysis to match the exact AnalysisResult schema expected
    // by the backend (extra="forbid" means any unexpected field → 422 error)
    const sanitizedAnalysis = {
      parameters: (analysis?.parameters ?? []).map((p) => ({
        parameter: p.parameter,
        value: p.value ?? null,
        unit: p.unit ?? "",
        status: p.status,
        reference_minimum: p.reference_minimum ?? null,
        reference_maximum: p.reference_maximum ?? null,
        permissible_minimum: p.permissible_minimum ?? null,
        permissible_maximum: p.permissible_maximum ?? null,
      })),
      overall_score: analysis?.overall_score ?? null,
      score_method: analysis?.score_method ?? "unspecified",
      recommendations: analysis?.recommendations ?? [],
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
        // FastAPI validation errors return detail as an array of objects
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

      setExplanation(payload.explanation);
    } catch (requestError) {
      setExplanationError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate an explanation.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLangChange(code) {
    setSelectedLang(code);
    if (explanation) {
      // Immediately regenerate in the new language
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

  return (
    <section aria-label="Simple water quality insights and action plan" className={styles.insights}>
      
      {/* 1. BIG TRAFFIC LIGHT BANNER (UNDERSTANDABLE FOR A 3-YEAR-OLD) */}
      <div
        className={styles.verdictBanner}
        style={{
          borderColor: verdict.color,
          backgroundColor: verdict.bg,
        }}
      >
        <div className={styles.verdictIconWrap} style={{ color: verdict.color }}>
          <span className={styles.verdictEmoji}>{verdict.icon}</span>
        </div>
        <div className={styles.verdictText}>
          <div className={styles.badgeRow}>
            <span
              className={styles.trafficBadge}
              style={{ backgroundColor: verdict.color }}
            >
              {verdict.badge}
            </span>
            <span className={styles.scorePill}>
              Water Health Score:{" "}
              <strong>
                {analysis.overall_score != null ? `${analysis.overall_score}/100` : "Needs more data"}
              </strong>
            </span>
          </div>
          <h2 className={styles.verdictTitle}>{verdict.headline}</h2>
          <p className={styles.verdictSub}>{verdict.subline}</p>
        </div>
      </div>

      {/* 2. IMMEDIATE ACTION STEPS (WHAT TO DO NEXT) */}
      <div className={styles.actionPlanCard}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.pillTag}>STEP-BY-STEP</span>
            <h3 className={styles.actionPlanTitle}>What You Should Do Next</h3>
          </div>
          <button
            type="button"
            className={styles.pdfDownloadButton}
            onClick={handleDownloadReport}
            disabled={isDownloading}
            title="Download or print this report as PDF"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isDownloading ? "Preparing PDF…" : "Save / Print PDF"}
          </button>
        </div>
        <div className={styles.actionGrid}>
          {actionChecklist.map((act, i) => (
            <div key={i} className={styles.actionItem}>
              <span className={styles.actionEmoji}>{act.icon}</span>
              <div>
                <span className={`${styles.priorityBadge} ${styles[act.priority.toLowerCase()] || ""}`}>
                  {act.priority}
                </span>
                <p className={styles.actionDesc}>{act.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SUPER SIMPLE PARAMETER CARDS (LIKE A PICTURE BOOK) */}
      <div className={styles.friendlyCardsSection}>
        <div className={styles.sectionHeadingWrap}>
          <div>
            <span className={styles.pillTag}>SIMPLE EXPLANATIONS</span>
            <h3 className={styles.friendlyTitle}>What’s In Your Water? (Kid-Friendly Guide)</h3>
            <p className={styles.friendlySubtitle}>
              Tap on any card to see what it is, why it matters, and how clean it is.
            </p>
          </div>
        </div>

        <div className={styles.friendlyGrid}>
          {analysis.parameters.map((param) => {
            const info = TODDLER_EXPLANATIONS[param.parameter] || {
              title: param.parameter,
              simple: "A water test measurement.",
              actionGood: "Looks good!",
              actionBad: "Needs filtering.",
              icon: "💧",
            };
            const isGood = param.status === "within_range";
            const isAttention = param.status === "attention";
            const isBad = param.status === "outside_range";

            return (
              <div
                key={param.parameter}
                className={`${styles.kidCard} ${isBad ? styles.kidCardBad : isAttention ? styles.kidCardWarn : styles.kidCardGood} ${selectedParam === param.parameter ? styles.kidCardActive : ""}`}
                onClick={() => setSelectedParam((prev) => (prev === param.parameter ? null : param.parameter))}
              >
                <div className={styles.kidCardTop}>
                  <div className={styles.kidIconTitle}>
                    <span className={styles.cardEmoji}>{info.icon}</span>
                    <div>
                      <h4 className={styles.kidParamName}>{info.title}</h4>
                      <small className={styles.techSubName}>({param.parameter})</small>
                    </div>
                  </div>
                  <span className={`${styles.kidStatusTag} ${isBad ? styles.tagRed : isAttention ? styles.tagYellow : styles.tagGreen}`}>
                    {isBad ? "Needs Fix ❌" : isAttention ? "Watch Out ⚠️" : "Safe & Sound ✅"}
                  </span>
                </div>

                <p className={styles.kidSimpleExplain}>{info.simple}</p>

                <div className={styles.kidVerdictLine}>
                  <strong>Advice:</strong> {isGood ? info.actionGood : info.actionBad}
                </div>

                {/* Micro numbers for parents */}
                <div className={styles.kidValueFooter}>
                  <span>Reading: <strong>{param.value ?? "None"} {param.unit}</strong></span>
                  <button
                    type="button"
                    className={styles.tap3dButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedParam(param.parameter);
                      sceneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  >
                    🔬 View 3D particle
                  </button>
                </div>
              </div>
            );

          })}
        </div>
      </div>

      {/* 4. CONCEPTUAL 3D WATER LAB */}
      <div ref={sceneRef} className={styles.visualSectionCard}>
        <div className={styles.visualHeading}>
          <div>
            <span className={styles.pillTag}>AQUACHECK 3D LAB</span>
            <h3 className={styles.sectionTitle}>See It in 3D: Your Water vs. Pure Water</h3>
            <p className={styles.intro}>
              A live 3D water simulation showing floating particles and color based on your sample.
            </p>
          </div>
          <div className={styles.modeToggle} role="group" aria-label="Comparison visual mode">
            <button
              type="button"
              className={`${styles.toggleButton} ${viewMode === "sample" ? styles.toggleActive : ""}`}
              onClick={() => setViewMode("sample")}
            >
              Your Sample
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${viewMode === "normal" ? styles.toggleActive : ""}`}
              onClick={() => setViewMode("normal")}
            >
              Pure Baseline
            </button>
          </div>
        </div>

        <WaterQualityScene
          parameters={analysis.parameters}
          viewMode={viewMode}
          selectedParameterName={selectedParam}
          onSelectParameter={(paramName) => {
            setSelectedParam((prev) => (prev === paramName ? null : paramName));
          }}
        />

        <div className={styles.disclaimerCallout}>
          <span className={styles.calloutBadge}>Note</span>
          <p>
            <strong>Kid & Family Friendly Model:</strong> This 3D sphere is an educational illustration to help you picture the microscopic particles. It is a visual simulation, not a photo.
          </p>
        </div>

        {/* Clickable Legend */}
        <div className={styles.legendContainer}>
          <span className={styles.legendTitle}>Click any particle to highlight it:</span>
          <ul aria-label="Particle color legend" className={styles.legend}>
            {PARTICLE_LEGEND.map(([color, label, key]) => (
              <li key={key}>
                <button
                  type="button"
                  className={`${styles.legendItemButton} ${selectedParam === key ? styles.legendItemActive : ""}`}
                  onClick={() => setSelectedParam((prev) => (prev === key ? null : key))}
                >
                  <span aria-hidden="true" style={{ "--particle-color": color }} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 5. TOGGLEABLE TECHNICAL DETAILS (FOR LAB SCIENTISTS OR DETAIL-ORIENTED PARENTS) */}
      <div className={styles.technicalAccordion}>
        <button
          type="button"
          className={styles.accordionToggle}
          onClick={() => setShowTechnicalDetails((v) => !v)}
          aria-expanded={showTechnicalDetails}
        >
          <span>
            🔬 {showTechnicalDetails ? "Hide Laboratory Metrics & Standard Limits" : "Show Full Laboratory Numbers & Limits (Technical)"}
          </span>
          <span className={styles.arrowIcon}>{showTechnicalDetails ? "▲" : "▼"}</span>
        </button>

        {showTechnicalDetails && (
          <div className={styles.tableWrap}>
            <table className={styles.metricsTable}>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Measured</th>
                  <th>Reference Range</th>
                  <th>Permissible Max</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {analysis.parameters.map((param) => (
                  <tr key={param.parameter}>
                    <td><strong>{param.parameter}</strong></td>
                    <td>{param.value ?? "Unavailable"} {param.unit}</td>
                    <td>{formatRange(param.reference_minimum, param.reference_maximum, param.unit)}</td>
                    <td>{formatRange(param.permissible_minimum, param.permissible_maximum, param.unit)}</td>
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
      </div>

      {/* 6. AI STORY SUMMARY (PLAIN WORDS + MULTI-LANGUAGE) */}
      <div className={styles.explanation}>
        <div className={styles.aiStoryHeader}>
          <div>
            <span className={styles.pillTag}>AI WATER STORY</span>
            <h4 className={styles.actionPlanTitle}>Want a summary of this report?</h4>
            <p className={styles.intro}>
              Our AI reads the laboratory details and writes a friendly explanation anyone in your family can read — pick your language below.
            </p>
          </div>
          {/* Language Selector */}
          <div className={styles.langSelector} role="group" aria-label="Select explanation language">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`${styles.langButton} ${selectedLang === lang.code ? styles.langButtonActive : ""}`}
                onClick={() => handleLangChange(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {!explanation && !loading ? (
          <button
            className={styles.explainButton}
            disabled={loading}
            onClick={() => requestExplanation()}
            type="button"
          >
            📖 {LANGUAGES.find((l) => l.code === selectedLang)?.label ?? "English"} — Generate explanation
          </button>
        ) : null}

        {loading ? (
          <div className={styles.loadingRow}>
            <span className={styles.loadingSpinner} aria-hidden="true" />
            <span>Writing your water story…</span>
          </div>
        ) : null}

        {explanation ? (
          <div aria-live="polite" className={styles.explanationText}>
            {explanation.split(/\s*\n\n\s*/).filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <div className={styles.retryRow}>
              <button
                className={styles.retryButton}
                onClick={() => {
                  setExplanation("");
                  requestExplanation();
                }}
                type="button"
              >
                🔄 Regenerate story
              </button>
            </div>
          </div>
        ) : null}
        {explanationError ? (
          <p aria-live="polite" className={styles.error} role="alert">
            {explanationError}
          </p>
        ) : null}
      </div>

    </section>
  );
}
