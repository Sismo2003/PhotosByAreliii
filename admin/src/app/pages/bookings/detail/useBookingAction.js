// Runs one of the Bookings thunks for the open booking and reports back with a toast:
// the short confirmation on success, the API `error_message` (409/400…) on failure.
import { useCallback } from "react";
import { toast } from "sonner";

import { useBookingsStore } from "slices";

export function useBookingAction(bookingId) {
  const busy = useBookingsStore((s) => s.busyId != null && s.busyId === bookingId);

  const run = useCallback(async (promise, { success, fallback = "Something went wrong" }) => {
    const res = await promise;
    if (res.ok) toast.success(success);
    else toast.error(res.error?.message ?? fallback);
    return res.ok;
  }, []);

  return { busy, run };
}
