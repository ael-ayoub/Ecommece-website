export default function ProductDetailLoading() {
  return (
    <main
      aria-label="Loading Product"
      aria-busy="true"
      className="animate-pulse pb-12 motion-reduce:animate-none"
    >
      <div className="h-5 w-64 rounded bg-stone-200" />
      <div className="mt-7 grid gap-10 lg:grid-cols-2">
        <div className="aspect-[4/5] rounded-2xl bg-stone-200" />
        <div>
          <div className="h-3 w-24 rounded bg-stone-200" />
          <div className="mt-4 h-10 w-4/5 rounded bg-stone-200" />
          <div className="mt-8 h-96 rounded-2xl bg-stone-100" />
        </div>
      </div>
      <span className="sr-only">Loading Product details…</span>
    </main>
  );
}
