import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useApi(fetchFn)
 *
 * Generic data-fetching hook. Accepts a stable function reference (wrap in
 * useCallback at the call site, or pass a named api.js export directly).
 *
 * Returns { data, loading, error, refetch }
 *
 * Prevents setState on unmounted components via an isMounted ref.
 */
export function useApi(fetchFn) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mounted.current) setData(result);
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => { mounted.current = false; };
  }, [run]);

  return { data, loading, error, refetch: run };
}
