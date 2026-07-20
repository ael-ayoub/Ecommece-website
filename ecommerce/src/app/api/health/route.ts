import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMediaConfig } from "@/media/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    getMediaConfig();
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ready",
      database: "connected",
      timestamp,
      version:
        process.env.APP_VERSION ?? process.env.npm_package_version ?? "unknown",
    });
  } catch {
    return NextResponse.json(
      { status: "unavailable", database: "unavailable", timestamp },
      { status: 503 },
    );
  }
}
