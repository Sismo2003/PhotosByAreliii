// Overview page of the admin (docs/api-overview.md). Three independent reads so a slow one (the
// disk walk, Cloudflare) never holds the others back: bookings + agenda, storage, site visits.
import { DateTime } from 'luxon';
import prisma from '../config/db.js';
import { ACTIVE_STATUSES } from '../services/booking-derive.js';
import { diskStatus, galleryDiskUsage } from '../services/storage.js';
import { siteVisits } from '../services/cloudflare-analytics.js';
import { nowInStudio, studioDayKey, toStudio } from '../utils/date.js';

// Website requests, by what happened to them.
const OUTCOME = {
  CONFIRMED: 'booked',
  AWAITING_DEPOSIT: 'waiting', // Areli said yes, the deposit hasn't arrived
  REQUEST: 'waiting', // Areli hasn't answered
  DECLINED: 'notBooked',
  EXPIRED: 'notBooked',
  CANCELLED: 'notBooked',
};
const MONTHS = 6;
const AGENDA_DAYS = 14;
const STORAGE_CACHE_MS = 60_000;
// Web copy + thumbnail on top of the original (services/storage.js), for estimates only.
const OVERHEAD = 1.1;

let storageCache = null;

// @db.Date columns hold the calendar day at 00:00 UTC: compare against the studio day that way.
const utcDay = (studioDt) => DateTime.fromISO(studioDt.toISODate(), { zone: 'utc' }).toJSDate();

export default class OverviewModel {
  /** Requests from /book per month (booked / waiting / not booked) and the next 14 days. */
  static async bookings() {
    const today = nowInStudio().startOf('day');
    const firstMonth = today.startOf('month').minus({ months: MONTHS - 1 });
    const agendaEnd = today.plus({ days: AGENDA_DAYS - 1 }).endOf('day');
    const range = { gte: today.toJSDate(), lte: agendaEnd.toJSDate() };

    const [requests, sessions, requested, deposits, expiring, rebooks] = await Promise.all([
      prisma.booking.findMany({
        where: { source: 'WEBSITE', createdAt: { gte: firstMonth.toJSDate() } },
        select: { status: true, createdAt: true },
      }),
      prisma.booking.findMany({
        where: { status: { in: ACTIVE_STATUSES }, startsAt: range },
        select: { id: true, status: true, startsAt: true, serviceNameSnapshot: true, locationName: true, client: { select: { displayName: true } } },
      }),
      prisma.booking.findMany({
        where: { status: 'REQUEST', startsAt: range },
        select: { id: true, startsAt: true, serviceNameSnapshot: true, client: { select: { displayName: true } } },
      }),
      prisma.booking.findMany({
        where: { status: 'AWAITING_DEPOSIT', depositDueAt: range },
        select: { id: true, depositDueAt: true, depositCents: true, client: { select: { displayName: true } } },
      }),
      prisma.gallery.findMany({
        where: { status: 'DELIVERED', photosDeletedAt: null, expiresAt: range },
        select: { id: true, title: true, expiresAt: true, client: { select: { displayName: true } } },
      }),
      prisma.rebookReminder.findMany({
        where: { doneAt: null, dueOn: { gte: utcDay(today), lte: utcDay(agendaEnd) } },
        select: { id: true, label: true, dueOn: true, clientId: true, client: { select: { displayName: true } } },
      }),
    ]);

    const months = Array.from({ length: MONTHS }, (_, i) => ({
      month: firstMonth.plus({ months: i }).toFormat('yyyy-MM'),
      booked: 0,
      waiting: 0,
      notBooked: 0,
    }));
    const byMonth = new Map(months.map((m) => [m.month, m]));
    for (const r of requests) {
      const row = byMonth.get(toStudio(r.createdAt).toFormat('yyyy-MM'));
      if (row) row[OUTCOME[r.status]] += 1;
    }
    const totals = months.reduce(
      (t, m) => ({ booked: t.booked + m.booked, waiting: t.waiting + m.waiting, notBooked: t.notBooked + m.notBooked }),
      { booked: 0, waiting: 0, notBooked: 0 },
    );

    const agenda = [
      ...sessions.map((b) => ({ type: 'session', id: `s${b.id}`, at: b.startsAt, title: b.client.displayName, detail: [b.serviceNameSnapshot, b.locationName].join(' · '), status: b.status, href: `/bookings/${b.id}` })),
      ...requested.map((b) => ({ type: 'request', id: `r${b.id}`, at: b.startsAt, title: b.client.displayName, detail: b.serviceNameSnapshot, href: `/bookings/${b.id}` })),
      ...deposits.map((b) => ({ type: 'deposit', id: `d${b.id}`, at: b.depositDueAt, title: b.client.displayName, amountCents: b.depositCents, href: `/bookings/${b.id}` })),
      ...expiring.map((g) => ({ type: 'expiry', id: `g${g.id}`, at: g.expiresAt, title: g.client.displayName, detail: g.title, href: `/galleries/${g.id}` })),
      // dueOn is a calendar day (@db.Date): sent as the day, no time.
      ...rebooks.map((r) => ({ type: 'rebook', id: `b${r.id}`, day: DateTime.fromJSDate(r.dueOn, { zone: 'utc' }).toISODate(), title: r.client.displayName, detail: r.label, href: `/clients/${r.clientId}` })),
    ]
      .map((e) => ({ ...e, day: e.day ?? studioDayKey(e.at) }))
      .sort((a, b) => a.day.localeCompare(b.day) || (a.at ? +a.at : 0) - (b.at ? +b.at : 0));

    return { months, totals, agenda, agendaDays: AGENDA_DAYS };
  }

