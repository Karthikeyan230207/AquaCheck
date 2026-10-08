"use client";

import Link from "next/link";
import { useState } from "react";
import AppPage from "../../components/AppPage";
import styles from "./dashboard.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState("not_checked");
  const [apiError, setApiError] = useState("");

  async function checkApi() {
    setApiStatus("checking");
    setApiError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`Health check returned ${response.status}`);
      }
      const health = await response.json();
      if (health.status !== "ok") {
        throw new Error("Backend returned an unexpected health status");
      }
      setApiStatus("online");
    } catch (error) {
      setApiStatus("offline");
      setApiError(
        error instanceof Error ? error.message : "The backend health check failed.",
      );
    }
  }

  const statusText = {
    not_checked: "Not checked",
    checking: "Checking…",
    online: "Online",
    offline: "Unavailable",
  }[apiStatus];

  return (
    <AppPage
      description="Start a report analysis or check whether the local analysis API is responding."
      eyebrow="OVERVIEW"
      title="Dashboard"
    >
      <p>
        AquaCheck can analyze text-based PDF reports and show supported
        measurements, reference-range status, score, and recommendations.
      </p>
      <p>
        <Link href="/upload">Upload a water report</Link>
      </p>
      <p>
        Backend status: <strong>{statusText}</strong>
      </p>
      <button
        className={styles.checkButton}
        disabled={apiStatus === "checking"}
        onClick={checkApi}
        type="button"
      >
        Check backend
      </button>
      {apiError && (
        <p className={styles.error} role="alert">
          {apiError}
        </p>
      )}
    </AppPage>
  );
}