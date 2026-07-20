import Link from "next/link";
import type { CategoryDto } from "@/types/product";

export function CategoryFilter({
  categories,
  activeSlug,
  searchQuery,
}: {
  categories: CategoryDto[];
  activeSlug?: string;
  searchQuery?: string;
}) {
  function buildHref(categorySlug?: string) {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (searchQuery) params.set("q", searchQuery);
    const query = params.toString();
    return `/products${query ? `?${query}` : ""}`;
  }

  const baseClass =
    "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)] focus-visible:ring-offset-2 motion-reduce:transition-none";

  return (
    <nav aria-label="Product categories">
      <p className="mb-2 text-sm font-semibold text-stone-800">Categories</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        <Link
          href={buildHref()}
          aria-current={!activeSlug ? "page" : undefined}
          className={`${baseClass} ${
            !activeSlug
              ? "border-[var(--client-text-primary)] bg-[var(--client-text-primary)] text-white"
              : "border-[var(--client-border-subtle)] bg-[var(--client-surface)] text-[var(--client-text-secondary)] hover:border-[var(--client-border-strong)] hover:bg-[var(--client-surface-muted)]"
          }`}
        >
          All Products
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={buildHref(c.slug)}
            aria-current={activeSlug === c.slug ? "page" : undefined}
            className={`${baseClass} ${
              activeSlug === c.slug
                ? "border-[var(--client-text-primary)] bg-[var(--client-text-primary)] text-white"
                : "border-[var(--client-border-subtle)] bg-[var(--client-surface)] text-[var(--client-text-secondary)] hover:border-[var(--client-border-strong)] hover:bg-[var(--client-surface-muted)]"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
