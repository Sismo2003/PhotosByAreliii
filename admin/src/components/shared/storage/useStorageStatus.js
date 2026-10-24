// Import Dependencies
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";

// Local Imports
import axios from "utils/axios";

// ----------------------------------------------------------------------

// Photo storage status for the sidebar bar — GET /api/admin/storage
// (docs/almacenamiento-fotos.md §7). Refetched on every route change and whenever
// something calls refreshStorage() right after an upload or a delete.

const REFRESH_EVENT = "pba:storage-changed";

export function refreshStorage() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function useStorageStatus() {
  const { pathname } = useLocation();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async (fresh = false) => {
    try {
      const { data } = await axios.get("/admin/storage", {
        params: fresh ? { fresh: 1 } : undefined,
      });
      setStatus(data.data);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const onChange = () => load(true);
    window.addEventListener(REFRESH_EVENT, onChange);
    return () => window.removeEventListener(REFRESH_EVENT, onChange);
  }, [load]);

  return { status, error };
}
