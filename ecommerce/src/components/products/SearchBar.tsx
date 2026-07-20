"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) {
      params.set("q", q.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    const query = params.toString();
    router.push(`/products${query ? `?${query}` : ""}`);
  }

  function clearSearch() {
    setQ("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    const query = params.toString();
    router.push(`/products${query ? `?${query}` : ""}`);
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="rounded-xl border border-stone-200 bg-stone-50 p-3 sm:p-4"
    >
      <label
        htmlFor="product-search"
        className="mb-2 block text-sm font-semibold text-stone-800"
      >
        Search the catalog
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-stone-500"
          />
          <Input
            id="product-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by product or category"
            className="h-12 rounded-lg border-stone-300 bg-white pl-10 pr-11 text-base text-stone-950 placeholder:text-stone-400 focus:border-stone-700 focus:ring-2 focus:ring-stone-700/20"
          />
          {q && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear product search"
              className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 motion-reduce:transition-none"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-stone-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 motion-reduce:transition-none"
        >
          <Search aria-hidden="true" className="size-4" />
          Search
        </button>
      </div>
    </form>
  );
}