  /**
   * Disk of the photo folder split by gallery, measured on disk. A gallery with photos in the
   * database but no folder (dev seed, or files restored elsewhere) gets an estimate, flagged.
   */
  static async storage({ fresh = false } = {}) {
    if (!fresh && storageCache && Date.now() - storageCache.at < STORAGE_CACHE_MS) return storageCache.data;

    const [disk, usage, galleries, photoSums] = await Promise.all([
      diskStatus(),
      galleryDiskUsage(),
      prisma.gallery.findMany({ select: { id: true, title: true, status: true, photosDeletedAt: true, client: { select: { displayName: true } } } }),
      prisma.photo.groupBy({ by: ['galleryId'], _count: { _all: true }, _sum: { sizeBytes: true } }),
    ]);
    const sums = new Map(photoSums.map((p) => [p.galleryId, p]));

    const rows = galleries
      .map((g) => {
        const measured = usage.has(g.id);
        const sum = sums.get(g.id);
        const bytes = measured ? usage.get(g.id) : g.photosDeletedAt ? 0 : Math.round((sum?._sum.sizeBytes ?? 0) * OVERHEAD);
        return { id: g.id, title: g.title, client: g.client.displayName, status: g.status, photoCount: sum?._count._all ?? 0, bytes, estimated: !measured && bytes > 0 };
      })
      .filter((g) => g.bytes > 0)
      .sort((a, b) => b.bytes - a.bytes);

    const usedBytes = Math.max(0, disk.totalBytes - disk.freeBytes);
    const measuredGalleryBytes = rows.reduce((sum, g) => sum + (g.estimated ? 0 : g.bytes), 0);

    const data = {
      totalBytes: disk.totalBytes,
      freeBytes: disk.freeBytes,
      usedBytes,
      freePct: disk.freePct,
      level: disk.level,
      galleriesBytes: rows.reduce((sum, g) => sum + g.bytes, 0),
      // Everything else on the same disk: tmp uploads, folders of deleted galleries, and (in dev
      // or a shared disk) files that aren't photos at all. Estimates are not on disk, so they
      // aren't taken out of it.
      otherBytes: Math.max(0, usedBytes - measuredGalleryBytes),
      hasEstimates: rows.some((g) => g.estimated),
      galleries: rows,
    };
    storageCache = { at: Date.now(), data };
    return data;
  }

  static visits() {
    return siteVisits(30);
  }
}
