import Link from "next/link";
import type { CategoryDto } from "@/types/product";

export function CategoryFilter({
  categories,
  activeSlug,
}: {
  categories: CategoryDto[];
  activeSlug?: string;
}) {
  return (
    <nav className="flex flex-col gap-1 text-sm">
      <Link
        href="/products"
        className={`rounded px-2 py-1 ${!activeSlug ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}
      >
        All products
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/products?category=${c.slug}`}
          className={`rounded px-2 py-1 ${activeSlug === c.slug ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
