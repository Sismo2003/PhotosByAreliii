// Import Dependencies
import { useEffect, useState } from "react";
import { useLocation } from "react-router";

// Local Imports
import axios from "utils/axios";

// ----------------------------------------------------------------------

// Small counters next to nav items: requests to confirm (Bookings) and unread mail (Mail).
// GET /api/admin/summary → { requests, unreadMail }. Missing endpoint = no badges.

export function useSidebarCounters() {
  const { pathname } = useLocation();
  const [counters, setCounters] = useState(null);

  useEffect(() => {
    let alive = true;
    axios
      .get("/admin/summary")
      .then(({ data }) => alive && setCounters(data.data))
      .catch(() => alive && setCounters(null));
    return () => {
      alive = false;
    };
  }, [pathname]);

  return counters;
}
