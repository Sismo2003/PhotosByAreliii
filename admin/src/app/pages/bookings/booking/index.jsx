// Admin · Bookings · Booking page (/bookings/:id) — ONE page for every stage of a booking.
// Same structure always; the content follows the stage (design: docs/bookings-page-integraciones.md
// and wiki/admin/bitacora/2026-10-04-vista-reserva-unica.md):
//   top bar (back to the tab you came from · prev/next · ⋯ menu)
//   identity (code · date, client name, status/payment) → progress → NEXT STEP card → numbers
//   main column: session, payment, what the client told us, after-the-session, history
//   side column: the client (+ match review for requests)
// Phones: the primary action lives in a bar fixed to the bottom of the screen.
//
// The booking is loaded through the Bookings slice (openBooking + loadBookingThunk), so the action
// thunks and their busy flag work exactly as they did in the drawer this page replaces.
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmModal } from "components/shared/ConfirmModal";
import { Page } from "components/shared/Page";
import { StatRow } from "components/shared/layout/StatRow";
import { declineBookingThunk, loadBookingThunk, useBookingsStore } from "slices";
import { formatDate, fromNow } from "utils/date";

import { FollowUpChecklist } from "../detail/FollowUpChecklist";
import { NotesList } from "../detail/NotesList";
import { useBookingAction } from "../detail/useBookingAction";
import { bookingPath } from "../helpers";
import { TABS, methodLabel, money, paymentLabel, statusLabel } from "../labels";
import { ActionButton, AlertNote, History, KeyValueRows, ToneTag } from "../parts";
import { ClientCard } from "./ClientCard";
import { Block } from "./layout";
import { BookingSkeleton } from "./BookingSkeleton";
import { NextStepCard } from "./NextStepCard";
import { stageOf } from "./stage";
import { StageProgress } from "./StageProgress";
import { useNextStep } from "./useNextStep";

