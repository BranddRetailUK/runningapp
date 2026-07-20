import { requireAuthorization, isSameOrigin } from "@/lib/auth";
import { fingerprintImage, maxUploadBytes, validateScreenshotFile } from "@/lib/image";
import {
  extractRunScreenshot,
  OpenAIConfigurationError,
} from "@/lib/openai";
import { validateRunExtraction } from "@/lib/run-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(error: string, status: number) {
  return Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const unauthorized = requireAuthorization(request);
  if (unauthorized) return unauthorized;

  if (!isSameOrigin(request)) {
    return errorResponse("Cross-origin uploads are not allowed.", 403);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxUploadBytes() + 1_000_000) {
    return errorResponse("The upload is too large.", 413);
  }

  try {
    const formData = await request.formData();
    const screenshot = formData.get("screenshot");

    if (!(screenshot instanceof File)) {
      return errorResponse("Choose a run screenshot to continue.", 400);
    }

    const validationError = validateScreenshotFile(screenshot);
    if (validationError) return errorResponse(validationError, 400);

    const bytes = new Uint8Array(await screenshot.arrayBuffer());
    const imageFingerprint = fingerprintImage(bytes);
    const { extraction, model } = await extractRunScreenshot(bytes, screenshot.type);
    const validationWarnings = validateRunExtraction(extraction);

    return Response.json(
      {
        draft: {
          extraction,
          image_fingerprint: imageFingerprint,
          extraction_model: model,
          validation_warnings: validationWarnings,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof OpenAIConfigurationError) {
      return errorResponse(error.message, 503);
    }

    return errorResponse(
      "The screenshot could not be processed. Try a clear, uncropped image.",
      422,
    );
  }
}
