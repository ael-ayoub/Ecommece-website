import { ApiError } from "@/lib/errors";
import { getMediaConfig } from "@/media/config";

export interface ValidatedImage {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
}

function pngDimensions(bytes: Buffer) {
  if (
    bytes.length < 45 ||
    bytes.subarray(12, 16).toString("ascii") !== "IHDR" ||
    bytes.subarray(bytes.length - 8, bytes.length - 4).toString("ascii") !==
      "IEND"
  ) {
    return null;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegDimensions(bytes: Buffer) {
  if (
    bytes.length < 12 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[bytes.length - 2] !== 0xff ||
    bytes[bytes.length - 1] !== 0xd9
  ) {
    return null;
  }
  let offset = 2;
  while (offset + 4 < bytes.length - 2) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb].includes(
        marker,
      )
    ) {
      if (length < 7) return null;
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return null;
}

function webpDimensions(bytes: Buffer) {
  if (
    bytes.length < 30 ||
    bytes.subarray(0, 4).toString("ascii") !== "RIFF" ||
    bytes.subarray(8, 12).toString("ascii") !== "WEBP" ||
    bytes.readUInt32LE(4) + 8 !== bytes.length
  ) {
    return null;
  }
  const chunk = bytes.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    const bits = bytes.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (
    chunk === "VP8 " &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
}

export function validateImageFile(
  bytes: Buffer,
  claimedMimeType: string,
): ValidatedImage {
  const config = getMediaConfig();
  if (bytes.length === 0 || bytes.length > config.maxFileSizeBytes) {
    throw new ApiError(
      413,
      `Images must be no larger than ${config.maxFileSizeBytes} bytes.`,
    );
  }

  let detected: ValidatedImage | null = null;
  if (
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    const dimensions = pngDimensions(bytes);
    if (dimensions)
      detected = { mimeType: "image/png", extension: "png", ...dimensions };
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const dimensions = jpegDimensions(bytes);
    if (dimensions)
      detected = { mimeType: "image/jpeg", extension: "jpg", ...dimensions };
  } else if (bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    const dimensions = webpDimensions(bytes);
    if (dimensions)
      detected = { mimeType: "image/webp", extension: "webp", ...dimensions };
  }

  if (!detected) {
    throw new ApiError(
      400,
      "The uploaded file is not a valid supported image.",
    );
  }
  if (
    claimedMimeType.toLowerCase() !== detected.mimeType ||
    !config.allowedMimeTypes.has(detected.mimeType)
  ) {
    throw new ApiError(
      400,
      "The file content and declared image type do not match or are not allowed.",
    );
  }
  if (
    detected.width <= 0 ||
    detected.height <= 0 ||
    detected.width * detected.height > config.maxImagePixels
  ) {
    throw new ApiError(400, "The image dimensions are invalid or too large.");
  }
  return detected;
}
