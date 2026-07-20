"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";

export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-100 text-sm text-gray-500">
        <ImageIcon aria-hidden="true" className="size-6" />
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      width={800}
      height={800}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
