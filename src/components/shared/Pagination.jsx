/* eslint-disable react/prop-types */

/**
 * Reusable Pagination component.
 *
 * Props:
 *   page          number   — current page (1-based)
 *   pageSize      number   — rows per page
 *   total         number   — total record count
 *   onPageChange  fn(page) — called when page changes
 *   onSizeChange  fn(size) — called when page size changes (optional)
 *   pageSizes     number[] — available sizes (default [10,25,50])
 *   className     string   — extra wrapper classes
 */
const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onSizeChange,
  pageSizes = [10, 25, 50],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Build visible page numbers: always show first, last, current ±1, with ellipsis
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    const near = new Set([1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages));
    let prev = 0;
    [...near].sort((a, b) => a - b).forEach(p => {
      if (prev && p - prev > 1) pages.push('…');
      pages.push(p);
      prev = p;
    });
  }

  if (total === 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3 ${className}`}>

      {/* Left — count + page size */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="tabular-nums">
          Showing <strong className="text-gray-700">{from}–{to}</strong> of <strong className="text-gray-700">{total.toLocaleString()}</strong>
        </span>
        {onSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={e => onSizeChange(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white outline-none focus:border-brand-blue cursor-pointer"
            >
              {pageSizes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right — page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Prev */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 px-2.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-500
              hover:bg-gray-50 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ‹
          </button>

          {/* Page numbers */}
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-xs text-gray-400">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[32px] px-2 text-xs font-bold rounded-lg transition-colors
                  ${p === page
                    ? 'bg-brand-blue text-white shadow-sm shadow-blue-200 border border-brand-blue'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                {p}
              </button>
            )
          )}

          {/* Next */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 px-2.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-500
              hover:bg-gray-50 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
