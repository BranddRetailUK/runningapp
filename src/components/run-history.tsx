"use client";

import { Download, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { formatDuration, formatPace } from "@/lib/run-metrics";
import type { RunRecord } from "@/lib/types";

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function RunHistory({
  runs,
  onDeleted,
  onUpload,
}: {
  runs: RunRecord[];
  onDeleted: () => void;
  onUpload: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deleteRun = async (run: RunRecord) => {
    if (!window.confirm(`Delete the ${displayDate(run.run_date)} run?`)) return;
    setDeletingId(run.id);
    setError(null);
    try {
      const response = await fetch(`/api/runs/${run.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "The run could not be deleted.");
      }
      onDeleted();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The run could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  };

  const exportCsv = () => {
    const columns = [
      "Date",
      "Distance (km)",
      "Duration",
      "Calories",
      "Pace (/km)",
      "Average speed (km/h)",
      "MOVEs",
      "Equipment",
    ];
    const rows = runs.map((run) => [
      run.run_date,
      run.distance_km,
      formatDuration(run.duration_seconds),
      run.calories_kcal,
      formatPace(run.pace_seconds_per_km),
      run.average_speed_kmh,
      run.moves,
      run.equipment,
    ]);
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `runline-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="history-section">
      <div className="section-heading history-heading">
        <div>
          <p className="eyebrow">Logbook</p>
          <h2>Recent runs</h2>
        </div>
        {runs.length > 0 ? (
          <button className="secondary-button compact" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </button>
        ) : null}
      </div>

      {error ? <div className="form-error" role="alert">{error}</div> : null}

      {runs.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-mark">01</div>
          <div>
            <h3>No runs in this range yet.</h3>
            <p>Your imported sessions will appear here with their verified metrics.</p>
          </div>
          <button className="primary-button compact" onClick={onUpload}>
            <Plus size={17} /> Add a run
          </button>
        </div>
      ) : (
        <div className="run-table-wrap">
          <table className="run-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Pace</th>
                <th>Calories</th>
                <th>Equipment</th>
                <th><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 20).map((run) => (
                <tr key={run.id}>
                  <td data-label="Date"><strong>{displayDate(run.run_date)}</strong></td>
                  <td data-label="Distance">{run.distance_km.toFixed(2)} km</td>
                  <td data-label="Duration">{formatDuration(run.duration_seconds)}</td>
                  <td data-label="Pace"><span className="pace-pill">{formatPace(run.pace_seconds_per_km)} /km</span></td>
                  <td data-label="Calories">{run.calories_kcal?.toLocaleString("en-GB") ?? "—"}</td>
                  <td data-label="Equipment" className="equipment-cell">{run.equipment ?? "Treadmill"}</td>
                  <td>
                    <button
                      aria-label={`Delete run from ${displayDate(run.run_date)}`}
                      className="delete-button"
                      disabled={deletingId === run.id}
                      onClick={() => void deleteRun(run)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
