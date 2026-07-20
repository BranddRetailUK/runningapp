import { z } from "zod";

import { rangeKeys } from "@/lib/types";

export const runExtractionSchema = z
  .object({
    is_run_summary: z.boolean(),
    equipment: z.string().max(120).nullable(),
    workout_label: z.string().max(160).nullable(),
    distance_km: z.number().positive().max(500).nullable(),
    duration_seconds: z.number().int().positive().max(172_800).nullable(),
    calories_kcal: z.number().int().nonnegative().max(20_000).nullable(),
    pace_seconds_per_km: z.number().int().positive().max(7_200).nullable(),
    average_speed_kmh: z.number().positive().max(100).nullable(),
    moves: z.number().int().nonnegative().max(1_000_000).nullable(),
    confidence: z.number().min(0).max(1),
    warnings: z.array(z.string().max(240)).max(8),
  })
  .strict();

export const createRunSchema = z
  .object({
    run_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    equipment: z.string().trim().max(120).nullable(),
    workout_label: z.string().trim().max(160).nullable(),
    distance_km: z.number().positive().max(500),
    duration_seconds: z.number().int().positive().max(172_800),
    calories_kcal: z.number().int().nonnegative().max(20_000).nullable(),
    moves: z.number().int().nonnegative().max(1_000_000).nullable(),
    image_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    extraction_confidence: z.number().min(0).max(1).nullable(),
    extraction_model: z.string().max(100).nullable(),
    raw_extraction: runExtractionSchema,
  })
  .strict();

export const rangeSchema = z.enum(rangeKeys);
export const runIdSchema = z.string().uuid();

export type CreateRunInput = z.infer<typeof createRunSchema>;
