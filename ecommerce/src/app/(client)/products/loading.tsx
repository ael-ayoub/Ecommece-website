function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="aspect-square bg-stone-200" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-20 rounded bg-stone-200" />
        <div className="h-5 w-4/5 rounded bg-stone-200" />
        <div className="h-6 w-2/5 rounded bg-stone-200" />
        <div className="h-11 w-full rounded-lg bg-stone-200" />
      </div>
    </div>
  );
}

export default function ProductsLoading() {
  return (
    <main
      aria-label="Loading products"
      aria-busy="true"
      className="animate-pulse pb-12 text-stone-950 motion-reduce:animate-none"
    >
      <div className="mb-8 space-y-3">
        <div className="h-3 w-32 rounded bg-stone-200" />
        <div className="h-10 w-56 rounded bg-stone-200" />
        <div className="h-5 w-full max-w-lg rounded bg-stone-200" />
      </div>
      <div className="h-24 rounded-xl border border-stone-200 bg-stone-100" />
      <div className="mt-5 flex gap-2 overflow-hidden">
        {[96, 120, 104, 136].map((width) => (
          <div
            key={width}
            style={{ width }}
            className="h-11 shrink-0 rounded-full bg-stone-200"
          />
        ))}
      </div>
      <div className="mt-8 border-b border-stone-200 pb-4">
        <div className="h-6 w-40 rounded bg-stone-200" />
        <div className="mt-2 h-4 w-24 rounded bg-stone-200" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
      <span className="sr-only">Loading products…</span>
    </main>
  );
}
