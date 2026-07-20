import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  getMediaConfig,
  resetMediaConfigForTests,
} from "../../src/media/config";
import { validateImageFile } from "../../src/media/image-file";
import { LocalMediaStorage } from "../../src/media/local-media-storage";
import {
  normalizeStorageKey,
  safeOriginalName,
} from "../../src/media/storage-key";
import { selectDisplayImage } from "../../src/services/product-image.service";

function png(width = 2, height = 3) {
  const bytes = Buffer.alloc(45);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.writeUInt32BE(0, 33);
  bytes.write("IEND", 37, "ascii");
  return bytes;
}

function jpeg(width = 2, height = 3) {
  const bytes = Buffer.alloc(17);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xc0;
  bytes.writeUInt16BE(11, 4);
  bytes[6] = 8;
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  bytes[15] = 0xff;
  bytes[16] = 0xd9;
  return bytes;
}

function webp(width = 2, height = 3) {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
}

test("image validation enforces signatures, MIME, dimensions, and size", () => {
  process.env.MEDIA_MAX_FILE_SIZE_BYTES = "100";
  process.env.MEDIA_MAX_IMAGE_PIXELS = "100";
  process.env.MEDIA_ALLOWED_MIME_TYPES = "image/jpeg,image/png,image/webp";
  resetMediaConfigForTests();

  const valid = validateImageFile(png(), "image/png");
  assert.deepEqual(
    { mimeType: valid.mimeType, width: valid.width, height: valid.height },
    { mimeType: "image/png", width: 2, height: 3 },
  );
  assert.equal(validateImageFile(jpeg(), "image/jpeg").mimeType, "image/jpeg");
  assert.equal(validateImageFile(webp(), "image/webp").mimeType, "image/webp");
  assert.throws(() => validateImageFile(png(), "image/jpeg"));
  assert.throws(() =>
    validateImageFile(Buffer.from("not an image"), "image/png"),
  );
  assert.throws(() => validateImageFile(png(20, 20), "image/png"));
  assert.throws(() => validateImageFile(Buffer.alloc(101), "image/png"));
});

test("storage keys and original names cannot traverse paths", () => {
  assert.equal(
    normalizeStorageKey("products/12/image.webp"),
    "products/12/image.webp",
  );
  for (const value of [
    "../secret",
    "products/../secret",
    "%2e%2e/secret",
    "/absolute/file",
    "products\\secret",
  ]) {
    assert.throws(() => normalizeStorageKey(value));
  }
  assert.equal(
    safeOriginalName("../../unsafe<script>.png"),
    "unsafe_script_.png",
  );
});

test("local storage stays inside its root and resolves portable public URLs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "media-storage-unit-"));
  process.env.MEDIA_LOCAL_ROOT = root;
  process.env.MEDIA_PUBLIC_PATH = "/media";
  process.env.MEDIA_PUBLIC_BASE_URL = "http://localhost:3000";
  process.env.MEDIA_MAX_FILE_SIZE_BYTES = "100";
  process.env.MEDIA_MAX_IMAGE_PIXELS = "100";
  resetMediaConfigForTests();
  const storage = new LocalMediaStorage();
  const key = "products/1/generated.png";
  await storage.save(key, png());
  assert.equal(await storage.exists(key), true);
  assert.equal(
    (await storage.read(key, "image/png"))?.bytes.equals(png()),
    true,
  );
  assert.equal(
    storage.resolvePublicUrl(key),
    "http://localhost:3000/media/products/1/generated.png",
  );
  await assert.rejects(() => storage.save("../escape.png", png()));
  await storage.delete(key);
  assert.equal(await storage.exists(key), false);
  await rm(root, { recursive: true, force: true });
});

test("display image selection prefers primary then lowest position", () => {
  assert.equal(
    selectDisplayImage([
      { id: 1, position: 0, isPrimary: false },
      { id: 2, position: 1, isPrimary: true },
    ])?.id,
    2,
  );
  assert.equal(
    selectDisplayImage([
      { id: 2, position: 3, isPrimary: false },
      { id: 1, position: 1, isPrimary: false },
    ])?.id,
    1,
  );
  assert.equal(selectDisplayImage([]), null);
  assert.equal(getMediaConfig().driver, "local");
});