export default function BookingPage() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { goBack, backLabel, pager } = useNavigation(id);

  const openBooking = useBookingsStore((s) => s.openBooking);
  const closeBooking = useBookingsStore((s) => s.closeBooking);
  const booking = useBookingsStore((s) => s.booking.booking);
  const conflictWith = useBookingsStore((s) => s.booking.conflictWith);
  const loading = useBookingsStore((s) => s.booking.loading);

  useEffect(() => {
    openBooking(id);
    loadBookingThunk(id);
    // Leaving the page must not leave a booking "open" in the store.
    return () => closeBooking();
  }, [id, openBooking, closeBooking]);

  // Decline clears the open booking before we navigate away; keep showing the last one meanwhile
  // instead of flashing "couldn't be loaded".
  const lastRef = useRef(null);
  const [leaving, setLeaving] = useState(false);
  const current = booking && booking.id === id ? booking : null;
  if (current) lastRef.current = current;
  const shown = current ?? (leaving ? lastRef.current : null);

  return (
    <Page title={shown?.code ? `Booking ${shown.code}` : "Booking"}>
      <div className="page-vt px-(--margin-x) pb-40 lg:pb-12">
        {shown ? (
          <Body
            key={shown.id}
            booking={shown}
            conflictWith={conflictWith}
            goBack={goBack}
            backLabel={backLabel}
            pager={pager}
            onLeaving={setLeaving}
          />
        ) : (
          <>
            <TopBar goBack={goBack} backLabel={backLabel} />
            {loading ? (
              <BookingSkeleton />
            ) : (
              <div className="mt-8">
                <p className="text-ink-muted">This booking couldn’t be loaded.</p>
                <ActionButton className="mt-4" onClick={goBack}>
                  Back to {backLabel}
                </ActionButton>
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Navigation: back to the tab you came from, and prev/next inside that list.
// ---------------------------------------------------------------------------

function useNavigation(id) {
  const navigate = useNavigate();
  const location = useLocation();
  const storeTab = useBookingsStore((s) => s.tab);
  const requestIds = useBookingsStore((s) => s.requests.items);
  const listIds = useBookingsStore((s) => s.list.items);
  const booking = useBookingsStore((s) => s.booking.booking);

  // Tab to return to: the one the page was opened from; else the one the booking belongs to.
  const stateFrom = location.state?.from;
  const own = booking && booking.id === id ? booking : null;
  const from =
    stateFrom ?? (own ? (own.status === "REQUEST" ? "requests" : own.derived?.tab) : null) ?? storeTab;
  const backLabel = TABS.find((t) => t.id === from)?.label ?? "Bookings";

  const goBack = useCallback(() => {
    const store = useBookingsStore.getState();
    if (from && store.tab !== from) store.setTab(from);
    if (location.key !== "default") navigate(-1);
    else navigate("/bookings", { replace: true, viewTransition: true });
  }, [from, location.key, navigate]);

  // Prev / next only when the store still holds the list this booking was opened from.
  const items = storeTab === from ? (from === "requests" ? requestIds : listIds) : [];
  const index = items.findIndex((b) => b.id === id);
  const go = (to) => navigate(bookingPath(to.id), { replace: true, state: { from }, viewTransition: true });
  const pager =
    index >= 0 && items.length > 1
      ? {
          position: index + 1,
          total: items.length,
          prev: index > 0 ? () => go(items[index - 1]) : null,
          next: index < items.length - 1 ? () => go(items[index + 1]) : null,
        }
      : null;

  return { goBack, backLabel, pager };
}

// ---------------------------------------------------------------------------
// Top bar + ⋯ menu
// ---------------------------------------------------------------------------

function TopBar({ goBack, backLabel, pager, menu }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 pt-3">
      <button
        type="button"
        onClick={goBack}
        aria-label={`Back to ${backLabel}`}
        className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 caps text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="size-5" aria-hidden="true" />
        <span>{backLabel}</span>
      </button>
      <div className="flex items-center gap-1">
        {pager && (
          <div className="flex items-center text-small text-ink-muted" role="group" aria-label="Browse bookings">
            <IconButton label="Previous booking" onClick={pager.prev} disabled={!pager.prev}>
              <ChevronLeftIcon className="size-5" />
            </IconButton>
            <span aria-live="polite" className="px-1 tabular-nums">
              {pager.position} of {pager.total}
            </span>
            <IconButton label="Next booking" onClick={pager.next} disabled={!pager.next}>
              <ChevronRightIcon className="size-5" />
            </IconButton>
          </div>
        )}
        {menu}
      </div>
    </div>
  );
}

function IconButton({ label, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex size-11 items-center justify-center text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
      {...rest}
    >
      {children}
    </button>
  );
}

function MoreMenu({ booking, flags, onForm, onDecline }) {
  const items = [
    flags.canChange && { id: "res", label: "Reschedule", onClick: () => onForm("res") },
    {
      id: "copy",
      label: "Copy booking code",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(booking.code);
          toast.success(`${booking.code} copied`);
        } catch {
          toast.error("Could not copy the code");
        }
      },
    },
    flags.canChange && { id: "cancel", label: "Cancel booking", danger: true, onClick: () => onForm("cancel") },
    flags.isRequest && { id: "decline", label: "Decline request", danger: true, onClick: onDecline },
  ].filter(Boolean);

  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label="More actions"
        className="flex size-11 items-center justify-center text-ink-muted transition-colors hover:text-ink"
      >
        <EllipsisHorizontalIcon className="size-6" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-30 mt-1 w-56 border border-line-strong bg-paper py-1 shadow-soft outline-hidden dark:shadow-none"
      >
        {items.map((it, i) => (
          <MenuItem key={it.id}>
            <button
              type="button"
              onClick={it.onClick}
              className={clsx(
                "flex min-h-11 w-full items-center px-4 text-left text-body data-focus:bg-line",
                it.danger ? "text-alert" : "text-ink",
                it.danger && items[i - 1] && !items[i - 1].danger && "border-t border-line",
              )}
            >
              {it.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

function Body({ booking: b, conflictWith, goBack, backLabel, pager, onLeaving }) {
  const [form, setForm] = useState(null); // deposit | balance | res | cancel | expire
  const step = useNextStep(b, setForm);
  const { flags } = step;
  const stage = stageOf(b, flags);
  const { busy, run } = useBookingAction(b.id);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // A form opened from the ⋯ menu or a secondary action: bring the card into view.
  useEffect(() => {
    if (form) document.getElementById("next-step")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [form]);

  const d = b.derived ?? {};
  const paid = d.paidCents ?? 0;
  const balance = d.balanceCents ?? b.totalCents - paid;
  const method = methodLabel(d.lastPaymentMethod);
  const extras = (b.extras ?? []).map((e) => (e.quantity > 1 ? `${e.nameSnapshot} × ${e.quantity}` : e.nameSnapshot)).join(" · ");
  const sameDay = d.sameDayConflict;
  const needsReview =
    !b.matchReviewedAt && (b.clientMatchedBy === "PHONE" || b.clientMatchedBy === "CONFLICT");
  const hasDetailChanges = (b.detailChanges ?? []).length > 0;

  const decline = async () => {
    setShowDecline(false);
    onLeaving(true);
    const ok = await run(declineBookingThunk(b.id, declineReason.trim() || "No reason given"), {
      success: `${b.code} declined`,
      fallback: "Could not decline booking",
    });
    setDeclineReason("");
    if (ok) goBack();
    else onLeaving(false);
  };

  return (
    <>
      <TopBar
        goBack={goBack}
        backLabel={backLabel}
        pager={pager}
        menu={<MoreMenu booking={b} flags={flags} onForm={setForm} onDecline={() => setShowDecline(true)} />}
      />

      {/* Identity */}
      <header className="mt-4 sm:mt-6">
        <p className="caps text-ink-muted">
          {b.code} · {formatDate(b.startsAt, "ccc, LLL d · h:mm a")}
          {flags.isRequest && b.createdAt && <span> · Sent {fromNow(b.createdAt)}</span>}
        </p>
        <h1 className="mt-1 text-[2rem] leading-tight text-ink sm:text-[2.5rem]">
          {b.client?.displayName ?? "—"}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <ToneTag tone={d.status?.tone}>{statusLabel(b)}</ToneTag>
          <ToneTag tone={d.payment?.tone}>{paymentLabel(b)}</ToneTag>
        </div>
      </header>

      {!stage.terminal && (
        <div className="mt-8">
          <StageProgress stage={stage} />
        </div>
      )}

      {(sameDay || (flags.isRequest && (needsReview || hasDetailChanges))) && (
        <div className="mt-6 space-y-2">
          {sameDay && (
            <AlertNote>
              Same day as {sameDay.clientName} at {formatDate(sameDay.startsAt, "h:mm a")} — check travel
              time before confirming.
            </AlertNote>
          )}
          {flags.isRequest && (needsReview || hasDetailChanges) && (
            <AlertNote>Check the client details (Client section) before you confirm.</AlertNote>
          )}
        </div>
      )}

      <div className="mt-8">
        <NextStepCard booking={b} step={step} form={form} onCloseForm={() => setForm(null)} />
      </div>

      <StatRow
        className="mt-8"
        items={[
          { label: "Total", value: money(b.totalCents) },
          { label: "Paid", value: money(paid) },
          { label: "Balance", value: money(balance) },
          { label: "Date", value: formatDate(b.startsAt, "LLL d") },
        ]}
      />

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          <Block title="Session">
            <KeyValueRows
              rows={[
                ["Service", b.serviceNameSnapshot ?? "—"],
                b.packageNameSnapshot && ["Package", b.packageNameSnapshot],
                extras && ["Extras", extras],
                ["Date", formatDate(b.startsAt, "cccc, LLLL d, yyyy")],
                ["Time", `${formatDate(b.startsAt, "h:mm a")} · ${b.durationMinutes} min`],
                ["Where", [b.locationName, b.locationAddress].filter(Boolean).join(" · ") || "—"],
              ]}
            />
          </Block>

          {!flags.isRequest && !flags.isCancelled && !flags.isExpired && (
            <Block title="Payment">
              <KeyValueRows
                rows={[
                  ["Deposit", `${money(b.depositCents)} · ${d.depositPaid ? "received" : "not received"}`],
                  b.status === "AWAITING_DEPOSIT" &&
                    b.depositDueAt && ["Deposit due by", formatDate(b.depositDueAt, "ccc, LLL d · h:mm a")],
                  method && ["Last payment", `${money(paid)} · ${method}`],
                ]}
              />
            </Block>
          )}

          {(flags.isFollow || flags.isDone) && (
            <Block>
              <FollowUpChecklist booking={b} isFollow={false} onOpenForm={setForm} />
            </Block>
          )}

          <Block title="What the client told us">
            <NotesList booking={b} />
          </Block>

          <HistoryBlock events={b.events ?? []} />
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <ClientCard
            booking={b}
            conflictWith={conflictWith}
            busy={busy}
            canReview={flags.isRequest}
            run={run}
          />
        </aside>
      </div>

      <BottomBar step={step} hidden={Boolean(form)} />

      <ConfirmModal
        show={showDecline}
        onClose={() => {
          setShowDecline(false);
          setDeclineReason("");
        }}
        onOk={decline}
        confirmLoading={busy}
        state="pending"
        messages={{
          pending: {
            title: `Decline ${b.code ?? "request"}?`,
            description: "The request is closed and can’t be revived. The reason is saved in the history.",
            actionText: "Decline request",
          },
        }}
      >
        <div className="mt-4">
          <label htmlFor="decline-reason" className="field-label">
            Reason (optional)
          </label>
          <input
            id="decline-reason"
            type="text"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Schedule conflict, wrong service…"
            className="mt-2 h-11 w-full border-0 border-b border-line bg-transparent px-0 text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-0"
          />
        </div>
      </ConfirmModal>
    </>
  );
}

// Latest three events; the rest on demand.
function HistoryBlock({ events }) {
  const [all, setAll] = useState(false);
  const shown = all ? events : events.slice(0, 3);
  return (
    <Block title="History">
      <History events={shown} />
      {events.length > 3 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-3 min-h-11 text-small text-ink underline underline-offset-4 hover:text-ink-muted"
        >
          {all ? "Show less" : `Show all ${events.length}`}
        </button>
      )}
    </Block>
  );
}

// Phones / tablets: the primary action is always reachable at the bottom of the screen.
function BottomBar({ step, hidden }) {
  const { primary, perform, busy, next } = step;
  if (hidden || !primary || next.primary?.id === "rebook") return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper px-(--margin-x) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <ActionButton solid className="w-full" disabled={primary.disabled} onClick={() => perform(primary.id)}>
        {busy ? "Working…" : primary.label}
      </ActionButton>
    </div>
  );
}

TopBar.propTypes = {
  goBack: PropTypes.func,
  backLabel: PropTypes.string,
  pager: PropTypes.object,
  menu: PropTypes.node,
};
IconButton.propTypes = { label: PropTypes.string, children: PropTypes.node };
MoreMenu.propTypes = {
  booking: PropTypes.object,
  flags: PropTypes.object,
  onForm: PropTypes.func,
  onDecline: PropTypes.func,
};
Body.propTypes = {
  booking: PropTypes.object.isRequired,
  conflictWith: PropTypes.object,
  goBack: PropTypes.func,
  backLabel: PropTypes.string,
  pager: PropTypes.object,
  onLeaving: PropTypes.func,
};
HistoryBlock.propTypes = { events: PropTypes.array };
BottomBar.propTypes = { step: PropTypes.object, hidden: PropTypes.bool };
