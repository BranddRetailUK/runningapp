"use client";

import dynamic from "next/dynamic";
import {
  CalendarDays,
  Clock3,
  Flame,
  Gauge,
  Plus,
  Route,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RunHistory } from "@/components/run-history";
import { UploadModal } from "@/components/upload-modal";
import { buildChartData, summarizeRuns } from "@/lib/dashboard";
import { formatDuration, formatPace } from "@/lib/run-metrics";
import type { RangeKey, RunRecord } from "@/lib/types";

const RunCharts = dynamic(
  () => import("@/components/run-charts").then((module) => module.RunCharts),
  { ssr: false, loading: () => <div className="chart-loading">Building your charts…</div> },
);

const ranges: Array<{ value: RangeKey; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "12 weeks" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body;
}

export function Dashboard() {
  const [range, setRange] = useState<RangeKey>("month");
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const loadRuns = useCallback(async (selectedRange: RangeKey) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<{ runs: RunRecord[] }>(`/api/runs?range=${selectedRange}`);
      setRuns(data.runs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Run data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRuns(range), 0);
    return () => window.clearTimeout(timer);
  }, [loadRuns, range]);

  const summary = useMemo(() => summarizeRuns(runs), [runs]);
  const chartData = useMemo(() => buildChartData(runs, range), [range, runs]);
  const selectedRangeLabel = ranges.find((item) => item.value === range)?.label ?? "Month";

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Runline dashboard">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>Runline</span>
        </a>
        <div className="topbar-actions">
          <span className="privacy-chip">
            <span className="status-dot" /> Private dashboard
          </span>
          <button className="primary-button compact" onClick={() => setUploadOpen(true)}>
            <Plus size={18} strokeWidth={2.4} /> Add today&apos;s run
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow"><Sparkles size={15} /> Your running record</p>
          <h1>Every day adds up.</h1>
          <p className="hero-copy">
            Turn a Technogym screenshot into a clear view of your consistency,
            distance, pace, and energy over time.
          </p>
        </div>
        <div className="range-control" aria-label="Dashboard time range">
          {ranges.map((item) => (
            <button
              className={range === item.value ? "active" : ""}
              key={item.value}
              onClick={() => setRange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <section className="inline-alert error-alert" role="alert">
          <div>
            <strong>Dashboard unavailable</strong>
            <p>{error}</p>
          </div>
          <button className="secondary-button" onClick={() => void loadRuns(range)}>
            Retry
          </button>
        </section>
      ) : null}

      <section className="metrics-grid" aria-label={`${selectedRangeLabel} summary`}>
        <MetricCard
          icon={<Route size={20} />}
          label="Distance"
          value={summary.totalDistanceKm.toLocaleString("en-GB", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          unit="km"
          accent="lime"
        />
        <MetricCard
          icon={<CalendarDays size={20} />}
          label="Runs"
          value={summary.runCount.toLocaleString("en-GB")}
          unit={summary.runCount === 1 ? "session" : "sessions"}
          accent="mint"
        />
        <MetricCard
          icon={<Gauge size={20} />}
          label="Average pace"
          value={summary.averagePaceSeconds ? formatPace(summary.averagePaceSeconds) : "—"}
          unit="/km"
          accent="blue"
        />
        <MetricCard
          icon={<Flame size={20} />}
          label="Calories"
          value={summary.totalCalories.toLocaleString("en-GB")}
          unit="kcal"
          accent="coral"
        />
        <MetricCard
          icon={<Clock3 size={20} />}
          label="Time running"
          value={summary.totalDurationSeconds ? formatDuration(summary.totalDurationSeconds) : "—"}
          unit="total"
          accent="violet"
        />
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Performance</p>
          <h2>{selectedRangeLabel} at a glance</h2>
        </div>
        <p>{loading ? "Refreshing…" : `${summary.runCount} logged runs`}</p>
      </section>

      {loading ? (
        <div className="chart-loading">Loading your running history…</div>
      ) : (
        <RunCharts data={chartData} />
      )}

      <RunHistory
        runs={[...runs].reverse()}
        onDeleted={() => void loadRuns(range)}
        onUpload={() => setUploadOpen(true)}
      />

      <footer className="footer">
        <span>Runline</span>
        <p>Screenshots are processed in memory and discarded after extraction.</p>
      </footer>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSaved={() => {
          setUploadOpen(false);
          void loadRuns(range);
        }}
      />
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  accent: string;
}) {
  return (
    <article className={`metric-card accent-${accent}`}>
      <div className="metric-icon">{icon}</div>
      <p>{label}</p>
      <div className="metric-value">
        <strong>{value}</strong>
        <span>{unit}</span>
      </div>
    </article>
  );
}
