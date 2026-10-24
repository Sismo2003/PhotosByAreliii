// What Bookings shows but never stores (database/handoff.md §4.4 "Lo que se calcula", §5.1):
// tab, paid/balance, payment/status/next-step labels, gallery state, canArchive.
// Pure functions only — list, detail, summary and the actions all go through here so the
// table, the drawer and the numbers on top can never disagree. Contract: docs/api-bookings.md.
import { STUDIO_ZONE, nowInStudio, toStudio } from '../utils/date.js';

export const ACTIVE_STATUSES = ['AWAITING_DEPOSIT', 'CONFIRMED'];
export const TABS = ['requests', 'upcoming', 'followup', 'done', 'expired', 'cancelled'];

// Used when StudioSettings row 1 is missing (fresh or emptied DB). Same values as the column
// defaults in database/prisma/schema.prisma (model StudioSettings): keep them in sync.
export const SETTINGS_FALLBACK = {
  depositPercent: 50,
  cancelNoticeHours: 48,
  lateGraceMinutes: 30,
  maxReschedules: 1,
  outfitChangeCents: 1500,
  depositDueHours: 48,
  replyWithinHours: 24,
  galleryDeliveryDays: 14,
  galleryExpiryDays: 90,
  expiryReminderHours: 48,
  depositReminderHours: 12,
  prepReminderHours: 48,
  galleryExtendDays: 30,
  freeTravelMiles: 25,
  travelFeePerMileCents: 100,
  bookingPolicyVersion: 1,
};

export const withSettingsFallback = (settings) => ({ ...SETTINGS_FALLBACK, ...(settings ?? {}) });

/** "Now" for one request: every booking in a response is judged against the same instant. */
export function deriveContext(settings, now = nowInStudio()) {
  const at = now.setZone(STUDIO_ZONE);
  // `pastCutoff`: a session is "past" once it has started (not only from the next day), so a
  // session from 4 hours ago already moves to Follow-up and its next step (gallery…) shows up.
  return { settings: withSettingsFallback(settings), now: at, startOfToday: at.startOf('day'), pastCutoff: at };
}

/**
 * Prisma `where` for a tab. "Past" = the session already started (`ctx.pastCutoff`, a Luxon DateTime).
 */
export function tabWhere(tab, pastCutoff) {
  const sot = pastCutoff.toJSDate();
  switch (tab) {
    case 'requests':
      return { status: 'REQUEST' };
    case 'upcoming':
      return { status: { in: ACTIVE_STATUSES }, startsAt: { gte: sot } };
    case 'followup':
      return { status: { in: ACTIVE_STATUSES }, startsAt: { lt: sot }, archivedAt: null };
    case 'done':
      return { status: { in: ACTIVE_STATUSES }, startsAt: { lt: sot }, archivedAt: { not: null } };
    case 'expired':
      return { status: 'EXPIRED' };
    case 'cancelled':
      return { status: { in: ['CANCELLED', 'DECLINED'] } };
    default:
      return null;
  }
}

export const tabOrderBy = (tab) =>
  tab === 'requests'
    ? [{ createdAt: 'asc' }, { id: 'asc' }]
    : tab === 'upcoming'
      ? [{ startsAt: 'asc' }, { id: 'asc' }]
      : [{ startsAt: 'desc' }, { id: 'desc' }];

/** Orders for the list's clickable headers; `id` keeps pages stable when values tie. */
export const sortOrderBy = (sort, dir) => {
  const d = dir === 'desc' ? 'desc' : 'asc';
  const by = {
    date: { startsAt: d },
    client: { client: { displayName: d } },
    service: { serviceNameSnapshot: d },
    total: { totalCents: d },
  }[sort];
  return [by ?? { startsAt: d }, { id: d }];
};

/** Paid = DEPOSIT + BALANCE − REFUND (handoff §4.5). */
export function paidCents(payments = []) {
  return payments.reduce((sum, p) => sum + (p.kind === 'REFUND' ? -p.amountCents : p.amountCents), 0);
}

