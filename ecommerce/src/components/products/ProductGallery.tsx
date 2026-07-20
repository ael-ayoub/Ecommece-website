"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { ProductImage } from "./ProductImage";

export interface GalleryImage {
  id: number;
  url: string;
  altText: string | null;
}

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [activeId, setActiveId] = useState(images[0]?.id ?? null);
  const active = images.find((image) => image.id === activeId) ?? images[0];

  if (!active) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-muted)] text-[var(--client-text-secondary)]">
        <div className="flex flex-col items-center gap-3 text-sm">
          <ImageIcon aria-hidden="true" className="size-8" />
          <span>Image unavailable</span>
        </div>
      </div>
    );
  }

  const activeIndex = images.findIndex((image) => image.id === active.id);
  const activeAlt = active.altText || `${productName} image ${activeIndex + 1}`;

  return (
    <section aria-label={`${productName} image gallery`}>
      <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-muted)] shadow-[var(--client-shadow-sm)]">
        <ProductImage
          key={active.id}
          src={active.url}
          alt={activeAlt}
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div
          className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5"
          aria-label="Choose Product image"
        >
          {images.map((image, index) => {
            const selected = image.id === active.id;
            return (
              <button
                key={image.id}
                type="button"
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-pressed={selected}
                onClick={() => setActiveId(image.id)}
                className={`aspect-square overflow-hidden rounded-xl border-2 bg-[var(--client-surface-muted)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)] focus-visible:ring-offset-2 motion-reduce:transition-none ${
                  selected
                    ? "border-[var(--client-text-primary)]"
                    : "border-transparent hover:border-[var(--client-border-strong)]"
                }`}
              >
                <ProductImage
                  src={image.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
