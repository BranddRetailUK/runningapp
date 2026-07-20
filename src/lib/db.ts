import { randomUUID } from "node:crypto";

import postgres from "postgres";

import type { CreateRunInput } from "@/lib/run-schema";
import type { RangeKey, RunRecord } from "@/lib/types";
import { deriveAverageSpeed, derivePaceSeconds } from "@/lib/run-metrics";

type DatabaseClient = ReturnType<typeof postgres>;

type RunRow = {
  id: string;
  run_date: string;
  equipment: string | null;
  workout_label: string | null;
  distance_km: string | number;
  duration_seconds: number;
  calories_kcal: number | null;
  pace_seconds_per_km: number;
  average_speed_kmh: string | number;
  moves: number | null;
  screenshot_fingerprint: string;
  extraction_confidence: string | number | null;
  extraction_model: string | null;
  created_at: Date | string;
};

declare global {
  var __runlineSql: DatabaseClient | undefined;
}

let schemaPromise: Promise<void> | null = null;

export class DatabaseConfigurationError extends Error {}
export class DuplicateRunError extends Error {}

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new DatabaseConfigurationError("DATABASE_URL is not configured.");
  return value;
}

export function getSql() {
  if (!globalThis.__runlineSql) {
    globalThis.__runlineSql = postgres(databaseUrl(), {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return globalThis.__runlineSql;
}

export async function ensureSchema() {
  if (!schemaPromise) {
    const sql = getSql();
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS runs (
          id UUID PRIMARY KEY,
          run_date DATE NOT NULL,
          equipment TEXT,
          workout_label TEXT,
          distance_km NUMERIC(9, 3) NOT NULL CHECK (distance_km > 0),
          duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
          calories_kcal INTEGER CHECK (calories_kcal IS NULL OR calories_kcal >= 0),
          pace_seconds_per_km INTEGER NOT NULL CHECK (pace_seconds_per_km > 0),
          average_speed_kmh NUMERIC(7, 2) NOT NULL CHECK (average_speed_kmh > 0),
          moves INTEGER CHECK (moves IS NULL OR moves >= 0),
          screenshot_fingerprint CHAR(64) NOT NULL UNIQUE,
          extraction_confidence NUMERIC(4, 3),
          extraction_model TEXT,
          raw_extraction JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS runs_run_date_idx ON runs (run_date DESC)`;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}

function dateInLondon() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function subtractDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function rangeStart(range: RangeKey) {
  const offsets: Partial<Record<RangeKey, number>> = {
    week: 6,
    month: 29,
    quarter: 83,
    year: 364,
  };
  const offset = offsets[range];
  return offset === undefined ? null : subtractDays(dateInLondon(), offset);
}

function mapRun(row: RunRow): RunRecord {
  return {
    id: row.id,
    run_date: row.run_date,
    equipment: row.equipment,
    workout_label: row.workout_label,
    distance_km: Number(row.distance_km),
    duration_seconds: row.duration_seconds,
    calories_kcal: row.calories_kcal,
    pace_seconds_per_km: row.pace_seconds_per_km,
    average_speed_kmh: Number(row.average_speed_kmh),
    moves: row.moves,
    screenshot_fingerprint: row.screenshot_fingerprint,
    extraction_confidence:
      row.extraction_confidence === null ? null : Number(row.extraction_confidence),
    extraction_model: row.extraction_model,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

const runColumns = `
  id,
  run_date::text AS run_date,
  equipment,
  workout_label,
  distance_km,
  duration_seconds,
  calories_kcal,
  pace_seconds_per_km,
  average_speed_kmh,
  moves,
  screenshot_fingerprint,
  extraction_confidence,
  extraction_model,
  created_at
`;

export async function listRuns(range: RangeKey) {
  await ensureSchema();
  const sql = getSql();
  const start = rangeStart(range);

  const rows = start
    ? await sql.unsafe<RunRow[]>(
        `SELECT ${runColumns} FROM runs WHERE run_date >= $1 ORDER BY run_date ASC, created_at ASC`,
        [start],
      )
    : await sql.unsafe<RunRow[]>(
        `SELECT ${runColumns} FROM runs ORDER BY run_date ASC, created_at ASC`,
      );

  return rows.map(mapRun);
}

export async function createRun(input: CreateRunInput) {
  await ensureSchema();
  const sql = getSql();

  const fingerprintMatches = await sql<{ id: string }[]>`
    SELECT id FROM runs WHERE screenshot_fingerprint = ${input.image_fingerprint} LIMIT 1
  `;
  if (fingerprintMatches.length > 0) {
    throw new DuplicateRunError("This screenshot has already been imported.");
  }

  const likelyMatches = await sql<{ id: string }[]>`
    SELECT id
    FROM runs
    WHERE run_date = ${input.run_date}
      AND ABS(distance_km - ${input.distance_km}) < 0.005
      AND duration_seconds = ${input.duration_seconds}
    LIMIT 1
  `;
  if (likelyMatches.length > 0) {
    throw new DuplicateRunError("A run with the same date, distance, and duration already exists.");
  }

  const pace = derivePaceSeconds(input.distance_km, input.duration_seconds);
  const speed = deriveAverageSpeed(input.distance_km, input.duration_seconds);
  const id = randomUUID();

  try {
    const rows = await sql.unsafe<RunRow[]>(
      `
        INSERT INTO runs (
          id, run_date, equipment, workout_label, distance_km, duration_seconds,
          calories_kcal, pace_seconds_per_km, average_speed_kmh, moves,
          screenshot_fingerprint, extraction_confidence, extraction_model, raw_extraction
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14::jsonb
        )
        RETURNING ${runColumns}
      `,
      [
        id,
        input.run_date,
        input.equipment,
        input.workout_label,
        input.distance_km,
        input.duration_seconds,
        input.calories_kcal,
        pace,
        speed,
        input.moves,
        input.image_fingerprint,
        input.extraction_confidence,
        input.extraction_model,
        JSON.stringify(input.raw_extraction),
      ],
    );

    return mapRun(rows[0]);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      throw new DuplicateRunError("This screenshot has already been imported.");
    }
    throw error;
  }
}

export async function deleteRun(id: string) {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    DELETE FROM runs WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

export async function databaseHealthcheck() {
  await ensureSchema();
  const sql = getSql();
  await sql`SELECT 1`;
}