export const isActive = (booking) => ACTIVE_STATUSES.includes(booking.status);
export const isPastSession = (booking, ctx) => toStudio(booking.startsAt) < ctx.pastCutoff;

/**
 * What the "Payments pending" number adds for one active booking: the whole balance once the
 * session happened, only the missing deposit before it.
 */
export function pendingCents(booking, ctx) {
  const paid = paidCents(booking.payments);
  return isPastSession(booking, ctx)
    ? Math.max(0, booking.totalCents - paid)
    : Math.max(0, booking.depositCents - paid);
}

export function tabOf(booking, ctx) {
  if (booking.status === 'REQUEST') return 'requests';
  if (booking.status === 'EXPIRED') return 'expired';
  if (booking.status === 'CANCELLED' || booking.status === 'DECLINED') return 'cancelled';
  if (!isPastSession(booking, ctx)) return 'upcoming';
  return booking.archivedAt ? 'done' : 'followup';
}

function lastPaymentMethod(payments = []) {
  let last = null;
  for (const p of payments) {
    if (p.kind === 'REFUND') continue;
    if (!last || toStudio(p.receivedAt) >= toStudio(last.receivedAt)) last = p;
  }
  return last?.method ?? null;
}

function paymentLabel(booking, { past, paid, balance, depositPaid, depositOverdue }) {
  if (['CANCELLED', 'DECLINED', 'EXPIRED'].includes(booking.status)) {
    return paid > 0 ? { key: 'deposit_kept', tone: 'muted' } : { key: 'none_cancelled', tone: 'muted' };
  }
  if (booking.status === 'REQUEST') return { key: 'no_deposit_yet', tone: 'muted' };
  if (balance === 0) return { key: 'paid_in_full', tone: 'done' };
  if (past) return { key: 'balance_due', tone: 'alert' };
  if (depositPaid) return { key: 'deposit_paid', tone: 'done' };
  return depositOverdue ? { key: 'deposit_overdue', tone: 'alert' } : { key: 'deposit_due', tone: 'pending' };
}

// Gallery delivery is due galleryDeliveryDays after the session's studio day.
function deliveryDueOn(booking, ctx) {
  return toStudio(booking.startsAt).startOf('day').plus({ days: ctx.settings.galleryDeliveryDays });
}

function galleryStateOf(booking, ctx, active) {
  const gallery = booking.gallery;
  const due = active ? deliveryDueOn(booking, ctx) : null;
  const overdue = Boolean(due) && ctx.startOfToday > due;
  const dueOn = due ? due.toISODate() : null;

  if (!gallery) {
    const tone = !active || !isPastSession(booking, ctx) ? 'muted' : overdue ? 'alert' : 'pending';
    return { key: 'none', tone, dueOn, daysLeft: null };
  }
  if (gallery.status !== 'DELIVERED') {
    return overdue
      ? { key: 'editing_overdue', tone: 'alert', dueOn, daysLeft: null }
      : { key: 'editing', tone: 'pending', dueOn, daysLeft: null };
  }
  if (!gallery.expiresAt) return { key: 'delivered', tone: 'done', dueOn: null, daysLeft: null };
  const expires = toStudio(gallery.expiresAt);
  if (expires <= ctx.now) return { key: 'expired', tone: 'muted', dueOn: null, daysLeft: 0 };
  const daysLeft = Math.round(expires.startOf('day').diff(ctx.startOfToday, 'days').days);
  return { key: 'delivered', tone: daysLeft <= 14 ? 'alert' : 'done', dueOn: null, daysLeft };
}

