import { requireAuthorization, isSameOrigin } from "@/lib/auth";
import {
  createRun,
  DatabaseConfigurationError,
  DuplicateRunError,
  listRuns,
} from "@/lib/db";
import { createRunSchema, rangeSchema } from "@/lib/run-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: string, status: number) {
  return Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const unauthorized = requireAuthorization(request);
  if (unauthorized) return unauthorized;

  const value = new URL(request.url).searchParams.get("range") ?? "month";
  const parsedRange = rangeSchema.safeParse(value);
  if (!parsedRange.success) return errorResponse("Invalid time range.", 400);

  try {
    const runs = await listRuns(parsedRange.data);
    return Response.json(
      { runs },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return errorResponse(error.message, 503);
    }
    return errorResponse("Run data is temporarily unavailable.", 500);
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAuthorization(request);
  if (unauthorized) return unauthorized;

  if (!isSameOrigin(request)) {
    return errorResponse("Cross-origin requests are not allowed.", 403);
  }

  try {
    const body: unknown = await request.json();
    const input = createRunSchema.safeParse(body);
    if (!input.success) {
      return errorResponse("Review the run values and try again.", 400);
    }

    const run = await createRun(input.data);
    return Response.json(
      { run },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DuplicateRunError) {
      return errorResponse(error.message, 409);
    }
    if (error instanceof DatabaseConfigurationError) {
      return errorResponse(error.message, 503);
    }
    return errorResponse("The run could not be saved.", 500);
  }
}
