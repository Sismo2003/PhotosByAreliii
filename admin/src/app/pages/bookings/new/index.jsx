// Admin · New booking — one page to add a client and create their booking by hand.
//   Sections: 1 Client · 2 Session · 3 When and where · 4 Details · 5 Price and payment,
//   with a live summary. Rules and open questions: docs/nuevo-booking-admin.md.
// The form saves itself in localStorage for 30 minutes (useBookingDraft), so a reload or leaving
// the page loses nothing; "Clear form" starts over.
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { Skeleton } from "components/ui";
import { createManualBooking, getNewBookingCatalog } from "services/bookings";
import { todayLabel } from "utils/date";

import { ActionButton, AlertNote } from "../parts";
import { bookingPath } from "../helpers";
import { ClientSection } from "./ClientSection";
import { DetailsSection } from "./DetailsSection";
import { PaymentSection } from "./PaymentSection";
import { SessionSection } from "./SessionSection";
import { Summary } from "./Summary";
import { WhenWhereSection } from "./WhenWhereSection";
import { computePrice } from "./pricing";
import { initialValues, toPayload, validate } from "./schema";
import { fromClient } from "./clientDraft";
import { clearDraftStorage, DRAFT_TTL_MS, useBookingDraft } from "./useBookingDraft";

// First field with an error → the section to scroll to.
const SECTION_OF = {
  firstName: "client", email: "client", phone: "client", client: "client",
  serviceId: "session", packageId: "session",
  date: "when", time: "when", locationKind: "when", locationName: "when", travelFee: "when",
  policyAccepted: "details",
  adjustment: "payment", payMethod: "payment",
};

export default function NewBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { values: v, patch, clear, wasRestored } = useBookingDraft(initialValues);
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(wasRestored);
  const submitted = useRef(false);

  // "New booking" from a client's page: start a fresh form for that client.
  const fromProfile = location.state?.client ?? null;
  useEffect(() => {
    if (!fromProfile) return;
    clear();
    patch({ ...fromClient(fromProfile), foundBy: "" });
    // Only on arrival: the state stays in history, a reload must keep what was typed since.
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getNewBookingCatalog()
      .then(({ data }) => setCatalog(data.data))
      .catch((err) => setLoadError(err.message ?? "Could not load services"));
  }, []);

  // Once a submit failed validation, keep the messages in sync while the user fixes them.
  useEffect(() => {
    if (submitted.current) setErrors(validate(v));
  }, [v]);

  const service = catalog?.services.find((s) => String(s.id) === v.serviceId);
  const pkg = service?.packages.find((p) => String(p.id) === v.packageId);
  const extras = useMemo(
    () => (catalog && service ? catalog.extras.filter((e) => e.serviceIds.includes(service.id)) : []),
    [catalog, service],
  );
  const pickedExtras = extras.filter((e) => (v.extraQty[e.id] ?? 0) > 0);
  const price = computePrice({
    pkg,
    extras: pickedExtras,
    extraQty: v.extraQty,
    travelFee: v.travelFee,
    adjustment: v.adjustment,
    depositPercent: catalog?.settings.depositPercent ?? 50,
  });

  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate("/bookings", { replace: true }));

  const submit = async () => {
    submitted.current = true;
    const found = validate(v);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(SECTION_OF[first] ?? "client")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error("Check the highlighted fields");
      return;
    }
    setBusy(true);
    try {
      const { data } = await createManualBooking(toPayload(v, extras));
      clearDraftStorage();
      toast.success(`${data.data.code} created`);
      navigate(bookingPath(data.data.id), { state: { from: "upcoming" }, viewTransition: true });
    } catch (err) {
      // A 409 explains who owns the phone/email: give it time to be read.
      toast.error(err.message ?? "Could not create the booking", { duration: err.status === 409 ? 12000 : undefined });
    } finally {
      setBusy(false);
    }
  };

  const clearForm = () => {
    clear();
    submitted.current = false;
    setErrors({});
    setBanner(false);
  };

  return (
    <Page title="New booking">
      <div className="page-vt px-(--margin-x) pb-32 lg:pb-12">
        <div className="flex min-h-14 items-center justify-between gap-3 pt-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 caps text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeftIcon className="size-5" aria-hidden="true" />
            <span>Bookings</span>
          </button>
          <ActionButton onClick={clearForm}>Clear form</ActionButton>
        </div>

        <PageHeader eyebrow={todayLabel()} title="New booking" />

        {banner && (
          <p className="mt-4 text-small text-ink-muted">
            We restored what you were writing. Drafts are kept {DRAFT_TTL_MS / 60000} minutes after your last change.
          </p>
        )}

        {loadError ? (
          <AlertNote className="mt-8">{loadError}</AlertNote>
        ) : !catalog ? (
          <FormSkeleton />
        ) : (
          <div className="mt-6 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} className="min-w-0">
              <ClientSection v={v} set={patch} errors={errors} />
              <SessionSection v={v} set={patch} errors={errors} catalog={catalog} />
              <WhenWhereSection v={v} set={patch} errors={errors} />
              <DetailsSection v={v} set={patch} errors={errors} />
              <PaymentSection v={v} set={patch} errors={errors} price={price} />
            </form>
            <Summary v={v} service={service} pkg={pkg} extras={pickedExtras} price={price} busy={busy} onSubmit={submit} />
          </div>
        )}
      </div>
    </Page>
  );
}

function FormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading form" className="mt-6 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-7 w-48 rounded" />
            <div className="grid gap-6 sm:grid-cols-2">
              <Skeleton className="h-11 w-full rounded" />
              <Skeleton className="h-11 w-full rounded" />
              <Skeleton className="h-11 w-full rounded" />
              <Skeleton className="h-11 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded" />
    </div>
  );
}
