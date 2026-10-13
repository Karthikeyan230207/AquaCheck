"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";
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
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");

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

  async function handleDelete(reportId) {
    if (!accessToken) return;
    setDeletingId(reportId);
    setError("");
    setActionMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${encodeURIComponent(reportId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || `Delete failed (${response.status})`);
      }

      setReports((prev) => prev.filter((r) => r.report_id !== reportId));
      setConfirmDeleteId(null);
      setActionMessage("Report removed from your history.");
      setTimeout(() => setActionMessage(""), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this report.");
    } finally {
      setDeletingId(null);
    }
  }

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
        <>
          {actionMessage && (
            <div className={styles.successNotice} role="status">
              {actionMessage}
            </div>
          )}
          <ul className={styles.list}>
            {reports.map((report) => {
              const isConfirming = confirmDeleteId === report.report_id;
              const isDeleting = deletingId === report.report_id;

              return (
                <li className={styles.item} key={report.report_id}>
                  <div className={styles.itemInfo}>
                    <Link className={styles.itemTitle} href={`/report/${report.report_id}`}>
                      {report.filename}
                    </Link>
                    <p className={styles.itemMeta}>
                      {new Date(report.created_at).toLocaleString()} ·{" "}
                      {report.page_count} page{report.page_count === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className={styles.itemActions}>
                    <strong className={styles.scoreText}>
                      {report.analysis?.overall_score == null
                        ? "Score unavailable"
                        : `${report.analysis.overall_score}/100`}
                    </strong>

                    {isConfirming ? (
                      <div className={styles.confirmBox}>
                        <span className={styles.confirmPrompt}>Delete?</span>
                        <button
                          type="button"
                          className={styles.confirmBtn}
                          disabled={isDeleting}
                          onClick={() => handleDelete(report.report_id)}
                        >
                          {isDeleting ? <Loader2 size={13} className={styles.spin} /> : "Yes"}
                        </button>
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          disabled={isDeleting}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => setConfirmDeleteId(report.report_id)}
                        title="Delete report from history"
                        aria-label={`Delete ${report.filename}`}
                      >
                        <Trash2 size={16} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {user && (
        <p className={styles.newReport}>
          <Link href="/upload">Analyze another report</Link>
        </p>
      )}
    </AppPage>
  );
}

