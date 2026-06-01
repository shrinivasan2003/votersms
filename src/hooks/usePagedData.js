import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for paginated server-side data fetching.
 *
 * @param {function} fetcher - (skip, limit) => Promise<Array>
 * @param {object}   options
 * @param {number}   options.pageSize  - rows per page (default 50)
 * @param {boolean}  options.immediate - fetch on mount (default true)
 *
 * @returns {{ data, loading, error, page, pageSize, total, pages, goTo, next, prev, reload }}
 */
export function usePagedData(fetcher, { pageSize = 50, immediate = true } = {}) {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(immediate);
  const [error, setError]     = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const skip   = (targetPage - 1) * pageSize;
      const result = await fetcherRef.current(skip, pageSize);
      // If backend returns { data, total } envelope use it; otherwise treat as plain array
      if (result && !Array.isArray(result) && Array.isArray(result.data)) {
        setData(result.data);
        setTotal(result.total ?? result.data.length);
      } else {
        const rows = Array.isArray(result) ? result : [];
        setData(rows);
        // Without a total from the server, keep total as count of rows on this page
        setTotal(prev => targetPage === 1 ? rows.length : Math.max(prev, (targetPage - 1) * pageSize + rows.length));
      }
      setPage(targetPage);
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (immediate) load(1);
  }, [immediate, load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data,
    loading,
    error,
    page,
    pageSize,
    total,
    pages,
    goTo:   (p) => load(Math.max(1, Math.min(p, pages))),
    next:   () => load(Math.min(page + 1, pages)),
    prev:   () => load(Math.max(page - 1, 1)),
    reload: () => load(page),
  };
}
