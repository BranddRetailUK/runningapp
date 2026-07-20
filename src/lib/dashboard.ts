import type {
  ChartPoint,
  DashboardSummary,
  RangeKey,
  RunRecord,
} from "@/lib/types";

function localDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

function bucketKey(run: RunRecord, range: RangeKey) {
  const date = localDate(run.run_date);

  if (range === "quarter") {
    return startOfWeek(date).toISOString().slice(0, 10);
  }

  if (range === "year" || range === "all") {
    return run.run_date.slice(0, 7);
  }

  return run.run_date;
}

function bucketLabels(key: string, range: RangeKey) {
  const isMonth = range === "year" || range === "all";
  const date = isMonth ? new Date(`${key}-15T12:00:00`) : localDate(key);

  const label = new Intl.DateTimeFormat("en-GB", {
    month: isMonth ? "short" : undefined,
    day: isMonth ? undefined : "numeric",
    weekday: range === "week" ? "short" : undefined,
    year: range === "all" ? "2-digit" : undefined,
  }).format(date);

  const fullLabel = new Intl.DateTimeFormat("en-GB", {
    day: isMonth ? undefined : "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return { label, fullLabel };
}

export function summarizeRuns(runs: RunRecord[]): DashboardSummary {
  const totalDistanceKm = runs.reduce((total, run) => total + run.distance_km, 0);
  const totalDurationSeconds = runs.reduce(
    (total, run) => total + run.duration_seconds,
    0,
  );
  const totalCalories = runs.reduce(
    (total, run) => total + (run.calories_kcal ?? 0),
    0,
  );
  const totalMoves = runs.reduce((total, run) => total + (run.moves ?? 0), 0);

  return {
    runCount: runs.length,
    totalDistanceKm,
    totalDurationSeconds,
    totalCalories,
    totalMoves,
    averagePaceSeconds:
      totalDistanceKm > 0 ? Math.round(totalDurationSeconds / totalDistanceKm) : 0,
    averageDistanceKm: runs.length > 0 ? totalDistanceKm / runs.length : 0,
  };
}

export function buildChartData(runs: RunRecord[], range: RangeKey): ChartPoint[] {
  const buckets = new Map<string, Omit<ChartPoint, "label" | "fullLabel">>();

  for (const run of runs) {
    const key = bucketKey(run, range);
    const existing = buckets.get(key) ?? {
      key,
      distance: 0,
      calories: 0,
      durationMinutes: 0,
      paceSeconds: null,
      cumulativeDistance: 0,
      runs: 0,
    };

    existing.distance += run.distance_km;
    existing.calories += run.calories_kcal ?? 0;
    existing.durationMinutes += run.duration_seconds / 60;
    existing.runs += 1;
    existing.paceSeconds = Math.round(
      (existing.durationMinutes * 60) / existing.distance,
    );
    buckets.set(key, existing);
  }

  let cumulativeDistance = 0;
  return Array.from(buckets.values())
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((bucket) => {
      cumulativeDistance += bucket.distance;
      const labels = bucketLabels(bucket.key, range);
      return {
        ...bucket,
        ...labels,
        distance: Number(bucket.distance.toFixed(2)),
        calories: Math.round(bucket.calories),
        durationMinutes: Number(bucket.durationMinutes.toFixed(1)),
        cumulativeDistance: Number(cumulativeDistance.toFixed(2)),
      };
    });
}
