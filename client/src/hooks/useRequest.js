import { useCallback, useEffect, useState } from "react";

/**
 * Loads `request()` (an axios call) when `deps` change. Answers from a previous `deps` that arrive
 * late are dropped, so a slow response never overwrites a newer one.
 * → { status: loading | done | error, data, error, retry }
 */
export function useRequest(request, deps) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState((s) => ({ ...s, status: "loading", error: null }));
    request()
      .then(({ data }) => current && setState({ status: "done", data: data.data, error: null }))
      .catch((error) => current && setState({ status: "error", data: null, error }));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
