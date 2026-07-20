import type { MediaStorage } from "@/media/storage";
import { getMediaConfig } from "@/media/config";
import { LocalMediaStorage } from "@/media/local-media-storage";

let storage: MediaStorage | undefined;

export function getMediaStorage(): MediaStorage {
  if (storage) return storage;
  const config = getMediaConfig();
  if (config.driver === "local") {
    storage = new LocalMediaStorage();
    return storage;
  }
  throw new Error("Configured media storage driver is unavailable.");
}

export function resetMediaStorageForTests() {
  storage = undefined;
}

export function setMediaStorageForTests(value: MediaStorage) {
  storage = value;
}
