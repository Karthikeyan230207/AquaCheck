"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppPage from "../../components/AppPage";
import { useAuth } from "../../hooks/useAuth";
import styles from "./history.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HistoryPage() {
  const {
    user,
    accessToken,
    loading: authLoading,
    error: authError,
  } = useAuth();
  const [reports, setReports] = useState([]);
  const [loadedRequest, setLoadedRequest] = useState("");
  const [error, setError] = useState("");
  const requestKey = user && accessToken ? user.id : "";
  const loadingReports = Boolean(requestKey && loadedRequest !== requestKey);

  useEffect(() => {
    if (authLoading || !user || !accessToken) return undefined;

    let mounted = true;
    fetch(`${API_BASE_URL}/api/reports?limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail || `Request failed (${response.status}).`);
        }
        return payload;
      })
      .then((payload) => {
        if (!mounted) return;
        setReports(payload.reports ?? []);
        setError("");
        setLoadedRequest(requestKey);
      })
      .catch((queryError) => {
        if (!mounted) return;
        setError(
          queryError instanceof Error
            ? queryError.message
            : "Could not load report history.",
        );
        setLoadedRequest(requestKey);
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, authLoading, requestKey, user]);

  return (
    <AppPage
      description="Saved analyses are private to your signed-in account."
      eyebrow="YOUR REPORTS"
      title="History"
    >
      {authLoading ? (
        <p>Checking your sign-in status…</p>
      ) : authError ? (
        <p className={styles.error} role="alert">
          Could not verify your sign-in status: {authError}
        </p>
      ) : !user ? (
        <>
          <p>Sign in to see saved reports and keep future analyses in history.</p>
          <p>
            <Link href="/login">Sign in</Link>
          </p>
        </>
      ) : !accessToken ? (
        <p className={styles.error} role="alert">
          Your sign-in session is missing an access token. Sign out, then sign
          in again.
        </p>
      ) : loadingReports ? (
        <p>Loading your reports…</p>
      ) : error ? (
        <p className={styles.error} role="alert">
          Could not load report history: {error}
        </p>
      ) : reports.length === 0 ? (
        <>
          <p>You have no saved reports yet.</p>
          <p>
            <Link href="/upload">Analyze a report</Link>
          </p>
        </>
      ) : (
        <ul className={styles.list}>
          {reports.map((report) => (
            <li className={styles.item} key={report.report_id}>
              <div>
                <Link href={`/report/${report.report_id}`}>{report.filename}</Link>
                <p>
                  {new Date(report.created_at).toLocaleString()} ·{" "}
                  {report.page_count} page{report.page_count === 1 ? "" : "s"}
                </p>
              </div>
              <strong>
                {report.analysis?.overall_score == null
                  ? "Score unavailable"
                  : `${report.analysis.overall_score}/100`}
              </strong>
            </li>
          ))}
        </ul>
      )}
      {user && (
        <p className={styles.newReport}>
          <Link href="/upload">Analyze another report</Link>
        </p>
      )}
    </AppPage>
  );
}
