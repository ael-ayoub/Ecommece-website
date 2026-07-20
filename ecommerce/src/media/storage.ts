export interface StoredMediaFile {
  bytes: Buffer;
  mimeType: string;
}

export interface MediaStorage {
  save(storageKey: string, bytes: Buffer): Promise<void>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  read(storageKey: string, mimeType: string): Promise<StoredMediaFile | null>;
  resolvePublicUrl(storageKey: string): string;
}
