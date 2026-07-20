import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from(
    new Set(
      [1, page - 1, page, page + 1, totalPages].filter(
        (value) => value >= 1 && value <= totalPages,
      ),
    ),
  ).sort((a, b) => a - b);

  return (
    <nav
      aria-label="Product results pages"
      className="mt-12 flex flex-wrap items-center justify-center gap-2 text-sm"
    >
      {page === 1 ? (
        <span className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-stone-400">
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </span>
      ) : (
        <Link
          href={buildHref(page - 1)}
          className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 motion-reduce:transition-none"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </Link>
      )}

      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNumber, index) => {
          const previous = pageNumbers[index - 1];
          return (
            <span key={pageNumber} className="contents">
              {previous && pageNumber - previous > 1 && (
                <span aria-hidden="true" className="px-1 text-stone-400">
                  …
                </span>
              )}
              <Link
                href={buildHref(pageNumber)}
                aria-current={pageNumber === page ? "page" : undefined}
                aria-label={`Page ${pageNumber}`}
                className={`grid size-11 place-items-center rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 motion-reduce:transition-none ${
                  pageNumber === page
                    ? "bg-stone-900 text-white"
                    : "text-stone-700 hover:bg-stone-100 hover:text-stone-950"
                }`}
              >
                {pageNumber}
              </Link>
            </span>
          );
        })}
      </div>

      {page === totalPages ? (
        <span className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-stone-400">
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      ) : (
        <Link
          href={buildHref(page + 1)}
          className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 motion-reduce:transition-none"
        >
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </nav>
  );
}
