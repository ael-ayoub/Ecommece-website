import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards/require-admin";
import { assertSameOrigin } from "@/lib/security/origin";
import { handleApiError, ApiError } from "@/lib/errors";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";
import { getMediaConfig } from "@/media/config";
import { uploadProductImages } from "@/services/product-image.service";

interface Params {
  params: { id: string };
}

export const runtime = "nodejs";

function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof value !== "string" && typeof value.arrayBuffer === "function";
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const config = getMediaConfig();
    enforceRateLimit(
      `product-image-upload:${admin.id}:${requestIp(req)}`,
      config.uploadRateLimitPerMinute,
      60_000,
    );

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    const requestLimit =
      config.maxFileSizeBytes * config.maxImagesPerProduct + 1024 * 1024;
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
      throw new ApiError(411, "A valid Content-Length header is required.");
    }
    if (contentLength > requestLimit) {
      throw new ApiError(413, "The image upload request is too large.");
    }

    const form = await req.formData();
    const files = form.getAll("files").filter(isUploadedFile);
    const altTexts = form
      .getAll("altText")
      .map((value) => (typeof value === "string" ? value : ""));
    const uploads = await Promise.all(
      files.map(async (file, index) => ({
        bytes: Buffer.from(await file.arrayBuffer()),
        claimedMimeType: file.type,
        originalName: file.name,
        altText: altTexts[index] || null,
      })),
    );
    const images = await uploadProductImages(Number(params.id), uploads);
    return NextResponse.json({ images }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
