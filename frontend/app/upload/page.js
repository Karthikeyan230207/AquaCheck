"use client";

import Link from "next/link";
import { useState } from "react";
import ReportInsights from "../../components/ReportInsights";
import { useAuth } from "../../hooks/useAuth";
import styles from "./upload.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function UploadPage() {
  const {
    user,
    accessToken,
    loading: authLoading,
    error: authError,
  } = useAuth();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [savedReportId, setSavedReportId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF report to analyze.");
      return;
    }

    setError("");
    setSavedReportId("");
    setResult(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const headers = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined;
      const response = await fetch(`${API_BASE_URL}/api/reports/analyze`, {
        method: "POST",
        headers,
        body: formData,
      });
      const responseText = await response.text();
      let payload;

      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new Error(
          response.ok
            ? "The API returned an unreadable response."
            : `The API request failed (${response.status}).`,
        );
      }

      if (!response.ok) {
        throw new Error(payload.detail || `The API request failed (${response.status}).`);
      }
      setResult(payload);
      if (payload.saved_to_history) {
        setSavedReportId(payload.report_id);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "An unexpected error occurred while analyzing the report.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Link className={styles.backLink} href="/">
          ← AquaCheck
        </Link>
        <p className={styles.eyebrow}>WATER QUALITY CHECK</p>
        <h1>Analyze a water report</h1>
        <p className={styles.intro}>
          Upload a text-based PDF to extract supported measurements and compare
          them with AquaCheck reference ranges.
        </p>

        <form className={styles.uploadForm} onSubmit={handleSubmit}>
          <label className={styles.fileLabel} htmlFor="report-file">
            <span className={styles.fileIcon} aria-hidden="true">
              ↑
            </span>
            <span>
              <strong>{file ? file.name : "Choose a PDF report"}</strong>
              <small>PDF only · scanned PDFs are not supported yet</small>
            </span>
          </label>
          <input
            accept=".pdf,application/pdf"
            className={styles.fileInput}
            id="report-file"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setError("");
              setSavedReportId("");
              setResult(null);
            }}
            type="file"
          />
          <button
            className={styles.submitButton}
            disabled={isSubmitting || authLoading}
            type="submit"
          >
            {isSubmitting ? "Analyzing report…" : "Analyze report"}
          </button>
        </form>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {result && (
          <AnalysisResult
            result={result}
            savedReportId={savedReportId}
            user={user}
            accessToken={accessToken}
            authLoading={authLoading}
            authError={authError}
          />
        )}
      </section>
    </main>
  );
}

function AnalysisResult({
  result,
  savedReportId,
  user,
  accessToken,
  authLoading,
  authError,
}) {
  const analysis = result.analysis;
  const score =
    analysis.overall_score === null
      ? "Not enough data"
      : `${analysis.overall_score}/100`;

  return (
    <section aria-live="polite" className={styles.results}>
      <div className={styles.resultHeading}>
        <div>
          <p className={styles.eyebrow}>ANALYSIS COMPLETE</p>
          <h2>{result.filename}</h2>
          <p className={styles.muted}>
            {result.page_count} page{result.page_count === 1 ? "" : "s"} ·{" "}
            {analysis.parameters.length} measurement
            {analysis.parameters.length === 1 ? "" : "s"} found
          </p>
        </div>
        <div className={styles.score}>
          <span>Water score</span>
          <strong>{score}</strong>
        </div>
      </div>

      {savedReportId ? (
        <p className={styles.saveNotice} role="status">
          Saved to your account.{" "}
          <Link href={`/report/${savedReportId}`}>View saved report</Link>
        </p>
      ) : authLoading ? (
        <p className={styles.saveNotice}>Checking whether this report can be saved…</p>
      ) : authError ? (
        <p className={styles.error} role="alert">
          Analysis completed, but your sign-in status could not be verified:
          {" "}{authError}. The report was not saved.
        </p>
      ) : !user || !accessToken ? (
        <p className={styles.saveNotice}>
          This analysis is not saved.{" "}
          <Link href="/login">Sign in</Link> before your next upload to keep it
          in your report history.
        </p>
      ) : null}

      <ReportInsights analysis={analysis} />

      <p className={styles.disclaimer}>
        This screening is informational and is not a substitute for professional
        laboratory advice.
      </p>
    </section>
  );
}
