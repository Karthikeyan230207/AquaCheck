"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, LogIn, Calendar, Layers, AlertCircle, Loader2 } from "lucide-react";
import AppPage from "../../../components/AppPage";
import ReportInsights from "../../../components/ReportInsights";
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
      wide={true}
      description={
        report
          ? `Analysis certificate archived on ${new Date(report.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.`
          : "Saved water quality laboratory analysis."
      }
      eyebrow="LABORATORY REPORT"
      title={report?.filename ?? "Water Quality Report"}
      actions={
        <Link href="/history" className={styles.btnBackTop}>
          <ArrowLeft size={15} />
          <span>Back to History</span>
        </Link>
      }
    >
      {authLoading || loadingReport ? (
        <div className={styles.stateCard}>
          <Loader2 size={24} className={styles.spin} />
          <p>Loading saved report analysis…</p>
        </div>
      ) : authError ? (
        <div className={styles.errorCard} role="alert">
          <AlertCircle size={20} />
          <p>Could not verify your sign-in session: {authError}</p>
        </div>
      ) : !user ? (
        <div className={styles.stateCard}>
          <LogIn size={26} />
          <h3>Authentication Required</h3>
          <p>Sign in to your account to access your archived laboratory reports.</p>
          <Link href="/login" className={styles.btnPrimary}>
            <LogIn size={15} />
            <span>Sign In to Account</span>
          </Link>
        </div>
      ) : !accessToken ? (
        <div className={styles.errorCard} role="alert">
          <AlertCircle size={20} />
          <p>Your session is missing an access token. Please sign in again.</p>
          <Link href="/login" className={styles.btnPrimary}>
            <span>Sign In Again</span>
          </Link>
        </div>
      ) : error ? (
        <div className={styles.stateCard}>
          <AlertCircle size={26} />
          <h3>Unable to Load Report</h3>
          <p>{error}</p>
          <Link href="/history" className={styles.btnBack}>
            <ArrowLeft size={15} />
            <span>Return to History</span>
          </Link>
        </div>
      ) : report ? (
        <div className={styles.reportContainer}>
          <div className={styles.reportMetaBar}>
            <div className={styles.metaItems}>
              <span className={styles.metaChip}>
                <Calendar size={14} />
                <span>{new Date(report.created_at).toLocaleString()}</span>
              </span>
              <span className={styles.metaChip}>
                <Layers size={14} />
                <span>{report.page_count} {report.page_count === 1 ? "page" : "pages"}</span>
              </span>
            </div>
          </div>

          <ReportInsights
            analysis={report.analysis}
            reportMetadata={report}
            fileName={report.filename || `Report_${report.id}`}
          />
        </div>
      ) : (
        <div className={styles.stateCard}>
          <Loader2 size={24} className={styles.spin} />
          <p>Loading saved report…</p>
        </div>
      )}
    </AppPage>
  );
}
