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
);

CREATE INDEX IF NOT EXISTS runs_run_date_idx ON runs (run_date DESC);
