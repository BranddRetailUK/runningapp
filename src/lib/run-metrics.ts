import type { RunExtraction } from "@/lib/types";

export function derivePaceSeconds(distanceKm: number, durationSeconds: number) {
  if (distanceKm <= 0 || durationSeconds <= 0) return 0;
  return Math.round(durationSeconds / distanceKm);
}

export function deriveAverageSpeed(distanceKm: number, durationSeconds: number) {
  if (distanceKm <= 0 || durationSeconds <= 0) return 0;
  return Number(((distanceKm * 3_600) / durationSeconds).toFixed(2));
}

export function parseClockValue(value: string) {
  const parts = value
    .trim()
    .split(":")
    .map((part) => Number(part));

  if (
    (parts.length !== 2 && parts.length !== 3) ||
    parts.some((part) => !Number.isInteger(part) || part < 0)
  ) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (seconds > 59) return null;
    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = parts;
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3_600 + minutes * 60 + seconds;
}

export function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatPace(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function validateRunExtraction(extraction: RunExtraction) {
  const warnings = [...extraction.warnings];

  if (!extraction.is_run_summary) {
    warnings.push("This image does not appear to be a completed run summary.");
    return warnings;
  }

  if (extraction.distance_km === null) {
    warnings.push("Distance could not be read from the screenshot.");
  }

  if (extraction.duration_seconds === null) {
    warnings.push("Duration could not be read from the screenshot.");
  }

  if (extraction.confidence < 0.75) {
    warnings.push("Extraction confidence is low. Review every value before saving.");
  }

  if (extraction.distance_km && extraction.duration_seconds) {
    const derivedPace = derivePaceSeconds(
      extraction.distance_km,
      extraction.duration_seconds,
    );
    const derivedSpeed = deriveAverageSpeed(
      extraction.distance_km,
      extraction.duration_seconds,
    );

    if (
      extraction.pace_seconds_per_km !== null &&
      Math.abs(extraction.pace_seconds_per_km - derivedPace) > 12
    ) {
      warnings.push("The displayed pace does not closely match distance and duration.");
    }

    if (
      extraction.average_speed_kmh !== null &&
      Math.abs(extraction.average_speed_kmh - derivedSpeed) > 0.4
    ) {
      warnings.push("The displayed speed does not closely match distance and duration.");
    }
  }

  return Array.from(new Set(warnings));
}
