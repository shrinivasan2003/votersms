import { useEffect, useRef } from 'react';

/**
 * Calls refreshFn on a background interval to keep the jobs table up to date
 * while the user is on a job page. Toast notifications are handled globally
 * by useGlobalJobNotifications (mounted in AppLayout).
 */
export function useJobPolling(refreshFn, intervalMs = 5000) {
  const refreshRef = useRef(refreshFn);
  refreshRef.current = refreshFn;

  useEffect(() => {
    const id = setInterval(() => refreshRef.current?.(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
