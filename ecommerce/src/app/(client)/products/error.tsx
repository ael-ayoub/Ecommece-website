"use client";

import { AlertCircle, RotateCw } from "lucide-react";

export default function ProductsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="pb-12 text-stone-950">
      <header className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Shop the collection
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          All Products
        </h1>
      </header>

      <section
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center"
      >
        <AlertCircle
          aria-hidden="true"
          className="mx-auto size-10 text-red-700"
        />
        <h2 className="mt-4 text-xl font-semibold text-stone-950">
          Products could not be loaded
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-700">
          Something interrupted the request. Please try again without losing
          your current page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mx-auto mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 focus-visible:ring-offset-red-50 motion-reduce:transition-none"
        >
          <RotateCw aria-hidden="true" className="size-4" />
          Try again
        </button>
      </section>
    </main>
  );
}
