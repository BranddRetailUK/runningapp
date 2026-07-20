import { databaseHealthcheck } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await databaseHealthcheck();
    return Response.json(
      { status: "ok", database: "connected" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable", database: "disconnected" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
