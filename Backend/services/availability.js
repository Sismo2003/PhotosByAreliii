// Free times for /book step 2 (database/handoff.md §4.11, D5). Pure functions: the model loads the
// rows, this decides. Everything is computed in the studio zone (America/Phoenix, no DST) with Luxon.
//
// A time is offered when:
//   - an active AvailabilitySlot exists for that weekday and "HH:mm";
//   - the day is not a BlockedDate;
//   - it starts after `earliest` (now + the notice Areli needs to reply) and before `latest`;
//   - no booking in REQUEST, AWAITING_DEPOSIT or CONFIRMED overlaps [start, start + minutes).
import { DateTime } from 'luxon';
import { STUDIO_ZONE } from '../utils/date.js';

// D5: these statuses hold the time; DECLINED, CANCELLED and EXPIRED free it.
export const BLOCKING_STATUSES = ['REQUEST', 'AWAITING_DEPOSIT', 'CONFIRMED'];
export const BOOKING_HORIZON_MONTHS = 12;
// Longest session we look back for when a month starts (full day 480 min + extras), so a booking that
// started the evening before and runs past midnight still blocks.
export const LOOKBACK_HOURS = 24;

/** The window in which a new request may start. */
export function bookingWindow(settings, now = DateTime.now().setZone(STUDIO_ZONE)) {
  const noticeHours = Math.max(0, Number(settings?.replyWithinHours ?? 24));
  return {
    earliest: now.plus({ hours: noticeHours }),
    latest: now.plus({ months: BOOKING_HORIZON_MONTHS }).endOf('day'),
  };
}

const weekdayOf = (day) => day.weekday % 7; // Luxon: 1 = Monday … 7 = Sunday; AvailabilitySlot: 0 = Sunday

function startOf(day, time) {
  const [hour, minute] = time.split(':').map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

const overlaps = (start, minutes, bookings) => {
  const end = start.plus({ minutes });
  return bookings.some((b) => {
    const bStart = DateTime.fromJSDate(b.startsAt, { zone: 'utc' }).setZone(STUDIO_ZONE);
    const bEnd = bStart.plus({ minutes: b.durationMinutes });
    return bStart < end && start < bEnd;
  });
};

/**
 * Days of a month that offer at least one configured time.
 * @param month     DateTime at the start of the month (studio zone)
 * @param slots     active AvailabilitySlot rows
 * @param blocked   Set of "YYYY-MM-DD" (BlockedDate, studio days)
 * @param bookings  [{ startsAt: Date, durationMinutes }] in a blocking status
 * @param minutes   length of the session being requested
 * @returns [{ date: "2026-10-10", slots: [{ time: "17:15", label, open }] }] — days not listed are not bookable
 */
export function monthAvailability({ month, slots, blocked, bookings, minutes, earliest, latest }) {
  const byWeekday = new Map();
  for (const s of slots) {
    if (!byWeekday.has(s.weekday)) byWeekday.set(s.weekday, []);
    byWeekday.get(s.weekday).push(s);
  }
  const minutesOf = (time) => time.split(':').map(Number).reduce((h, m) => h * 60 + m);
  for (const list of byWeekday.values()) list.sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));

  const days = [];
  for (let day = month.startOf('month'); day.hasSame(month, 'month'); day = day.plus({ days: 1 })) {
    const date = day.toISODate();
    if (blocked.has(date)) continue;
    const times = (byWeekday.get(weekdayOf(day)) ?? [])
      .map((s) => ({ s, start: startOf(day, s.startTime) }))
      .filter(({ start }) => start >= earliest && start <= latest)
      .map(({ s, start }) => ({ time: start.toFormat('HH:mm'), label: s.label ?? null, open: !overlaps(start, minutes, bookings) }));
    if (times.length) days.push({ date, slots: times });
  }
  return days;
}

/**
 * Can a request start at `start` (DateTime, studio zone)? Returns null when it can, or the reason:
 * 'NOT_OFFERED' (no such time / blocked day / outside the window) or 'TAKEN' (overlaps a booking).
 */
export function slotProblem({ start, slots, blocked, bookings, minutes, earliest, latest }) {
  if (start.second !== 0 || start.millisecond !== 0) return 'NOT_OFFERED';
  if (blocked.has(start.toISODate())) return 'NOT_OFFERED';
  if (start < earliest || start > latest) return 'NOT_OFFERED';
  if (!slots.some((s) => s.weekday === weekdayOf(start) && +startOf(start, s.startTime) === +start)) return 'NOT_OFFERED';
  return overlaps(start, minutes, bookings) ? 'TAKEN' : null;
}
