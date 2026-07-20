import { requireAuthorization, isSameOrigin } from "@/lib/auth";
import { DatabaseConfigurationError, deleteRun } from "@/lib/db";
import { runIdSchema } from "@/lib/run-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAuthorization(request);
  if (unauthorized) return unauthorized;

  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const { id } = await context.params;
  const parsedId = runIdSchema.safeParse(id);
  if (!parsedId.success) {
    return Response.json({ error: "Invalid run identifier." }, { status: 400 });
  }

  try {
    const deleted = await deleteRun(parsedId.data);
    if (!deleted) {
      return Response.json({ error: "Run not found." }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return Response.json({ error: "The run could not be deleted." }, { status: 500 });
  }
}
