import Link from "next/link";

type PaginationNavProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function PaginationNav({ currentPage, totalPages, buildHref }: PaginationNavProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = Array.from(
    new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter((pageValue) => pageValue >= 1 && pageValue <= totalPages)),
  ).sort((left, right) => left - right);

  const pageItems: Array<number | "ellipsis"> = [];
  visiblePages.forEach((pageValue, index) => {
    const previous = visiblePages[index - 1];
    if (index > 0 && previous !== undefined && pageValue - previous > 1) {
      pageItems.push("ellipsis");
    }
    pageItems.push(pageValue);
  });

  return (
    <div className="flex items-center gap-2">
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="rounded-lg border border-yellow-400/70 px-3 py-1.5 font-medium text-yellow-100 transition hover:bg-red-800"
        >
          Previous
        </Link>
      ) : null}

      {pageItems.map((item, index) => {
        if (item === "ellipsis") {
          return (
            <span key={`ellipsis-${index}`} className="px-1 text-yellow-200/70">
              ...
            </span>
          );
        }

        const isActive = item === currentPage;

        return (
          <Link
            key={`page-${item}`}
            href={buildHref(item)}
            className={
              isActive
                ? "rounded-lg bg-yellow-400 px-3 py-1.5 font-semibold text-red-950"
                : "rounded-lg border border-yellow-400/70 px-3 py-1.5 font-medium text-yellow-100 transition hover:bg-red-800"
            }
          >
            {item}
          </Link>
        );
      })}

      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="rounded-lg border border-yellow-400/70 px-3 py-1.5 font-medium text-yellow-100 transition hover:bg-red-800"
        >
          Next
        </Link>
      ) : null}
    </div>
  );
}
