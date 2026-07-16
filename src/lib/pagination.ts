export const MAX_PAGE_SIZE = 100;

export function parsePagination(
  pageValue: string | null,
  pageSizeValue: string | null,
  defaultPageSize = 20,
) {
  const page = Math.max(1, Number.parseInt(pageValue ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(pageSizeValue ?? String(defaultPageSize), 10) || defaultPageSize),
  );
  return { page, pageSize };
}

export function paginationMeta(page: number, pageSize: number, totalItems: number) {
  return { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) };
}
