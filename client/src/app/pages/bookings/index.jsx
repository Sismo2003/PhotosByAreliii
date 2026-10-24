// /client/bookings · the client's sessions (docs/portal-cliente-plan.md §1.3). The next session is a
// "ticket" on top (countdown, time, place, Add to calendar); everything else is a vertical timeline
// grouped by year, each node linking to its gallery when there is one. Read only, so it works the same
// in Preview as client.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { CalendarDaysIcon, MapPinIcon } from "@heroicons/react/24/outline";

import { Button, Skeleton } from "components/ui";
import { Chip, ChipRow } from "components/Chip";
import { ContactActions } from "components/ContactActions";
import { ErrorState } from "components/ErrorState";
import { FocusImg } from "components/FocusImg";
import { useDocumentTitle } from "hooks/useDocumentTitle";
import { calendarUrl, listBookings, photoUrl } from "services/portal";
import { toStudio } from "utils/date";

const mapsUrl = (location) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address || location.name)}`;

/** "In 12 days", "In 3 hours" — the largest unit that isn't zero. */
const countdown = (startsAt) => toStudio(startsAt)?.toRelative({ unit: ["days", "hours", "minutes"] });

function StateTag({ state, inverted = false }) {
  const { t } = useTranslation();
  const alert = state === "awaiting_deposit";
  const muted = state === "cancelled" || state === "completed";
  return (
    <span
      className={clsx(
        "caps inline-block border px-2 py-0.5",
        alert
          ? "border-warning text-warning"
          : inverted
            ? "border-on-ink/40 text-on-ink"
            : muted
              ? "border-line text-ink-muted"
              : "border-ink text-ink",
      )}
    >
      {t(`bookings.state.${state}`)}
    </span>
  );
}

// Sessions are 1–2 h; the end time helps people plan the day.
const timeRange = (b) => {
  const start = toStudio(b.startsAt);
  return `${start.toFormat("h:mm a")} – ${start.plus({ minutes: b.durationMinutes }).toFormat("h:mm a")}`;
};

function Ticket({ booking }) {
  const { t } = useTranslation();
  const start = toStudio(booking.startsAt);
  return (
    <article className="mb-10 bg-ink text-on-ink">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-7">
        <p className="caps text-on-ink/70">{t("bookings.next")}</p>
        <StateTag state={booking.state} inverted />
      </div>
      <div className="px-5 pt-3 pb-6 sm:px-7">
        <p className="text-title-l leading-none tracking-[-0.01em] first-letter:uppercase">{countdown(booking.startsAt)}</p>
        <p className="mt-4 text-title">{start.toFormat("cccc, LLLL d")}</p>
        <p className="mt-1 text-body text-on-ink/80">{timeRange(booking)}</p>
      </div>

      {/* Perforation: the ticket look, and a divider between when and what. */}
      <div className="relative border-t border-dashed border-on-ink/25" aria-hidden="true">
        <span className="absolute -top-2.5 -left-2.5 size-5 rounded-full bg-paper" />
        <span className="absolute -top-2.5 -right-2.5 size-5 rounded-full bg-paper" />
      </div>

      <div className="space-y-4 px-5 py-6 sm:px-7">
        <div>
          <p className="text-body">{booking.service}</p>
          {booking.package && <p className="text-small text-on-ink/70">{booking.package}</p>}
        </div>
        {booking.location?.name && (
          <a
            href={mapsUrl(booking.location)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 text-body underline-offset-4 hover:underline"
          >
            <MapPinIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span>
              {booking.location.name}
              {booking.location.address && booking.location.address !== booking.location.name && (
                <span className="block text-small text-on-ink/70">{booking.location.address}</span>
              )}
            </span>
          </a>
        )}
        {booking.state === "requested" && <p className="text-small text-on-ink/80">{t("bookings.requestedNote")}</p>}
        {booking.state === "awaiting_deposit" && (
          <Link to="/client/payments" className="block text-small underline underline-offset-4">
            {t("bookings.depositNote")}
          </Link>
        )}
        {booking.canAddToCalendar && (
          <a
            href={calendarUrl(booking.code)}
            className="caps flex min-h-12 items-center justify-center gap-2 bg-on-ink px-4 text-ink transition-opacity hover:opacity-90"
          >
            <CalendarDaysIcon className="size-5" aria-hidden="true" />
            {t("bookings.addToCalendar")}
          </a>
        )}
      </div>
    </article>
  );
}

function Node({ booking }) {
  const { t } = useTranslation();
  const start = toStudio(booking.startsAt);
  const gallery = booking.gallery;
  const body = (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <p className="caps text-ink-muted">
          {start.toFormat("LLL d")} · {start.toFormat("h:mm a")}
        </p>
        <p className={clsx("mt-1 text-body", booking.state === "cancelled" ? "text-ink-muted line-through" : "text-ink")}>
          {booking.service}
        </p>
        {booking.location?.name && <p className="truncate text-small text-ink-muted">{booking.location.name}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StateTag state={booking.state} />
          {gallery && <span className="caps text-ink">{t("bookings.seePhotos")} →</span>}
        </div>
      </div>
      {gallery?.cover && (
        <FocusImg
          photo={gallery.cover}
          src={photoUrl(gallery.slug, gallery.cover, "thumb")}
          loading="lazy"
          decoding="async"
          className="size-16 shrink-0 object-cover sm:size-20"
          alt=""
        />
      )}
    </div>
  );

  return (
    <li className="relative pb-8 pl-8 last:pb-0">
      {/* Dot on the line; filled for sessions that happened. */}
      <span
        className={clsx(
          "absolute top-1 left-0 size-3 -translate-x-1/2 rounded-full border-2 border-ink",
          booking.state === "completed" ? "bg-ink" : "bg-paper",
          booking.state === "cancelled" && "border-line-strong",
        )}
        aria-hidden="true"
      />
      {gallery ? (
        <Link to={`/client/galleries/${gallery.slug}`} viewTransition className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

function Timeline({ bookings }) {
  // Grouped by year in studio time, keeping the order the API sent.
  const years = [];
  for (const b of bookings) {
    const year = toStudio(b.startsAt).year;
    const last = years[years.length - 1];
    if (last?.year === year) last.items.push(b);
    else years.push({ year, items: [b] });
  }
  return years.map(({ year, items }) => (
    <section key={year} className="mb-8">
      <h2 className="caps mb-4 text-ink-muted">{year}</h2>
      <ol className="ml-1.5 border-l border-line">
        {items.map((b) => (
          <Node key={b.code} booking={b} />
        ))}
      </ol>
    </section>
  ));
}

function BookingsSkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-10 h-80 w-full" />
      <Skeleton className="mb-4 h-4 w-12" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-8 flex items-start gap-4 pl-8">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="size-16" />
        </div>
      ))}
    </div>
  );
}

function Empty({ title, body }) {
  return (
    <div className="border border-line px-6 py-14 text-center">
      <p className="text-title text-ink">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-sm text-body text-ink-muted">{body}</p>}
    </div>
  );
}

export default function Bookings() {
  const { t } = useTranslation();
  useDocumentTitle(t("bookings.title"));
  const [state, setState] = useState({ status: "loading", upcoming: [], past: [], nextCursor: null, error: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState(null); // null = pick by data: upcoming if there is any
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState((s) => ({ ...s, status: "loading", error: null }));
    listBookings()
      .then(({ data }) => current && setState({ status: "done", ...data.data, error: null }))
      .catch((error) => current && setState((s) => ({ ...s, status: "error", error })));
    return () => {
      current = false;
    };
  }, [attempt]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await listBookings({ cursor: state.nextCursor });
      setState((s) => ({ ...s, past: [...s.past, ...data.data.past], nextCursor: data.data.nextCursor }));
    } catch {
      // The button stays; tapping again retries.
    } finally {
      setLoadingMore(false);
    }
  };

  const { status, upcoming, past } = state;
  const shown = view ?? (upcoming.length || !past.length ? "upcoming" : "past");
  const [next, ...later] = upcoming;

  return (
    <div className="mx-auto max-w-xl px-4 pt-[calc(var(--safe-top)+1.5rem)] sm:px-8 md:pt-10">
      <h1 className="mb-6 text-title-l tracking-[-0.01em] text-ink">{t("bookings.title")}</h1>

      {status === "done" && (upcoming.length > 0 || past.length > 0) && (
        <ChipRow>
          <Chip on={shown === "upcoming"} onClick={() => setView("upcoming")}>
            {t("bookings.filters.upcoming")}
          </Chip>
          <Chip on={shown === "past"} onClick={() => setView("past")}>
            {t("bookings.filters.past")}
          </Chip>
        </ChipRow>
      )}

      {status === "loading" && <BookingsSkeleton />}
      {status === "error" && <ErrorState error={state.error} onRetry={() => setAttempt((n) => n + 1)} />}

      {status === "done" && shown === "upcoming" && (
        <>
          {next ? <Ticket booking={next} /> : <Empty title={t("bookings.empty.upcoming")} body={t("bookings.empty.upcomingBody")} />}
          {later.length > 0 && <Timeline bookings={later} />}
          <section className="mt-10">
            <h2 className="field-label mb-3 px-1">{t("contact.title")}</h2>
            <ContactActions />
          </section>
        </>
      )}

      {status === "done" && shown === "past" && (
        <>
          {past.length ? <Timeline bookings={past} /> : <Empty title={t("bookings.empty.past")} />}
          {state.nextCursor && (
            <Button variant="outlined" className="mt-2 w-full" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t("bookings.loadingMore") : t("bookings.loadMore")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
