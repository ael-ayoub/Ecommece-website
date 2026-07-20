import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { getMediaStorage } from "@/media";
import { normalizeStorageKey } from "@/media/storage-key";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Params {
  params: { key: string[] };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const storageKey = normalizeStorageKey(params.key.join("/"));
    const image = await db.productImage.findUnique({
      where: { storageKey },
      select: { mimeType: true },
    });
    if (!image) throw new NotFoundError("Media not found.");
    const file = await getMediaStorage().read(storageKey, image.mimeType);
    if (!file) throw new NotFoundError("Media not found.");

    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
