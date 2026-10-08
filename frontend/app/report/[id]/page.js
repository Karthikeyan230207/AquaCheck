"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppPage from "../../../components/AppPage";
import { useAuth } from "../../../hooks/useAuth";
import styles from "./report.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportPage() {
  const params = useParams();
  const reportId = params.id;
  const {
    user,
    accessToken,
    loading: authLoading,
    error: authError,
  } = useAuth();
  const [report, setReport] = useState(null);
  const [resolvedRequest, setResolvedRequest] = useState("");
  const [error, setError] = useState("");
  const requestKey = user && accessToken && reportId
    ? `${user.id}:${reportId}`
    : "";
  const loadingReport = Boolean(requestKey && resolvedRequest !== requestKey);

  useEffect(() => {
    if (authLoading || !user || !accessToken || !reportId) return undefined;

    let mounted = true;
    fetch(`${API_BASE_URL}/api/reports/${encodeURIComponent(reportId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail || `Request failed (${response.status}).`);
        }
        return payload;
      })
      .then((data) => {
        if (!mounted) return;
        setReport(data);
        setError("");
        setResolvedRequest(requestKey);
      })
      .catch((queryError) => {
        if (!mounted) return;
        setError(
          queryError instanceof Error
            ? queryError.message
            : "Could not load this report.",
        );
        setResolvedRequest(requestKey);
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, authLoading, reportId, requestKey, user]);

  return (
    <AppPage
      description="Your saved water report analysis."
      eyebrow="SAVED ANALYSIS"
      title={report?.filename ?? "Report"}
    >
      {authLoading || loadingReport ? (
        <p>Loading saved report…</p>
      ) : authError ? (
        <p className={styles.error} role="alert">
          Could not verify your sign-in status: {authError}
        </p>
      ) : !user ? (
        <>
          <p>Sign in to access saved report results.</p>
          <p>
            <Link href="/login">Sign in</Link>
          </p>
        </>
      ) : !accessToken ? (
        <p className={styles.error} role="alert">
          Your sign-in session is missing an access token. Sign out, then sign
          in again.
        </p>
      ) : error ? (
        <>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <p>
            <Link href="/history">Back to history</Link>
          </p>
        </>
      ) : report ? (
        <ReportResult report={report} />
      ) : (
        <p>Loading saved report…</p>
      )}
    </AppPage>
  );
}

function ReportResult({ report }) {
  const analysis = report.analysis;
  const score =
    analysis.overall_score == null
      ? "Not enough data"
      : `${analysis.overall_score}/100`;

  return (
    <>
      <p className={styles.meta}>
        Analyzed {new Date(report.created_at).toLocaleString()} · {report.page_count}{" "}
        page{report.page_count === 1 ? "" : "s"}
      </p>
      <p className={styles.score}>Water score: {score}</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {analysis.parameters.map((parameter) => (
              <tr key={parameter.parameter}>
                <td>{parameter.parameter}</td>
                <td>
                  {parameter.value ?? "Unavailable"}{" "}
                  {parameter.value == null ? "" : parameter.unit}
                </td>
                <td className={styles.status}>
                  {parameter.status.replaceAll("_", " ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className={styles.sectionTitle}>Recommendations</h2>
      <ul className={styles.recommendations}>
        {analysis.recommendations.map((recommendation) => (
          <li key={recommendation}>{recommendation}</li>
        ))}
      </ul>
      <p className={styles.back}>
        <Link href="/history">Back to history</Link>
      </p>
    </>
  );
}
