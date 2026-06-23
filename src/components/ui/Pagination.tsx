import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, pageCount, total, pageSize, onPage }: PaginationProps) {
  if (pageCount <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-slate-900/[0.06] px-4 py-2.5">
      <span className="text-xs text-slate-400">
        {from}–{to} of {total}
      </span>
      <div className="flex gap-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/** Clamp + slice a list for the current page. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
