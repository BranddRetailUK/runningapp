"use client";

import {
  AlertTriangle,
  Check,
  ImageUp,
  LoaderCircle,
  LockKeyhole,
  RefreshCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  deriveAverageSpeed,
  derivePaceSeconds,
  formatPace,
  parseClockValue,
  formatDuration,
} from "@/lib/run-metrics";
import type { ParsedRunDraft } from "@/lib/types";

type Step = "select" | "extracting" | "confirm" | "saving";

type FormValues = {
  runDate: string;
  distance: string;
  duration: string;
  calories: string;
  moves: string;
  equipment: string;
  workoutLabel: string;
};

function todayForInput() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const emptyForm = (): FormValues => ({
  runDate: todayForInput(),
  distance: "",
  duration: "",
  calories: "",
  moves: "",
  equipment: "",
  workoutLabel: "",
});

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json().catch(() => ({}))) as T & { error?: string };
}

export function UploadModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<ParsedRunDraft | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStep("select");
    setFile(null);
    setPreviewUrl(null);
    setDraft(null);
    setForm(emptyForm());
    setError(null);
  };

  const close = () => {
    if (step === "extracting" || step === "saving") return;
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = (selected: File | null) => {
    if (!selected) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setDraft(null);
    setError(null);
    setStep("select");
  };

  const processScreenshot = async () => {
    if (!file) {
      setError("Choose a screenshot first.");
      return;
    }

    setStep("extracting");
    setError(null);
    const body = new FormData();
    body.append("screenshot", file);

    try {
      const response = await fetch("/api/runs/parse", { method: "POST", body });
      const payload = await readJson<{ draft: ParsedRunDraft }>(response);
      if (!response.ok) throw new Error(payload.error || "Screenshot processing failed.");

      const extraction = payload.draft.extraction;
      setDraft(payload.draft);
      setForm((current) => ({
        ...current,
        distance: extraction.distance_km?.toString() ?? "",
        duration:
          extraction.duration_seconds === null
            ? ""
            : formatDuration(extraction.duration_seconds),
        calories: extraction.calories_kcal?.toString() ?? "",
        moves: extraction.moves?.toString() ?? "",
        equipment: extraction.equipment ?? "",
        workoutLabel: extraction.workout_label ?? "",
      }));
      setStep("confirm");
    } catch (processError) {
      setError(
        processError instanceof Error
          ? processError.message
          : "Screenshot processing failed.",
      );
      setStep("select");
    }
  };

  const durationSeconds = parseClockValue(form.duration);
  const distanceKm = Number(form.distance);
  const derived = useMemo(() => {
    if (!durationSeconds || !Number.isFinite(distanceKm) || distanceKm <= 0) return null;
    return {
      pace: derivePaceSeconds(distanceKm, durationSeconds),
      speed: deriveAverageSpeed(distanceKm, durationSeconds),
    };
  }, [distanceKm, durationSeconds]);

  const saveRun = async () => {
    if (!draft) return;
    if (!form.runDate || !durationSeconds || !Number.isFinite(distanceKm) || distanceKm <= 0) {
      setError("Add a valid date, distance, and duration before saving.");
      return;
    }

    const calories = form.calories.trim() === "" ? null : Number(form.calories);
    const moves = form.moves.trim() === "" ? null : Number(form.moves);
    if (
      (calories !== null && (!Number.isInteger(calories) || calories < 0)) ||
      (moves !== null && (!Number.isInteger(moves) || moves < 0))
    ) {
      setError("Calories and MOVEs must be positive whole numbers.");
      return;
    }

    setStep("saving");
    setError(null);

    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_date: form.runDate,
          equipment: form.equipment.trim() || null,
          workout_label: form.workoutLabel.trim() || null,
          distance_km: distanceKm,
          duration_seconds: durationSeconds,
          calories_kcal: calories,
          moves,
          image_fingerprint: draft.image_fingerprint,
          extraction_confidence: draft.extraction.confidence,
          extraction_model: draft.extraction_model,
          raw_extraction: draft.extraction,
        }),
      });
      const payload = await readJson<Record<string, never>>(response);
      if (!response.ok) throw new Error(payload.error || "The run could not be saved.");
      reset();
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The run could not be saved.");
      setStep("confirm");
    }
  };

  if (!open) return null;

  const busy = step === "extracting" || step === "saving";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <section
        aria-labelledby="upload-title"
        aria-modal="true"
        className="upload-modal"
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow"><Sparkles size={15} /> Smart import</p>
            <h2 id="upload-title">
              {step === "confirm" || step === "saving" ? "Review your run" : "Add a run"}
            </h2>
          </div>
          <button aria-label="Close" className="icon-button" disabled={busy} onClick={close}>
            <X size={20} />
          </button>
        </div>

        {step === "select" || step === "extracting" ? (
          <div className="upload-select-layout">
            <button
              className={`drop-zone ${file ? "has-file" : ""}`}
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                selectFile(event.dataTransfer.files[0] ?? null);
              }}
              type="button"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Selected run screenshot preview" src={previewUrl} />
              ) : (
                <div className="drop-zone-empty">
                  <span><ImageUp size={26} /></span>
                  <strong>Drop your screenshot here</strong>
                  <p>or choose it from your photo library</p>
                  <small>PNG, JPEG or WebP · up to 12 MB</small>
                </div>
              )}
            </button>
            <input
              ref={fileInput}
              accept="image/png,image/jpeg,image/webp"
              className="visually-hidden"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
              type="file"
            />

            <div className="upload-guidance">
              <h3>For the cleanest import</h3>
              <ul>
                <li><Check size={16} /> Include the four summary values.</li>
                <li><Check size={16} /> Use the original screenshot, uncropped.</li>
                <li><Check size={16} /> Confirm the run date before saving.</li>
              </ul>
              <div className="privacy-note">
                <LockKeyhole size={17} />
                <p><strong>Not stored.</strong> The image is discarded after extraction.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="review-layout">
            <div className="review-preview">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Run screenshot being reviewed" src={previewUrl} />
              ) : null}
              <button className="secondary-button compact" onClick={() => setStep("select")}>
                <RefreshCcw size={16} /> Replace
              </button>
            </div>

            <div className="review-form">
              <div className="confidence-row">
                <span>Extraction confidence</span>
                <strong>{Math.round((draft?.extraction.confidence ?? 0) * 100)}%</strong>
              </div>

              {(draft?.validation_warnings.length ?? 0) > 0 ? (
                <div className="warning-box">
                  <AlertTriangle size={18} />
                  <div>
                    {draft?.validation_warnings.map((warning) => <p key={warning}>{warning}</p>)}
                  </div>
                </div>
              ) : null}

              <div className="form-grid">
                <Field label="Run date" required>
                  <input
                    onChange={(event) => setForm({ ...form, runDate: event.target.value })}
                    type="date"
                    value={form.runDate}
                  />
                </Field>
                <Field label="Distance" suffix="km" required>
                  <input
                    inputMode="decimal"
                    min="0.01"
                    onChange={(event) => setForm({ ...form, distance: event.target.value })}
                    step="0.01"
                    type="number"
                    value={form.distance}
                  />
                </Field>
                <Field label="Duration" hint="MM:SS" required>
                  <input
                    inputMode="numeric"
                    onChange={(event) => setForm({ ...form, duration: event.target.value })}
                    placeholder="38:30"
                    type="text"
                    value={form.duration}
                  />
                </Field>
                <Field label="Calories" suffix="kcal">
                  <input
                    inputMode="numeric"
                    min="0"
                    onChange={(event) => setForm({ ...form, calories: event.target.value })}
                    type="number"
                    value={form.calories}
                  />
                </Field>
                <Field label="MOVEs">
                  <input
                    inputMode="numeric"
                    min="0"
                    onChange={(event) => setForm({ ...form, moves: event.target.value })}
                    type="number"
                    value={form.moves}
                  />
                </Field>
                <Field label="Equipment">
                  <input
                    onChange={(event) => setForm({ ...form, equipment: event.target.value })}
                    type="text"
                    value={form.equipment}
                  />
                </Field>
              </div>

              <Field label="Workout label">
                <input
                  onChange={(event) => setForm({ ...form, workoutLabel: event.target.value })}
                  type="text"
                  value={form.workoutLabel}
                />
              </Field>

              <div className="derived-row">
                <div><span>Calculated pace</span><strong>{derived ? `${formatPace(derived.pace)} /km` : "—"}</strong></div>
                <div><span>Average speed</span><strong>{derived ? `${derived.speed.toFixed(1)} km/h` : "—"}</strong></div>
              </div>
            </div>
          </div>
        )}

        {step === "extracting" ? (
          <div className="processing-overlay" aria-live="polite">
            <LoaderCircle className="spin" size={28} />
            <strong>Reading your run…</strong>
            <p>Finding the summary values and checking they agree.</p>
          </div>
        ) : null}

        {error ? <div className="form-error" role="alert">{error}</div> : null}

        <div className="modal-footer">
          <button className="secondary-button" disabled={busy} onClick={close}>Cancel</button>
          {step === "select" || step === "extracting" ? (
            <button className="primary-button" disabled={!file || busy} onClick={() => void processScreenshot()}>
              {step === "extracting" ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
              Upload
            </button>
          ) : (
            <button className="primary-button" disabled={busy} onClick={() => void saveRun()}>
              {step === "saving" ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}
              Save run
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  children,
  label,
  required,
  suffix,
  hint,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}{hint ? <small>{hint}</small> : null}</span>
      <div className="input-shell">{children}{suffix ? <em>{suffix}</em> : null}</div>
    </label>
  );
}
