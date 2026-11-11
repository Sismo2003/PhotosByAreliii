// Email tables (docs/correos.md §4–§5): EmailOutbox (every email, queued in the same transaction as
// the business change), EmailTemplate (one per key + locale, with its draft) and
// EmailTemplateVersion (what was published, last 20 kept).
import { DateTime } from 'luxon';
import prisma from '../config/db.js';

const KEEP_VERSIONS = 20;

// Rows listed in the admin (no body, no secrets).
const OUTBOX_LIST = {
  id: true, key: true, toEmail: true, toName: true, locale: true, subject: true, status: true, skipReason: true,
  isTest: true, attempts: true, lastError: true, createdAt: true, sentAt: true, nextAttemptAt: true,
  clientId: true, bookingId: true, galleryId: true,
  client: { select: { id: true, displayName: true } },
  booking: { select: { id: true, code: true } },
  gallery: { select: { id: true, title: true } },
};

class EmailModel {
  // ─── Outbox ─────────────────────────────────────────────────────────

  /** Inserts one email. `db` is the transaction of the business change, or null. */
  static async enqueue(db, row) {
    db ??= prisma;
    if (row.dedupeKey) {
      const existing = await db.emailOutbox.findUnique({ where: { dedupeKey: row.dedupeKey }, select: { id: true } });
      if (existing) return existing;
    }
    return db.emailOutbox.create({ data: row, select: { id: true } });
  }