// Follow-up "Next step", in the order of handoff §5.1.
function nextStepOf(booking, ctx, balance) {
  const gallery = booking.gallery;
  const due = deliveryDueOn(booking, ctx);
  const overdue = ctx.startOfToday > due;
  const dueOn = due.toISODate();

  if (balance > 0) return { key: 'collect_balance', tone: 'alert', dueOn: null };
  if (!gallery) return { key: 'create_gallery', tone: overdue ? 'alert' : 'pending', dueOn };
  if (gallery.status !== 'DELIVERED') {
    return overdue
      ? { key: 'deliver_gallery_overdue', tone: 'alert', dueOn }
      : { key: 'deliver_gallery', tone: 'pending', dueOn };
  }
  if (!booking.thanksSentAt) return { key: 'send_thanks', tone: 'pending', dueOn: null };
  if (booking.reviewStatus === 'NONE') return { key: 'ask_review', tone: 'pending', dueOn: null };
  if (booking.reviewStatus === 'REQUESTED') return { key: 'waiting_review', tone: 'muted', dueOn: null };
  // rebookReminders are loaded with doneAt = null only.
  if (!booking.rebookReminders?.length) return { key: 'set_rebook', tone: 'pending', dueOn: null };
  return { key: 'ready_to_archive', tone: 'done', dueOn: null };
}

function statusLabel(booking, { past, nextStep, depositOverdue }) {
  switch (booking.status) {
    case 'CANCELLED':
      return { key: 'cancelled', tone: 'muted' };
    case 'DECLINED':
      return { key: 'declined', tone: 'muted' };
    case 'EXPIRED':
      return { key: 'expired', tone: 'muted' };
    case 'REQUEST':
      return { key: 'new_request', tone: 'new' };
    default:
      if (past && booking.archivedAt) return { key: 'done', tone: 'done' };
      if (past) return { key: nextStep.key, tone: nextStep.tone };
      if (booking.status === 'AWAITING_DEPOSIT') {
        return { key: 'awaiting_deposit', tone: depositOverdue ? 'alert' : 'pending' };
      }
      return { key: 'confirmed', tone: 'done' };
  }
}

/**
 * `booking` needs: status, startsAt, totalCents, depositCents, depositDueAt, archivedAt,
 * thanksSentAt, reviewStatus, payments[{kind, method, amountCents, receivedAt}],
 * gallery{status, expiresAt} | null, rebookReminders (open ones only).
 * `sameDayConflict` is looked up by the model (it needs a query) and passed through.
 */
export function deriveBooking(booking, ctx, { sameDayConflict = null } = {}) {
  const active = isActive(booking);
  const past = isPastSession(booking, ctx);
  const paid = paidCents(booking.payments);
  const balance = Math.max(0, booking.totalCents - paid);
  const depositPaid = paid >= booking.depositCents;
  const depositOverdue =
    booking.status === 'AWAITING_DEPOSIT' &&
    !depositPaid &&
    Boolean(booking.depositDueAt) &&
    toStudio(booking.depositDueAt) < ctx.now;

  const nextStep = active && past ? nextStepOf(booking, ctx, balance) : null;
  const galleryState = galleryStateOf(booking, ctx, active);

  return {
    tab: tabOf(booking, ctx),
    isPast: past,
    paidCents: paid,
    balanceCents: balance,
    depositPaid,
    depositOverdue,
    lastPaymentMethod: lastPaymentMethod(booking.payments),
    payment: paymentLabel(booking, { past, paid, balance, depositPaid, depositOverdue }),
    status: statusLabel(booking, { past, nextStep, depositOverdue }),
    nextStep,
    galleryState,
    canArchive: active && past && !booking.archivedAt && balance === 0 && booking.gallery?.status === 'DELIVERED',
    sameDayConflict: booking.status === 'REQUEST' ? sameDayConflict : null,
  };
}

/** Why archiving is blocked, for the 409 message; null when it is allowed. */
export function archiveBlocker(booking, ctx) {
  const d = deriveBooking(booking, ctx);
  if (d.canArchive) return null;
  if (!isActive(booking) || !d.isPast) return 'Only past sessions can be archived';
  if (booking.archivedAt) return 'This booking is already archived';
  if (d.balanceCents > 0) return `Collect the ${formatCents(d.balanceCents)} balance before archiving`;
  return 'Deliver the gallery before archiving';
}

/** 8750 → "$87.50", 5000 → "$50". History lines only; the API always returns cents. */
export function formatCents(cents) {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}
