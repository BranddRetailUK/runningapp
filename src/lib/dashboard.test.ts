import { describe, expect, it } from "vitest";

import { buildChartData, summarizeRuns } from "@/lib/dashboard";
import type { RunRecord } from "@/lib/types";

function run(overrides: Partial<RunRecord>): RunRecord {
  return {
    id: crypto.randomUUID(),
    run_date: "2026-07-19",
    equipment: "Run Excite Live",
    workout_label: null,
    distance_km: 5,
    duration_seconds: 1800,
    calories_kcal: 500,
    pace_seconds_per_km: 360,
    average_speed_kmh: 10,
    moves: 800,
    screenshot_fingerprint: "a".repeat(64),
    extraction_confidence: 0.98,
    extraction_model: "test",
    created_at: "2026-07-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("dashboard aggregation", () => {
  const runs = [
    run({ run_date: "2026-07-19" }),
    run({ run_date: "2026-07-20", distance_km: 7, duration_seconds: 2520, calories_kcal: 650 }),
  ];

  it("summarises the selected range", () => {
    expect(summarizeRuns(runs)).toMatchObject({
      runCount: 2,
      totalDistanceKm: 12,
      totalDurationSeconds: 4320,
      totalCalories: 1150,
      averagePaceSeconds: 360,
    });
  });

  it("builds chronological cumulative chart points", () => {
    const points = buildChartData(runs, "month");
    expect(points).toHaveLength(2);
    expect(points.map((point) => point.cumulativeDistance)).toEqual([5, 12]);
    expect(points[1].paceSeconds).toBe(360);
  });
});
