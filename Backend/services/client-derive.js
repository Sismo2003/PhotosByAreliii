// What Clients shows but never stores (database/handoff.md §4.1 "Calculado en consulta", §5.3):
// segment, returning, sessions, received, balance, last/next session, login state.
// Pure functions + the Prisma `where` of each tab. Built on booking-derive.js so the Clients
// list and the Bookings tabs can never disagree about what a "past session" is.
import { ACTIVE_STATUSES, deriveBooking, isActive, isPastSession, paidCents } from './booking-derive.js';
import { toStudio } from '../utils/date.js';

export const CLIENT_TABS = ['all', 'upcoming', 'followup', 'past', 'leads'];
export const CLIENT_SORTS = ['name', 'received']; // no sort = recent activity
export const CLIENT_LOGINS = ['none', 'invited', 'active'];
export const REACH_OUT_DAYS = 60;

/** Prisma `where` for the "Gallery login" filter (same states as loginOf below). */
export function clientLoginWhere(login) {
  const invited = { mustChangePassword: true, lastLoginAt: null };
  if (login === 'none') return { user: { is: null } };
  if (login === 'invited') return { user: { is: invited } };
  if (login === 'active') return { user: { is: { NOT: invited } } };
  return {};
}

/**
 * Prisma `where` for a tab. `cutoff` is the Luxon "now" (ctx.pastCutoff): a session is past
 * once it has started. Segments are exclusive and checked in this order:
 *   upcoming → followup → past → leads (no active booking at all).
 */
export function clientTabWhere(tab, cutoff) {
  const now = cutoff.toJSDate();
  const active = { status: { in: ACTIVE_STATUSES } };
  const upcoming = { ...active, startsAt: { gte: now } };
  const pastOpen = { ...active, startsAt: { lt: now }, archivedAt: null };
  const pastAny = { ...active, startsAt: { lt: now } };
  switch (tab) {
    case 'upcoming':
      return { bookings: { some: upcoming } };
    case 'followup':
      return { AND: [{ bookings: { none: upcoming } }, { bookings: { some: pastOpen } }] };
    case 'past':
      return { AND: [{ bookings: { none: upcoming } }, { bookings: { none: pastOpen } }, { bookings: { some: pastAny } }] };
    case 'leads':
      return { bookings: { none: active } };
    default:
      return {};
  }
}

const byStart = (dir) => (a, b) => (dir === 'asc' ? 1 : -1) * (toStudio(a.startsAt) - toStudio(b.startsAt));

/** Same four segments as the tabs, from one client's loaded bookings. */
export function segmentOf(bookings, ctx) {
  const active = bookings.filter(isActive);
  if (active.length === 0) return 'leads';
  if (active.some((b) => !isPastSession(b, ctx))) return 'upcoming';
  if (active.some((b) => !b.archivedAt)) return 'followup';
  return 'past';
}

function loginOf(user) {
  if (!user) return { state: 'none', invitedAt: null, lastLoginAt: null };
  const state = user.mustChangePassword && !user.lastLoginAt ? 'invited' : 'active';
  return { state, invitedAt: user.invitedAt, lastLoginAt: user.lastLoginAt };
}

// The one line the Status column shows. Upcoming/Follow-up reuse the booking's own status
// (Confirmed, Awaiting deposit, Create gallery…); the other two are about the client.
function statusOf(segment, bookings, active, ctx) {
  if (segment === 'upcoming' || segment === 'followup') {
    const focus =
      segment === 'upcoming'
        ? active.filter((b) => !isPastSession(b, ctx)).sort(byStart('asc'))[0]
        : active.filter((b) => isPastSession(b, ctx) && !b.archivedAt).sort(byStart('desc'))[0];
    const d = deriveBooking(focus, ctx);
    return { key: d.status.key, tone: d.status.tone, amountCents: d.balanceCents };
  }
  if (segment === 'past') return { key: 'past_client', tone: 'muted', amountCents: 0 };
  const latest = [...bookings].sort(byStart('desc'))[0];
  if (!latest) return { key: 'no_session', tone: 'muted', amountCents: 0 };
  if (latest.status === 'REQUEST') return { key: 'new_request', tone: 'new', amountCents: 0 };
  return { key: latest.status === 'EXPIRED' ? 'lead_expired' : 'lead_cancelled', tone: 'muted', amountCents: 0 };
}

/**
 * `client` needs: bookings[{status, startsAt, archivedAt, totalCents, depositCents, depositDueAt,
 * serviceNameSnapshot, thanksSentAt, reviewStatus, payments, gallery, rebookReminders}], user,
 * rebookReminders (open). Returns the computed block merged into every list row and profile.
 */
export function deriveClient(client, ctx) {
  const bookings = client.bookings ?? [];
  const active = bookings.filter(isActive);
  const segment = segmentOf(bookings, ctx);
  const upcoming = active.filter((b) => !isPastSession(b, ctx)).sort(byStart('asc'));
  const past = active.filter((b) => isPastSession(b, ctx)).sort(byStart('desc'));
  const sorted = [...active].sort(byStart('desc'));
  const types = [...new Set(sorted.map((b) => b.serviceNameSnapshot))];
  const reminder = [...(client.rebookReminders ?? [])].sort((a, b) => a.dueOn - b.dueOn)[0] ?? null;

  return {
    segment,
    returning: active.length >= 2,
    sessionCount: active.length,
    sessionTypes: types,
    lastSessionAt: past[0]?.startsAt ?? null,
    nextSessionAt: upcoming[0]?.startsAt ?? null,
    receivedCents: bookings.reduce((sum, b) => sum + paidCents(b.payments), 0),
    balanceCents: active.reduce((sum, b) => sum + Math.max(0, b.totalCents - paidCents(b.payments)), 0),
    status: statusOf(segment, bookings, active, ctx),
    login: loginOf(client.user),
    reminder: reminder && { id: reminder.id, kind: reminder.kind, label: reminder.label, dueOn: reminder.dueOn },
  };
}
