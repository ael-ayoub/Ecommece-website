import path from "node:path";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { MediaStorage, StoredMediaFile } from "@/media/storage";
import { getMediaConfig } from "@/media/config";
import { normalizeStorageKey } from "@/media/storage-key";

export class LocalMediaStorage implements MediaStorage {
  private readonly root = path.resolve(getMediaConfig().localRoot);

  private resolve(storageKey: string) {
    const normalized = normalizeStorageKey(storageKey);
    const resolved = path.resolve(this.root, ...normalized.split("/"));
    if (
      resolved === this.root ||
      !resolved.startsWith(`${this.root}${path.sep}`)
    ) {
      throw new Error("Storage key escapes the configured media root.");
    }
    return resolved;
  }

  async save(storageKey: string, bytes: Buffer) {
    const destination = this.resolve(storageKey);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o750 });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, bytes, { flag: "wx", mode: 0o640 });
      await rename(temporary, destination);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async delete(storageKey: string) {
    await rm(this.resolve(storageKey), { force: true });
  }

  async exists(storageKey: string) {
    try {
      const details = await stat(this.resolve(storageKey));
      return details.isFile();
    } catch {
      return false;
    }
  }

  async read(
    storageKey: string,
    mimeType: string,
  ): Promise<StoredMediaFile | null> {
    try {
      const resolved = this.resolve(storageKey);
      const details = await stat(resolved);
      if (!details.isFile()) return null;
      return { bytes: await readFile(resolved), mimeType };
    } catch {
      return null;
    }
  }

  resolvePublicUrl(storageKey: string) {
    const config = getMediaConfig();
    const encodedKey = normalizeStorageKey(storageKey)
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    return `${config.publicBaseUrl}${config.publicPath}/${encodedKey}`;
  }
}
