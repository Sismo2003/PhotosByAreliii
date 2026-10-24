// Admin · New gallery (/galleries/new) — design: GalleryCreate.dc.html. "Create from booking":
// pick the client (or arrive from a booking / client page with ?booking= or ?client=), pick one of
// their confirmed sessions that has no gallery yet, name it, choose the sets. The settings start
// with the defaults and are changed later in the gallery's Settings tab.
import { ArrowLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { Skeleton } from "components/ui";
import { createGalleryThunk } from "slices";
import { getBooking, searchClientsForBooking } from "services/bookings";
import { getClient } from "services/clients";
import { formatDate, todayLabel } from "utils/date";
import { formatPhone } from "utils/phone";

import { ActionButton, AlertNote } from "../../bookings/parts";
import { Field, inputClass } from "../../bookings/new/fields";
import { galleryPath } from "../helpers";

const DEFAULT_SETS = ["Highlights", "Portraits", "With family", "Details", "Getting ready"];
const ACTIVE = ["AWAITING_DEPOSIT", "CONFIRMED"];

// Sessions of the client that can still get a gallery: confirmed or awaiting deposit, none yet.
const eligible = (sessions) => sessions.filter((s) => ACTIVE.includes(s.status) && s.derived?.galleryState?.key === "none");

export default function NewGallery() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const wantedBooking = Number(params.get("booking")) || null;
  const wantedClient = Number(params.get("client")) || null;

  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [bookingId, setBookingId] = useState(null);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [sets, setSets] = useState(DEFAULT_SETS);
  const [newSet, setNewSet] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(Boolean(wantedBooking || wantedClient));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pickClient = async (c, preferBooking = null) => {
    setClient(c);
    setBookingId(null);
    setSessions([]);
    try {
      const { data } = await getClient(c.id);
      const list = eligible(data.data.sessions);
      setSessions(list);
      setBookingId(preferBooking && list.some((s) => s.id === preferBooking) ? preferBooking : list.length === 1 ? list[0].id : null);
    } catch {
      setSessions([]);
    }
  };

  // Arriving from a booking or a client page.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (wantedBooking) {
          const { data } = await getBooking(wantedBooking);
          const b = data.data.booking;
          if (alive && b?.client) await pickClient(b.client, b.id);
        } else if (wantedClient) {
          const { data } = await getClient(wantedClient);
          if (alive) await pickClient(data.data.client);
        }
      } catch {
        if (alive) setError("We couldn’t load that booking or client. Pick the client below.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search box
  useEffect(() => {
    if (client || q.trim().length < 2) return undefined;
    let stale = false; // a slower, older search must not overwrite the newer results
    const t = setTimeout(async () => {
      try {
        const { data } = await searchClientsForBooking(q.trim());
        if (!stale) setResults(data.data ?? []);
      } catch {
        if (!stale) setResults([]);
      }
    }, 300);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [q, client]);

  const booking = sessions.find((s) => s.id === bookingId) ?? null;
  const autoTitle = client ? `${client.displayName} — ${booking ? booking.serviceNameSnapshot : "Gallery"}` : "";
  const shownTitle = titleTouched ? title : autoTitle;

  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate("/galleries", { replace: true }));

  const addSet = () => {
    const name = newSet.trim();
    if (!name) return;
    if (!sets.some((s) => s.toLowerCase() === name.toLowerCase())) setSets([...sets, name]);
    setNewSet("");
  };

  const submit = async () => {
    if (!client) {
      setError("Pick the client this gallery is for.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createGalleryThunk({
      clientId: client.id,
      ...(bookingId ? { bookingId } : {}),
      title: shownTitle.trim() || undefined,
      sets,
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Gallery created");
      navigate(galleryPath(res.data.id), { replace: true, viewTransition: true });
    } else {
      setError(res.error?.message ?? "Could not create the gallery");
    }
  };

  return (
    <Page title="New gallery">
      <div className="page-vt px-(--margin-x) pb-32 lg:pb-12">
        <div className="flex min-h-14 items-center pt-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 caps text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeftIcon className="size-5" aria-hidden="true" />
            <span>Galleries</span>
          </button>
        </div>

        <PageHeader eyebrow={todayLabel()} title="New gallery" />

        {loading ? (
          <div aria-busy="true" aria-label="Loading" className="mt-8 max-w-2xl space-y-6">
            <Skeleton className="h-16 w-full rounded" />
            <Skeleton className="h-11 w-full rounded" />
            <Skeleton className="h-24 w-full rounded" />
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mt-6 max-w-2xl divide-y divide-line [&>*]:py-6 [&>:first-child]:pt-0"
          >
            {/* 1 · Who */}
            <section>
              <h2 className="caps mb-4 text-ink-muted">Client</h2>
              {client ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border border-line-strong p-4">
                  <p className="min-w-0 text-small text-ink">
                    <span className="block truncate text-body">{client.displayName}</span>
                    <span className="text-ink-muted">{[client.email, client.phone && formatPhone(client.phone)].filter(Boolean).join(" · ")}</span>
                  </p>
                  {!wantedBooking && (
                    <ActionButton
                      onClick={() => {
                        setClient(null);
                        setSessions([]);
                        setBookingId(null);
                      }}
                    >
                      Change
                    </ActionButton>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Field label="Find a client" hint="Name, email or phone">
                    {(p) => (
                      <input {...p} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing…" autoComplete="off" className={inputClass} />
                    )}
                  </Field>
                  {results.length > 0 && q.trim().length >= 2 && (
                    <ul className="absolute inset-x-0 z-20 mt-1 max-h-64 overflow-auto border border-line-strong bg-paper shadow-soft dark:shadow-none">
                      {results.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              pickClient(c);
                              setQ("");
                              setResults([]);
                            }}
                            className="flex min-h-11 w-full flex-col px-3 py-2 text-left hover:bg-paper-alt"
                          >
                            <span className="text-body text-ink">{c.displayName}</span>
                            <span className="text-small text-ink-muted">{[c.email, c.phone && formatPhone(c.phone)].filter(Boolean).join(" · ")}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            {/* 2 · Which session */}
            {client && (
              <section>
                <h2 className="caps mb-4 text-ink-muted">From booking</h2>
                {sessions.length === 0 ? (
                  <p className="text-small text-ink-muted">
                    This client has no confirmed session without a gallery. You can still create one without a booking.
                  </p>
                ) : (
                  <ul className="divide-y divide-line border border-line-strong">
                    {sessions.map((s) => (
                      <li key={s.id}>
                        <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 hover:bg-paper-alt">
                          <input
                            type="radio"
                            name="booking"
                            checked={bookingId === s.id}
                            onChange={() => setBookingId(s.id)}
                            className="size-4 border-line-strong bg-transparent text-ink focus:ring-0 focus:ring-offset-0"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-body text-ink">{s.packageNameSnapshot ?? s.serviceNameSnapshot}</span>
                            <span className="text-small text-ink-muted">
                              {s.code} · {formatDate(s.startsAt, "ccc, LLL d, yyyy")}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                    <li>
                      <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 hover:bg-paper-alt">
                        <input
                          type="radio"
                          name="booking"
                          checked={bookingId === null}
                          onChange={() => setBookingId(null)}
                          className="size-4 border-line-strong bg-transparent text-ink focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="text-body text-ink-muted">No booking</span>
                      </label>
                    </li>
                  </ul>
                )}
              </section>
            )}

            {/* 3 · Name and sets */}
            {client && (
              <section className="space-y-6">
                <Field label="Gallery name" hint="Clients see this at the top of their gallery.">
                  {(p) => (
                    <input
                      {...p}
                      value={shownTitle}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setTitleTouched(true);
                      }}
                      className={inputClass}
                    />
                  )}
                </Field>

                <div>
                  <span className="field-label">Sets</span>
                  <p className="mt-1 text-small text-ink-muted">Sets are the chapters clients see — e.g. Highlights, Portraits, With family.</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {sets.map((name) => (
                      <li key={name} className="inline-flex min-h-9 items-center gap-1 border border-line-strong pr-1 pl-3 text-small text-ink">
                        {name}
                        <button
                          type="button"
                          aria-label={`Remove ${name}`}
                          onClick={() => setSets(sets.filter((x) => x !== name))}
                          className="flex size-8 items-center justify-center text-ink-muted hover:text-ink"
                        >
                          <XMarkIcon className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-end gap-3">
                    <div className="grow sm:max-w-xs">
                      <label htmlFor="new-set" className="sr-only">
                        New set name
                      </label>
                      <input
                        id="new-set"
                        value={newSet}
                        onChange={(e) => setNewSet(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSet();
                          }
                        }}
                        placeholder="Add a set…"
                        className={inputClass}
                      />
                    </div>
                    <ActionButton onClick={addSet} disabled={!newSet.trim()}>
                      Add
                    </ActionButton>
                  </div>
                </div>

                <p className="text-small text-ink-muted">
                  Your default settings will be used: high-res downloads with a PIN, client login, favorites on, available for 90 days after you deliver it. You can change them later.
                </p>
              </section>
            )}

            {error && <AlertNote>{error}</AlertNote>}

            <div className="flex flex-wrap gap-3">
              <ActionButton solid type="submit" disabled={busy || !client}>
                {busy ? "Creating…" : "Create and add photos"}
              </ActionButton>
              <Link to="/galleries" className="inline-flex min-h-11 items-center justify-center border border-line-strong px-4 caps text-ink transition-colors hover:border-ink">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </Page>
  );
}
