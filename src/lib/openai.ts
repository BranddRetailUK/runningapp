import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { runExtractionSchema } from "@/lib/run-schema";

const RUN_EXTRACTION_INSTRUCTIONS = `
You extract summary statistics from screenshots of completed treadmill runs.

Return only values that are visibly supported by the screenshot. The expected app is Technogym, but accept equivalent completed-run summaries from other fitness apps.

Rules:
- Ignore the phone status-bar time. It is not the workout duration or workout time.
- Never invent a workout date. Screenshot metadata is not available to you.
- Convert duration to whole seconds.
- Convert pace to whole seconds per kilometre.
- Use kilometres and km/h. If the distance unit is not printed but the screenshot explicitly shows km/h and min/km pace, treat the distance as kilometres.
- Read the prominent summary values, not approximate values from a graph.
- Do not attempt to digitize chart lines.
- If a field is absent or unreadable, return null for that field.
- Set is_run_summary to false when the image is not clearly a completed running workout summary.
- Confidence describes confidence in the extracted summary values from 0 to 1.
- Add concise warnings for cropped, ambiguous, inconsistent, or unreadable values.
`.trim();

export class OpenAIConfigurationError extends Error {}

export async function extractRunScreenshot(bytes: Uint8Array, mimeType: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  const client = new OpenAI({ apiKey });
  const imageData = Buffer.from(bytes).toString("base64");

  const response = await client.responses.parse({
    model,
    reasoning: { effort: "none" },
    store: false,
    instructions: RUN_EXTRACTION_INSTRUCTIONS,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Extract the completed run summary from this screenshot.",
          },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${imageData}`,
            detail: "high",
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(runExtractionSchema, "run_screenshot"),
    },
    max_output_tokens: 800,
  });

  if (!response.output_parsed) {
    throw new Error("The screenshot could not be converted into run statistics.");
  }

  return { extraction: response.output_parsed, model };
}
