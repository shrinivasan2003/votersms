import { useState, useEffect, useCallback, useRef } from 'react';

const _cache = new Map();

export const clearApiCache = () => _cache.clear();

export function useApi(fetcher, cacheKey, { ttl = 30_000, immediate = true } = {}) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (force = false) => {
    if (!force && cacheKey) {
      const cached = _cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < ttl) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (cacheKey) _cache.set(cacheKey, { data: result, ts: Date.now() });
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, ttl]);

  useEffect(() => {
    if (immediate) load();
  }, [immediate, load]);

  return { data, loading, error, reload: () => load(true) };
}
