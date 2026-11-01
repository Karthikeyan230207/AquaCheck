"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, Loader2, FileText, ArrowRight, Eye, Plus, LogIn, Calendar, Layers } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import styles from "./history.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function HistoryLoading({ label }) {
  return (
    <div className={styles.loadingState}>
      <div className={styles.loadingHeader}>
        <Loader2 size={18} className={styles.spin} />
        <p role="status">{label}</p>
      </div>
      <ul className={styles.loadingList} aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <li className={styles.loadingItem} key={row}>
            <div className={styles.loadingLeft}>
              <span className={styles.loadingTitle} />
              <span className={styles.loadingMeta} />
            </div>
            <div className={styles.loadingRight}>
              <span className={styles.loadingScore} />
              <span className={styles.loadingBtn} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HistoryContent() {
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
  const [actionMessage, setActionMessage] = useState("");

  const requestKey = user && accessToken ? user.id : "";
  const loadingReports = Boolean(requestKey && loadedRequest !== requestKey);

  useEffect(() => {
    if (authLoading || !requestKey || !accessToken) return undefined;

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/reports?limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail || `Request failed (${response.status}).`);
        }
        return payload;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setReports(payload.reports ?? []);
        setError("");
        setLoadedRequest(requestKey);
      })
      .catch((queryError) => {
        if (controller.signal.aborted) return;
        setError(
          queryError instanceof Error
            ? queryError.message
            : "Could not load report history.",
        );
        setLoadedRequest(requestKey);
      });

    return () => controller.abort();
  }, [accessToken, authLoading, requestKey]);

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

      setReports((previous) => previous.filter((report) => report.report_id !== reportId));
      setActionMessage("Report removed from your history.");
      setTimeout(() => setActionMessage(""), 3500);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this report.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.historyContent}>
      {authLoading ? (
        <HistoryLoading label="Checking your sign-in status…" />
      ) : authError ? (
        <div className={styles.errorBanner} role="alert">
          <p>Could not verify your sign-in status: {authError}</p>
        </div>
      ) : !user ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <LogIn size={28} />
          </div>
          <h3>Authentication Required</h3>
          <p>Sign in to access your archived laboratory screenings and maintain ongoing test history.</p>
          <div className={styles.emptyActions}>
            <Link href="/login" className={styles.btnPrimary}>
              <LogIn size={16} />
              <span>Sign In to Account</span>
              <ArrowRight size={15} />
            </Link>
            <Link href="/register" className={styles.btnSecondary}>
              <span>Create Account</span>
            </Link>
          </div>
        </div>
      ) : !accessToken ? (
        <div className={styles.errorBanner} role="alert">
          <p>Your sign-in session is missing an access token. Please sign in again.</p>
          <Link href="/login" className={styles.btnPrimary}>
            <LogIn size={15} />
            <span>Sign In Again</span>
          </Link>
        </div>
      ) : loadingReports ? (
        <HistoryLoading label="Retrieving your laboratory reports…" />
      ) : error && reports.length === 0 ? (
        <div className={styles.errorBanner} role="alert">
          <p>Could not load report history: {error}</p>
        </div>
      ) : reports.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FileText size={28} />
          </div>
          <h3>No Saved Analyses Yet</h3>
          <p>Upload a laboratory water quality certificate or enter test figures to generate your first comprehensive report.</p>
          <div className={styles.emptyActions}>
            <Link href="/upload" className={styles.btnPrimary}>
              <Plus size={16} />
              <span>Analyze a Water Report</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.historyHeaderRow}>
            <span className={styles.reportsCountBadge}>
              <FileText size={14} />
              <span>{reports.length} Archived {reports.length === 1 ? "Report" : "Reports"}</span>
            </span>
            <Link href="/upload" className={styles.btnSecondarySmall}>
              <Plus size={15} />
              <span>New Analysis</span>
            </Link>
          </div>

          <ul className={styles.list}>
            {reports.map((report) => {
              const isDeleting = deletingId === report.report_id;
              const score = report.analysis?.overall_score;

              return (
                <li className={styles.item} key={report.report_id}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitleRow}>
                      <span className={styles.fileIconBadge}>
                        <FileText size={18} />
                      </span>
                      <div>
                        <h4 className={styles.itemTitle}>{report.filename}</h4>
                        <div className={styles.itemMeta}>
                          <span className={styles.metaSnippet}>
                            <Calendar size={13} />
                            {new Date(report.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className={styles.metaDivider}>•</span>
                          <span className={styles.metaSnippet}>
                            <Layers size={13} />
                            {report.page_count} {report.page_count === 1 ? "page" : "pages"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <div className={styles.scoreContainer}>
                      <span className={styles.scoreLabel}>Health Index</span>
                      <strong
                        className={`${styles.scoreText} ${
                          score == null
                            ? ""
                            : score >= 80
                            ? styles.scoreSafe
                            : score >= 60
                            ? styles.scoreWarn
                            : styles.scoreBad
                        }`}
                      >
                        {score == null ? "Pending" : `${score}/100`}
                      </strong>
                    </div>

                    <div className={styles.buttonGroup}>
                      <Link
                        href={`/report/${report.report_id}`}
                        className={styles.viewReportButton}
                        title={`Open report analysis for ${report.filename}`}
                      >
                        <Eye size={15} />
                        <span>View Analysis</span>
                        <ArrowRight size={14} />
                      </Link>

                      <button
                        type="button"
                        className={styles.deleteButton}
                        disabled={isDeleting}
                        aria-busy={isDeleting}
                        onClick={() => handleDelete(report.report_id)}
                        title="Delete report from history"
                        aria-label={`Delete ${report.filename}`}
                      >
                        {isDeleting ? (
                          <Loader2 size={15} className={styles.spin} aria-hidden="true" />
                        ) : (
                          <Trash2 size={15} strokeWidth={2.2} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {error && reports.length > 0 && (
        <div className={styles.errorBanner} role="alert">
          <p>Could not delete this report: {error}</p>
        </div>
      )}

      {actionMessage && (
        <div className={styles.successNotice} role="status">
          {actionMessage}
        </div>
      )}
    </div>
  );
}
