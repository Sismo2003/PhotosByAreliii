import { useCallback, useEffect, useState } from "react";

/** Runs `load` (an axios call) on mount; `reload()` runs it again. Each widget loads on its own. */
export function useWidgetData(load) {
  const [state, setState] = useState({ data: null, error: null });
  const run = useCallback(
    (...args) =>
      load(...args)
        .then(({ data }) => setState({ data: data.data, error: null }))
        .catch((error) => setState((s) => ({ data: s.data, error: error.message }))),
    [load],
  );
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run };
}
