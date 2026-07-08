interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-outline-variant px-stack-lg py-stack-md">
      <p className="text-[13px] text-on-surface-variant">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-[13px] text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-[13px] text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
