import { NextResponse } from "next/server";
import { listClients } from "@/services/user.service";
import { requireAdmin } from "@/lib/guards/require-admin";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    await requireAdmin();
    const clients = await listClients();
    return NextResponse.json({ clients });
  } catch (err) {
    return handleApiError(err);
  }
}
