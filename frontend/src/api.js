// The only place the website talks to the backend. Pages use `useApi`.
import { useCallback, useEffect, useState } from 'react';

const BASE = '/api';

export async function apiGet(path, signal) {
  const res = await fetch(BASE + path, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const err = new Error(`API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** { data, error, loading, retry } for an API path; pass null to skip. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    setState((s) => ({ data: s.data, error: null, loading: true }));
    apiGet(path, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [path, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
