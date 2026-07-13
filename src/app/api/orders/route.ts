import { NextRequest, NextResponse } from "next/server";
import { orderCreateSchema } from "@/lib/validators";
import { createOrder, listOrdersForUser } from "@/services/order.service";
import { requireUser } from "@/lib/guards/require-user";
import { getCurrentUser } from "@/lib/get-current-user";
import { handleApiError } from "@/lib/errors";

// Guest checkout is allowed (architecture.md §6), so this endpoint is
// intentionally NOT behind requireUser() — it just attaches userId when a
// session cookie happens to be present.
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = await req.json();
    const input = orderCreateSchema.parse(body);

    const order = await createOrder(input, currentUser?.id ?? null);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

// Own order history — logged-in only (architecture.md §6: guests have no tracking).
export async function GET() {
  try {
    const user = await requireUser();
    const orders = await listOrdersForUser(user.id);
    return NextResponse.json({ orders });
  } catch (err) {
    return handleApiError(err);
  }
}
