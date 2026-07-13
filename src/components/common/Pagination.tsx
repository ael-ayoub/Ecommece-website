import Link from "next/link";

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

  return (
    <div className="mt-8 flex items-center justify-center gap-2 text-sm">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`rounded px-3 py-1 ${page === 1 ? "pointer-events-none text-gray-300" : "hover:bg-gray-100"}`}
      >
        ‹ Prev
      </Link>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`rounded px-3 py-1 ${p === page ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}
        >
          {p}
        </Link>
      ))}
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={`rounded px-3 py-1 ${page === totalPages ? "pointer-events-none text-gray-300" : "hover:bg-gray-100"}`}
      >
        Next ›
      </Link>
    </div>
  );
}
