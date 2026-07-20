"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ArrowDown, ArrowUp, ImageIcon } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { ProductImageDto } from "@/types/product";

interface Props {
  productId?: number;
  images: ProductImageDto[];
  setImages: Dispatch<SetStateAction<ProductImageDto[]>>;
  pendingFiles: File[];
  setPendingFiles: Dispatch<SetStateAction<File[]>>;
  maxFileSizeBytes: number;
  maxImages: number;
  disabled: boolean;
}

function PendingPreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-32 w-full object-cover" />
  ) : (
    <div className="grid h-32 place-items-center bg-gray-100">
      <ImageIcon aria-hidden="true" />
    </div>
  );
}

export function ProductImageManager({
  productId,
  images,
  setImages,
  pendingFiles,
  setPendingFiles,
  maxFileSizeBytes,
  maxImages,
  disabled,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busyImageId, setBusyImageId] = useState<number | null>(null);

  function selectFiles(files: FileList | null) {
    setError(null);
    if (!files) return;
    const selected = Array.from(files);
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    const invalid = selected.find(
      (file) => !allowed.has(file.type) || file.size > maxFileSizeBytes,
    );
    if (invalid) {
      setError(
        `Use JPEG, PNG, or WebP images no larger than ${maxFileSizeBytes} bytes.`,
      );
      return;
    }
    if (images.length + pendingFiles.length + selected.length > maxImages) {
      setError(`A Product may have at most ${maxImages} images.`);
      return;
    }
    setPendingFiles((current) => [...current, ...selected]);
  }

  function movePending(index: number, direction: -1 | 1) {
    setPendingFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function updateImage(
    imageId: number,
    input: { altText?: string | null; isPrimary?: boolean },
  ) {
    if (!productId) return;
    setBusyImageId(imageId);
    setError(null);
    try {
      const response = await apiFetch<{ image: ProductImageDto }>(
        `/api/admin/products/${productId}/images/${imageId}`,
        { method: "PATCH", body: JSON.stringify(input) },
      );
      setImages((current) =>
        current.map((image) =>
          image.id === imageId
            ? response.image
            : input.isPrimary
              ? { ...image, isPrimary: false }
              : image,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to update image.",
      );
    } finally {
      setBusyImageId(null);
    }
  }

  async function reorderExisting(index: number, direction: -1 | 1) {
    if (!productId) return;
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const ordered = [...images];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setBusyImageId(images[index].id);
    setError(null);
    try {
      const response = await apiFetch<{ images: ProductImageDto[] }>(
        `/api/admin/products/${productId}/images/reorder`,
        {
          method: "PATCH",
          body: JSON.stringify({ imageIds: ordered.map((image) => image.id) }),
        },
      );
      setImages(response.images);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to reorder images.",
      );
    } finally {
      setBusyImageId(null);
    }
  }

  async function removeExisting(image: ProductImageDto) {
    if (
      !productId ||
      !window.confirm("Remove this Product image? This cannot be undone.")
    )
      return;
    setBusyImageId(image.id);
    setError(null);
    try {
      await apiFetch(`/api/admin/products/${productId}/images/${image.id}`, {
        method: "DELETE",
      });
      setImages((current) => {
        const remaining = current.filter((item) => item.id !== image.id);
        return remaining.map((item, position) => ({
          ...item,
          position,
          isPrimary: image.isPrimary && position === 0 ? true : item.isPrimary,
        }));
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to remove image.",
      );
    } finally {
      setBusyImageId(null);
    }
  }

  return (
    <section className="rounded border p-4">
      <h2 className="font-semibold">Product images</h2>
      <p className="mt-1 text-xs text-gray-500">
        JPEG, PNG, or WebP. Up to {maxImages} images, ordered left to right. The
        primary image appears in Product listings.
      </p>
      <label className="mt-4 block text-sm font-medium">
        Select Product images
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled}
          onChange={(event) => {
            selectFiles(event.target.files);
            event.currentTarget.value = "";
          }}
          className="mt-1 block w-full rounded border p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-white"
        />
      </label>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {images.length === 0 && pendingFiles.length === 0 ? (
        <p className="mt-4 rounded bg-gray-50 p-4 text-sm text-gray-500">
          No images selected. The storefront will use its image placeholder.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <article key={image.id} className="overflow-hidden rounded border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.altText || "Product image"}
                className="h-32 w-full bg-gray-100 object-cover"
              />
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    {image.isPrimary ? "Primary image" : `Image ${index + 1}`}
                  </span>
                  <div>
                    <button
                      type="button"
                      aria-label={`Move image ${index + 1} earlier`}
                      disabled={disabled || index === 0}
                      onClick={() => reorderExisting(index, -1)}
                      className="rounded p-2 disabled:opacity-40"
                    >
                      <ArrowUp aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move image ${index + 1} later`}
                      disabled={disabled || index === images.length - 1}
                      onClick={() => reorderExisting(index, 1)}
                      className="rounded p-2 disabled:opacity-40"
                    >
                      <ArrowDown aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </div>
                <label className="block text-xs">
                  Alternative text
                  <input
                    value={image.altText ?? ""}
                    maxLength={300}
                    onChange={(event) =>
                      setImages((current) =>
                        current.map((item) =>
                          item.id === image.id
                            ? { ...item, altText: event.target.value }
                            : item,
                        ),
                      )
                    }
                    onBlur={() =>
                      updateImage(image.id, { altText: image.altText })
                    }
                    className="mt-1 block w-full rounded border px-2 py-2"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {!image.isPrimary && (
                    <button
                      type="button"
                      disabled={disabled || busyImageId === image.id}
                      onClick={() => updateImage(image.id, { isPrimary: true })}
                      className="text-xs font-medium underline"
                    >
                      Make primary
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={disabled || busyImageId === image.id}
                    onClick={() => removeExisting(image)}
                    className="text-xs font-medium text-red-700 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}

          {pendingFiles.map((file, index) => (
            <article
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="overflow-hidden rounded border border-dashed"
            >
              <PendingPreview file={file} />
              <div className="space-y-2 p-3">
                <p className="truncate text-xs font-medium" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  Uploads when Product is saved
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move selected image ${index + 1} earlier`}
                    disabled={disabled || index === 0}
                    onClick={() => movePending(index, -1)}
                    className="rounded p-2 disabled:opacity-40"
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move selected image ${index + 1} later`}
                    disabled={disabled || index === pendingFiles.length - 1}
                    onClick={() => movePending(index, 1)}
                    className="rounded p-2 disabled:opacity-40"
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setPendingFiles((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="ml-auto text-xs text-red-700 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
