// Old per-stage routes (/bookings/requests/:id, /bookings/upcoming/:id) → the single booking page.
import { Navigate, useParams } from "react-router";

export function BookingRedirect() {
  const { id } = useParams();
  return <Navigate to={`/bookings/${id}`} replace />;
}
