import { describe, expect, it } from "vitest";

import {
  deriveAverageSpeed,
  derivePaceSeconds,
  formatDuration,
  parseClockValue,
  validateRunExtraction,
} from "@/lib/run-metrics";

describe("run metrics", () => {
  it("parses treadmill duration values", () => {
    expect(parseClockValue("38:30")).toBe(2310);
    expect(parseClockValue("1:02:03")).toBe(3723);
    expect(parseClockValue("10:75")).toBeNull();
  });

  it("derives pace and speed from the sample screenshot", () => {
    expect(derivePaceSeconds(5.99, 2310)).toBe(386);
    expect(deriveAverageSpeed(5.99, 2310)).toBe(9.34);
    expect(formatDuration(2310)).toBe("38:30");
  });

  it("accepts internally consistent extracted values", () => {
    const warnings = validateRunExtraction({
      is_run_summary: true,
      equipment: "Run Excite Live",
      workout_label: "GOAL exercise in distance",
      distance_km: 5.99,
      duration_seconds: 2310,
      calories_kcal: 636,
      pace_seconds_per_km: 385,
      average_speed_kmh: 9.3,
      moves: 932,
      confidence: 0.98,
      warnings: [],
    });

    expect(warnings).toEqual([]);
  });
});
