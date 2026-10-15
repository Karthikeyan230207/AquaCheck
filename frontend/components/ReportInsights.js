"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  PartyPopper,
  Printer,
  RefreshCw,
  ShieldCheck,
  Smile,
  Square,
  Sparkles,
  Sprout,
  TriangleAlert,
  Volume2,
  Waves,
  Wrench,
} from "lucide-react";
import WaterQualityScene from "./WaterQualityScene";
import styles from "./ReportInsights.module.css";

const LANGUAGES = [
  { code: "en", locale: "en-US", label: "English" },
  { code: "hi", locale: "hi-IN", label: "हिंदी" },
  { code: "ta", locale: "ta-IN", label: "தமிழ்" },
  { code: "es", locale: "es-ES", label: "Español" },
  { code: "fr", locale: "fr-FR", label: "Français" },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Ultra-clear kid/family explanations (analogies anyone can understand)
const TODDLER_EXPLANATIONS = {
  pH: {
    title: "Lemon vs. Soap Balance",
    simple: "Tells us if the water is sour like a lemon or slippery like soap. Good water should be just right in the middle (like sweet rain) so it doesn't hurt your tummy or bite the pipes.",
    actionGood: "Perfect balance! Smooth and gentle.",
    actionBad: "Too sour or too bitter. Needs a simple filter to balance it.",
    icon: Gauge,
  },
  TDS: {
    title: "Tiny Salt & Mineral Bits",
    simple: "Think of invisible sprinkles dissolved in water. A few sprinkles make water taste fresh, but too many turn water salty and leave white chalky spots on cups.",
    actionGood: "Nice and crisp water without gritty chalk.",
    actionBad: "Lots of extra salt bits. An RO (Reverse Osmosis) filter cleans this right away.",
    icon: Layers,
  },
  Turbidity: {
    title: "Water Clarity (Cloudiness)",
    simple: "Is the water crystal clear like glass, or cloudy like muddy pond water? We always want crystal clear water with zero floating dust.",
    actionGood: "Super clear, like a glass of mountain ice!",
    actionBad: "A bit foggy or dusty. Let's run it through a sediment filter.",
    icon: Eye,
  },
  "Total Hardness": {
    title: "Soap Bubble Maker",
    simple: "Measures calcium rock dust. When it is too high, soap won't make fluffy bubbles and it leaves crusty white rings on taps and pots.",
    actionGood: "Makes big fluffy soap bubbles easily!",
    actionBad: "Hard water minerals found. A water softener helps soap bubble up.",
    icon: Waves,
  },
  Chloride: {
    title: "Table Salt Level",
    simple: "Too much chloride makes water taste salty like seawater and can rust metal pipes over time.",
    actionGood: "Clean fresh taste, no salty bite.",
    actionBad: "Salty taste detected. Check where groundwater is coming from.",
    icon: Droplets,
  },
  Fluoride: {
    title: "Tooth Shield Mineral",
    simple: "A tiny pinch protects teeth from cavities! But too much can turn baby teeth spotty or brown.",
    actionGood: "Just the right pinch for strong teeth.",
    actionBad: "Too much for little teeth! Use activated alumina or RO purification.",
    icon: Smile,
  },
  Nitrate: {
    title: "Farm Fertilizer Runoff",
    simple: "Sneaks into wells from farm dirt and fertilizers. Very important for babies because high nitrate makes it hard for little bodies to carry oxygen.",
    actionGood: "Clean and safe from fertilizer runoff.",
    actionBad: "Keep away from babies & pregnant moms until purified with RO or distillation!",
    icon: Sprout,
  },
  Iron: {
    title: "Rusty Metal Taste",
    simple: "Comes from red earth or rusty old pipes. It turns water brownish-orange, tastes like chewing on a coin, and stains laundry.",
    actionGood: "No metallic taste or reddish stains.",
    actionBad: "Rusty reddish tint! Install an iron filter to take out the metal.",
    icon: Wrench,
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
  const explanationRequestId = useRef(0);
  const speechUtterance = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const sceneRef = useRef(null);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Determine Overall Traffic Light Verdict
  const verdict = useMemo(() => {
    if (!analysis?.parameters || analysis.parameters.length === 0) {
      return {
        level: "unknown",
        badge: "Needs More Information",
        headline: "We need more test numbers to be sure!",
        subline: "This report doesn't have enough measurements yet. Don't guess—get a full water test.",
        color: "#9dbdd0",
        bg: "rgba(125, 211, 252, 0.08)",
        icon: CircleHelp,
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
        color: "#f87171",
        bg: "rgba(248, 113, 113, 0.1)",
        icon: OctagonAlert,
      };
    }

    if (hasWarning) {
      return {
        level: "warning",
        badge: "CAUTION (Review Needed)",
        headline: "Okay for some uses, but needs attention!",
        subline: "The water is mostly fine, but a few parameters are approaching limits. A basic filter or softener will fix it.",
        color: "#fbbf24",
        bg: "rgba(251, 191, 36, 0.1)",
        icon: TriangleAlert,
      };
    }

    return {
      level: "safe",
      badge: "ALL CLEAR (Great Water)",
      headline: "Yay! This water is clean, fresh, and happy!",
      subline: "All tested numbers look great and safe. No extra filters or treatments are required right now.",
      color: "#34d399",
      bg: "rgba(52, 211, 153, 0.1)",
      icon: ShieldCheck,
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
        icon: Baby,
      });
    }

    const turb = analysis.parameters.find((p) => p.parameter === "Turbidity" && p.status !== "within_range");
    if (turb) {
      actions.push({
        priority: "HIGH",
        text: "Clean out cloudiness: Install a 5-micron sediment filter before drinking or using appliances.",
        icon: Filter,
      });
    }

    const fe = analysis.parameters.find((p) => p.parameter === "Iron" && p.status !== "within_range");
    if (fe) {
      actions.push({
        priority: "MEDIUM",
        text: "Stop rust & staining: Add an iron/manganese removal filter or check older iron plumbing.",
        icon: Wrench,
      });
    }

    const tds = analysis.parameters.find((p) => p.parameter === "TDS" && p.status !== "within_range");
    if (tds) {
      actions.push({
        priority: "MEDIUM",
        text: "High dissolved solids: Install a kitchen RO drinking system to reduce mineral salts.",
        icon: Droplets,
      });
    }

    const hard = analysis.parameters.find((p) => p.parameter === "Total Hardness" && p.status !== "within_range");
    if (hard) {
      actions.push({
        priority: "LOW",
        text: "Hard water scale: An ion-exchange water softener will protect your geyser and pipes.",
        icon: Sparkles,
      });
    }

    if (actions.length === 0) {
      actions.push({
        priority: "ROUTINE",
        text: "Everything is healthy! Just re-test once a year or whenever taste or smell changes.",
        icon: PartyPopper,
      });
    }

    return actions;
  }, [analysis]);

  async function requestExplanation(langOverride) {
    const lang = langOverride ?? selectedLang;
    const requestId = ++explanationRequestId.current;
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
    stopVoice();
    setSelectedLang(code);
    if (explanation || loading) {
      setExplanation("");
      requestExplanation(code);
    }
  }

  function stopVoice() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speechUtterance.current = null;
    setIsSpeaking(false);
    setSpeechError("");
  }

  function speakExplanation() {
    if (!explanation) return;
    if (
      typeof window === "undefined"
      || !("speechSynthesis" in window)
      || !("SpeechSynthesisUtterance" in window)
    ) {
      setSpeechError("Voice playback is not supported in this browser.");
      return;
    }

    stopVoice();
    const language = LANGUAGES.find((item) => item.code === selectedLang);
    const utterance = new window.SpeechSynthesisUtterance(
      explanation.replace(/\s+/g, " ").trim(),
    );
    utterance.lang = language?.locale ?? "en-US";

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) => voice.lang.toLowerCase() === utterance.lang.toLowerCase(),
    ) ?? voices.find(
      (voice) => voice.lang.toLowerCase().startsWith(`${selectedLang.toLowerCase()}-`),
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      if (speechUtterance.current === utterance) {
        setIsSpeaking(true);
      }
    };
    utterance.onend = () => {
      if (speechUtterance.current === utterance) {
        speechUtterance.current = null;
        setIsSpeaking(false);
      }
    };
    utterance.onerror = (event) => {
      if (speechUtterance.current !== utterance) return;
      speechUtterance.current = null;
      setIsSpeaking(false);
      if (event.error !== "canceled" && event.error !== "interrupted") {
        setSpeechError("Could not play the voice. Check that your browser has a voice for this language.");
      }
    };
    speechUtterance.current = utterance;
    setSpeechError("");
    window.speechSynthesis.speak(utterance);
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
          <span className={styles.verdictIcon}>{<verdict.icon size={34} strokeWidth={2.2} />}</span>
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
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handleDownloadReport}
            disabled={isDownloading}
            title="Download or print this report as PDF"
          >
            <Printer size={16} strokeWidth={2.2} aria-hidden="true" />
            {isDownloading ? "Preparing PDF…" : "Save / Print PDF"}
          </button>
        </div>
        <div className={styles.actionGrid}>
          {actionChecklist.map((act, i) => (
            <div key={i} className={styles.actionItem}>
              <span className={styles.actionIcon}>{<act.icon size={24} strokeWidth={2.1} />}</span>
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
              icon: Droplets,
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
                    <span className={styles.cardIcon}>{<info.icon size={24} strokeWidth={2.1} />}</span>
                    <div>
                      <h4 className={styles.kidParamName}>{info.title}</h4>
                      <small className={styles.techSubName}>({param.parameter})</small>
                    </div>
                  </div>
                  <span className={`${styles.kidStatusTag} ${isBad ? styles.tagRed : isAttention ? styles.tagYellow : styles.tagGreen}`}>
                    {isBad ? <CircleX size={13} strokeWidth={2.4} /> : isAttention ? <TriangleAlert size={13} strokeWidth={2.4} /> : <CircleCheck size={13} strokeWidth={2.4} />}
                    {isBad ? "Needs Fix" : isAttention ? "Watch Out" : "Safe & Sound"}
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
                    className={`${styles.btn} ${styles.btnChipSm}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedParam(param.parameter);
                      sceneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  >
                    <Microscope size={13} strokeWidth={2.2} />
                    View 3D particle
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
              className={`${styles.btn} ${styles.btnChip} ${viewMode === "sample" ? styles.btnChipActive : ""}`}
              onClick={() => setViewMode("sample")}
            >
              Your Sample
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnChip} ${viewMode === "normal" ? styles.btnChipActive : ""}`}
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
            <Microscope size={15} strokeWidth={2.2} /> {showTechnicalDetails ? "Hide Laboratory Metrics & Standard Limits" : "Show Full Laboratory Numbers & Limits (Technical)"}
          </span>
          <span className={styles.arrowIcon} style={{ display: "inline-flex" }}>
            <ChevronDown
              size={16}
              strokeWidth={2.4}
              style={{ transform: showTechnicalDetails ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }}
            />
          </span>
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
            <span className={styles.langIcon} aria-hidden="true">
              <Languages size={16} strokeWidth={2.2} />
            </span>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`${styles.btn} ${styles.btnChip} ${selectedLang === lang.code ? styles.btnChipActive : ""}`}
                onClick={() => handleLangChange(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {!explanation && !loading ? (
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={loading}
            onClick={() => requestExplanation()}
            type="button"
          >
            <BookOpen size={16} strokeWidth={2.2} />
            {LANGUAGES.find((l) => l.code === selectedLang)?.label ?? "English"} — Generate explanation
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
              {isSpeaking ? (
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={stopVoice}
                  type="button"
                >
                  <Square size={15} strokeWidth={2.2} />
                  Stop voice
                </button>
              ) : (
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={speakExplanation}
                  type="button"
                  title={`Listen in ${LANGUAGES.find((l) => l.code === selectedLang)?.label}`}
                >
                  <Volume2 size={15} strokeWidth={2.2} />
                  Listen to explanation
                </button>
              )}
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => {
                  stopVoice();
                  setExplanation("");
                  requestExplanation();
                }}
                type="button"
              >
                <RefreshCw size={15} strokeWidth={2.2} />
                Regenerate story
              </button>
            </div>
          </div>
        ) : null}
        {speechError ? (
          <p aria-live="polite" className={styles.error} role="alert">
            {speechError}
          </p>
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
