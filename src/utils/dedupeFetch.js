/**
 * Coalesces concurrent polling calls to the same endpoint into a single
 * in-flight request. Two independent timers (e.g. a page-level poller and
 * the app-wide job-notification poller) that both want "the current email
 * jobs list" within the same tick window end up sharing one network call
 * and its result, instead of each firing its own.
 *
 * ttlMs should be comfortably shorter than the poll interval — long enough
 * to absorb near-simultaneous callers, short enough that the next real
 * tick still gets fresh data.
 */
const cache = new Map(); // key -> { promise, timestamp }

export function dedupeFetch(key, fetchFn, ttlMs = 4000) {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && now - entry.timestamp < ttlMs) {
    return entry.promise;
  }
  const promise = Promise.resolve(fetchFn());
  cache.set(key, { promise, timestamp: now });
  // Don't let a rejected promise poison the cache for the next caller.
  promise.catch(() => cache.delete(key));
  return promise;
}