  /** Up to `limit` emails ready to go, oldest first, client emails before Areli's and support's. */
  static async due(limit = 10) {
    const now = DateTime.utc().toJSDate();
    return prisma.emailOutbox.findMany({
      where: { status: 'PENDING', sendAfter: { lte: now }, nextAttemptAt: { lte: now } },
      orderBy: [{ isTest: 'desc' }, { nextAttemptAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  /** PENDING → SENDING; false when another run took it first. */
  static async claim(id) {
    // nextAttemptAt doubles as "claimed at" so releaseStuck() can find rows left in SENDING.
    const { count } = await prisma.emailOutbox.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'SENDING', nextAttemptAt: DateTime.utc().toJSDate() } });
    return count === 1;
  }

  static async update(id, data) {
    return prisma.emailOutbox.update({ where: { id }, data });
  }

  /** Rows stuck in SENDING (the process died mid-send) go back to PENDING. */
  static async releaseStuck(minutes = 10) {
    const before = DateTime.utc().minus({ minutes }).toJSDate();
    return prisma.emailOutbox.updateMany({ where: { status: 'SENDING', nextAttemptAt: { lt: before } }, data: { status: 'PENDING' } });
  }

  static async sentSince(since) {
    return prisma.emailOutbox.count({ where: { status: 'SENT', sentAt: { gte: since } } });
  }

  static async testsSince(since) {
    return prisma.emailOutbox.count({ where: { isTest: true, createdAt: { gte: since } } });
  }

  static async get(id) {
    return prisma.emailOutbox.findUnique({ where: { id } });
  }

  static async list({ status, key, q, page = 1, pageSize = 25 }) {
    const where = {
      ...(status ? { status } : {}),
      ...(key ? { key } : {}),
      ...(q ? { OR: [{ toEmail: { contains: q } }, { subject: { contains: q } }, { toName: { contains: q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.emailOutbox.findMany({ where, select: OUTBOX_LIST, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.emailOutbox.count({ where }),
    ]);
    return { items, total };
  }

  /** Last emails of one booking / gallery / client (for their pages). */
  static async forEntity(where, take = 20) {
    return prisma.emailOutbox.findMany({ where, select: OUTBOX_LIST, orderBy: { id: 'desc' }, take });
  }

  /** Counts for the Settings → Email status line. */
  static async stats() {
    const day = DateTime.utc().minus({ hours: 24 }).toJSDate();
    const [sent24h, pending, failed, skipped, lastSent] = await Promise.all([
      prisma.emailOutbox.count({ where: { status: 'SENT', sentAt: { gte: day } } }),
      prisma.emailOutbox.count({ where: { status: { in: ['PENDING', 'SENDING'] } } }),
      prisma.emailOutbox.count({ where: { status: 'FAILED', createdAt: { gte: DateTime.utc().minus({ days: 7 }).toJSDate() } } }),
      prisma.emailOutbox.count({ where: { status: 'SKIPPED', createdAt: { gte: DateTime.utc().minus({ days: 7 }).toJSDate() } } }),
      prisma.emailOutbox.findFirst({ where: { status: 'SENT' }, orderBy: { sentAt: 'desc' }, select: { sentAt: true, toEmail: true, subject: true } }),
    ]);
    return { sent24h, pending, failed, skipped, lastSent };
  }

  /** Emails that gave up since `since` (support alert #25). A failed row's nextAttemptAt is when it failed. */
  static async failuresSince(since) {
    const where = { status: 'FAILED', isTest: false, key: { not: 'support.email_failures' }, nextAttemptAt: { gte: since } };
    const [count, last] = await Promise.all([
      prisma.emailOutbox.count({ where }),
      prisma.emailOutbox.findFirst({ where, orderBy: { id: 'desc' }, select: { lastError: true } }),
    ]);
    return { count, lastError: last?.lastError ?? '' };
  }

  // ─── Fresh data for an email (read at send time, never from the queue row) ──

  static async clientContact(db, id) {
    return (db ?? prisma).client.findUnique({ where: { id }, select: { email: true, displayName: true, locale: true } });
  }

  static async bookingForEmail(id) {
    return prisma.booking.findUnique({
      where: { id },
      include: { client: true, payments: { select: { kind: true, amountCents: true } } },
    });
  }

  static async galleryForEmail(id) {
    const gallery = await prisma.gallery.findUnique({ where: { id }, include: { client: { include: { user: true } } } });
    if (!gallery) return null;
    const photoCount = await prisma.photo.count({ where: { galleryId: id, hidden: false } });
    return { ...gallery, photoCount };
  }

  static async clientForEmail(id) {
    return prisma.client.findUnique({ where: { id }, include: { user: true } });
  }

  /** Sets a temporary password on the client's login (creating the login if missing). */
  static async setTemporaryLogin(client, passwordHash) {
    const now = DateTime.utc().toJSDate();
    const data = { passwordHash, mustChangePassword: true, passwordChangedAt: now, invitedAt: now };
    if (client.user) return prisma.user.update({ where: { id: client.user.id }, data, select: { email: true } });
    return prisma.user.create({ data: { ...data, email: client.email, role: 'CLIENT', clientId: client.id }, select: { email: true } });
  }

  /** The review link lives with the studio rules (StudioSettings.reviewUrl). */
  static async setReviewUrl(reviewUrl) {
    return prisma.studioSettings.upsert({ where: { id: 1 }, create: { id: 1, reviewUrl }, update: { reviewUrl } });
  }

  static async studioSettings() {
    return prisma.studioSettings.findUnique({ where: { id: 1 } });
  }

  // ─── Reminder candidates (scheduler.js) ─────────────────────────────

  /** AWAITING_DEPOSIT with the deadline between now and `until`. */
  static async depositReminderCandidates(until) {
    return prisma.booking.findMany({
      where: { status: 'AWAITING_DEPOSIT', depositDueAt: { gt: DateTime.utc().toJSDate(), lte: until } },
      select: { id: true, clientId: true, depositDueAt: true, depositCents: true, payments: { select: { kind: true, amountCents: true } } },
    });
  }

  /** CONFIRMED sessions starting between now and `until`. */
  static async prepReminderCandidates(until) {
    return prisma.booking.findMany({
      where: { status: 'CONFIRMED', startsAt: { gt: DateTime.utc().toJSDate(), lte: until } },
      select: { id: true, clientId: true, startsAt: true },
    });
  }

  /** Delivered galleries expiring between now and `until` that weren't warned yet. */
  static async expiryWarningCandidates(until) {
    return prisma.gallery.findMany({
      where: { status: 'DELIVERED', photosDeletedAt: null, expiryReminderSentAt: null, expiresAt: { gt: DateTime.utc().toJSDate(), lte: until } },
      select: { id: true, clientId: true, bookingId: true, expiresAt: true },
    });
  }

  /** Queues the expiry warning and marks the gallery warned, together. */
  static async markExpiryWarned(galleryId, queue) {
    return prisma.$transaction(async (tx) => {
      await queue(tx);
      await tx.gallery.update({ where: { id: galleryId }, data: { expiryReminderSentAt: DateTime.utc().toJSDate() } });
    });
  }

  // ─── Templates ──────────────────────────────────────────────────────

  static async templates() {
    return prisma.emailTemplate.findMany({
      select: {
        id: true, key: true, locale: true, draftUpdatedAt: true, isDefault: true, updatedAt: true,
        draftProject: true,
        publishedVersion: { select: { id: true, version: true, publishedAt: true, project: true } },
      },
    });
  }

  static async template(key, locale) {
    return prisma.emailTemplate.findUnique({
      where: { key_locale: { key, locale } },
      include: { publishedVersion: true },
    });
  }

  static async versions(templateId) {
    return prisma.emailTemplateVersion.findMany({
      where: { templateId },
      select: { id: true, version: true, subject: true, publishedAt: true, publishedById: true },
      orderBy: { version: 'desc' },
    });
  }

  static async version(id) {
    return prisma.emailTemplateVersion.findUnique({ where: { id } });
  }

  static async saveDraft(key, locale, { subject, mjml, project }) {
    const now = DateTime.utc().toJSDate();
    const data = { draftSubject: subject, draftMjml: mjml, draftProject: project, draftUpdatedAt: now, isDefault: false };
    return prisma.emailTemplate.upsert({
      where: { key_locale: { key, locale } },
      create: { key, locale, ...data },
      update: data,
      include: { publishedVersion: true },
    });
  }

  /** New version + make it the published one, keeping the last KEEP_VERSIONS. */
  static async publish(key, locale, { subject, mjml, project, html }, actorId) {
    return prisma.$transaction(async (tx) => {
      const now = DateTime.utc().toJSDate();
      const template = await tx.emailTemplate.upsert({
        where: { key_locale: { key, locale } },
        create: { key, locale, isDefault: false },
        update: {},
      });
      const last = await tx.emailTemplateVersion.findFirst({ where: { templateId: template.id }, orderBy: { version: 'desc' }, select: { version: true } });
      const version = await tx.emailTemplateVersion.create({
        data: { templateId: template.id, version: (last?.version ?? 0) + 1, subject, mjml, project, html, publishedAt: now, publishedById: actorId },
      });
      // The draft becomes the published content: nothing is left "unpublished".
      await tx.emailTemplate.update({
        where: { id: template.id },
        data: { publishedVersionId: version.id, draftSubject: subject, draftMjml: mjml, draftProject: project, draftUpdatedAt: now, isDefault: false },
      });
      const old = await tx.emailTemplateVersion.findMany({
        where: { templateId: template.id }, orderBy: { version: 'desc' }, skip: KEEP_VERSIONS, select: { id: true },
      });
      if (old.length) await tx.emailTemplateVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } });
      await tx.activityEvent.create({
        data: { type: 'email.template_published', actorType: 'ADMIN', actorId, message: `Email “${key}” (${locale.toUpperCase()}) published — version ${version.version}`, metadata: { key, locale, version: version.version } },
      });
      return version;
    });
  }

  /** Back to the repository default: the template row goes away (history included). */
  static async restoreDefault(key, locale, actorId) {
    await prisma.$transaction(async (tx) => {
      await tx.emailTemplate.deleteMany({ where: { key, locale } });
      await tx.activityEvent.create({
        data: { type: 'email.template_restored', actorType: 'ADMIN', actorId, message: `Email “${key}” (${locale.toUpperCase()}) restored to the default`, metadata: { key, locale } },
      });
    });
  }

  static async logSettingsChange(actorId, message, metadata) {
    return prisma.activityEvent.create({ data: { type: 'settings.email_updated', actorType: 'ADMIN', actorId, message, metadata } });
  }

  /** History line on the booking/gallery/client once an email went out. */
  static async logSent(row) {
    if (!row.clientId && !row.bookingId && !row.galleryId) return null;
    return prisma.activityEvent.create({
      data: {
        type: 'email.sent', actorType: 'SYSTEM', clientId: row.clientId, bookingId: row.bookingId, galleryId: row.galleryId,
        message: `Email sent: ${row.name} → ${row.toEmail}`, metadata: { outboxId: row.id, key: row.key },
      },
    });
  }
}

export default EmailModel;
