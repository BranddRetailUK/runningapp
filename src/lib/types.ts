export const rangeKeys = ["week", "month", "quarter", "year", "all"] as const;

export type RangeKey = (typeof rangeKeys)[number];

export type RunExtraction = {
  is_run_summary: boolean;
  equipment: string | null;
  workout_label: string | null;
  distance_km: number | null;
  duration_seconds: number | null;
  calories_kcal: number | null;
  pace_seconds_per_km: number | null;
  average_speed_kmh: number | null;
  moves: number | null;
  confidence: number;
  warnings: string[];
};

export type RunRecord = {
  id: string;
  run_date: string;
  equipment: string | null;
  workout_label: string | null;
  distance_km: number;
  duration_seconds: number;
  calories_kcal: number | null;
  pace_seconds_per_km: number;
  average_speed_kmh: number;
  moves: number | null;
  screenshot_fingerprint: string;
  extraction_confidence: number | null;
  extraction_model: string | null;
  created_at: string;
};

export type ParsedRunDraft = {
  extraction: RunExtraction;
  image_fingerprint: string;
  extraction_model: string;
  validation_warnings: string[];
};

export type DashboardSummary = {
  runCount: number;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  totalCalories: number;
  totalMoves: number;
  averagePaceSeconds: number;
  averageDistanceKm: number;
};

export type ChartPoint = {
  key: string;
  label: string;
  fullLabel: string;
  distance: number;
  calories: number;
  durationMinutes: number;
  paceSeconds: number | null;
  cumulativeDistance: number;
  runs: number;
};
