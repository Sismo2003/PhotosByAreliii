// What Areli offers: services, their packages and which add-ons each one allows. Prices are
// integer cents. Booking snapshots (name, price, duration) mean editing the catalog never rewrites
// an existing booking. Rules: docs/api-services.md.
import prisma from '../config/db.js';
import { HttpError } from '../utils/http.js';

const MAX_PAGE_SIZE = 100;
const bookingsUse = (n) => (n === 1 ? '1 booking uses' : `${n} bookings use`);
const byPosition = [{ position: 'asc' }, { id: 'asc' }];

// "Family & couples" → "family-couples"
const slugify = (name) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'service';

async function uniqueSlug(tx, name) {
  const base = slugify(name);
  for (let n = 1; ; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await tx.service.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
}

const packageCard = (p, bookings = 0) => ({
  id: p.id,
  serviceId: p.serviceId,
  name: p.name,
  priceCents: p.priceCents,
  durationMinutes: p.durationMinutes,
  outfits: p.outfits,
  maxPeople: p.maxPeople,
  sessionCount: p.sessionCount,
  customDescription: p.customDescription,
  isFeatured: p.isFeatured,
  hidden: p.hidden,
  position: p.position,
  bookingCount: bookings,
});

// One row of the list: the service plus what the table shows (packages, price range, add-ons, bookings).
function listRow(s, bookingCount) {
  const visible = s.packages.filter((p) => !p.hidden);
  const prices = visible.map((p) => p.priceCents);
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status,
    position: s.position,
    packageCount: s.packages.length,
    hiddenPackageCount: s.packages.length - visible.length,
    fromCents: prices.length ? Math.min(...prices) : null,
    toCents: prices.length ? Math.max(...prices) : null,
    extraCount: s._count.extras,
    bookingCount,
  };
}

async function bookingCounts(where) {
  const rows = await prisma.booking.groupBy({ by: ['serviceId'], where, _count: { _all: true } });
  return new Map(rows.map((r) => [r.serviceId, r._count._all]));
}

class ServiceModel {
  // Services open for booking, in the admin's order (Bookings' Service filter).
  static async listLive() {
    return prisma.service.findMany({
      where: { status: 'LIVE' },
      select: { id: true, name: true, slug: true },
      orderBy: byPosition,
    });
  }

  // Every service, for pickers (add-on → "offered on"). Small by nature.
  static async options() {
    return prisma.service.findMany({ select: { id: true, name: true, status: true }, orderBy: byPosition });
  }

  static async summary() {
    const [services, live, packages, extras, activeExtras] = await Promise.all([
      prisma.service.count(),
      prisma.service.count({ where: { status: 'LIVE' } }),
      prisma.package.count({ where: { hidden: false, service: { status: 'LIVE' } } }),
      prisma.extra.count(),
      prisma.extra.count({ where: { active: true } }),
    ]);
    const counts = Object.fromEntries((await prisma.service.groupBy({ by: ['status'], _count: { _all: true } })).map((r) => [r.status, r._count._all]));
    return { services, live, packages, extras, activeExtras, counts: { all: services, LIVE: counts.LIVE ?? 0, HIDDEN: counts.HIDDEN ?? 0, DRAFT: counts.DRAFT ?? 0 } };
  }

  static async list({ q, status, sort, dir = 'asc', page = 1, pageSize = 25 }) {
    const take = Math.min(Math.max(Number(pageSize) || 25, 1), MAX_PAGE_SIZE);
    const currentPage = Math.max(Number(page) || 1, 1);
    const where = { ...(status ? { status } : {}), ...(q ? { name: { contains: q } } : {}) };
    const rows = await prisma.service.findMany({
      where,
      orderBy: byPosition,
      include: { packages: { select: { priceCents: true, hidden: true } }, _count: { select: { extras: true } } },
    });
    const counts = await bookingCounts({});
    const all = rows.map((s) => listRow(s, counts.get(s.id) ?? 0));

    // Services are few, so the derived columns (price, bookings) sort in memory over the whole set.
    if (sort) {
      const sign = dir === 'desc' ? -1 : 1;
      const key = { name: (r) => r.name.toLowerCase(), price: (r) => r.fromCents ?? Infinity, bookings: (r) => r.bookingCount }[sort];
      all.sort((a, b) => {
        const [x, y] = [key(a), key(b)];
        return sign * (x < y ? -1 : x > y ? 1 : 0) || a.position - b.position || a.id - b.id;
      });
    }
    const start = (currentPage - 1) * take;
    return { items: all.slice(start, start + take), total: all.length };
  }

  static async get(id) {
    const service = await prisma.service.findUnique({
      where: { id },
      include: { packages: { orderBy: byPosition }, extras: { select: { extraId: true } } },
    });
    if (!service) throw new HttpError(404, 'Service not found');
    const [perPackage, serviceBookings, allExtras] = await Promise.all([
      prisma.booking.groupBy({ by: ['packageId'], where: { serviceId: id }, _count: { _all: true } }),
      prisma.booking.count({ where: { serviceId: id } }),
      prisma.extra.findMany({ orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true, name: true, priceCents: true, minutes: true, active: true } }),
    ]);
    const used = new Map(perPackage.map((r) => [r.packageId, r._count._all]));
    const offered = new Set(service.extras.map((e) => e.extraId));
    return {
      id: service.id,
      name: service.name,
      slug: service.slug,
      status: service.status,
      position: service.position,
      bookingCount: serviceBookings,
      packages: service.packages.map((p) => packageCard(p, used.get(p.id) ?? 0)),
      // Every add-on, flagged: the detail page toggles which ones this service allows.
      extras: allExtras.map((e) => ({ ...e, offered: offered.has(e.id) })),
    };
  }

  static async create({ name, status = 'DRAFT' }) {
    const id = await prisma.$transaction(async (tx) => {
      const last = await tx.service.aggregate({ _max: { position: true } });
      const service = await tx.service.create({
        data: { name, status, slug: await uniqueSlug(tx, name), position: (last._max.position ?? -1) + 1 },
      });
      return service.id;
    });
    return ServiceModel.get(id);
  }

  static async update(id, data) {
    const { count } = await prisma.service.updateMany({ where: { id }, data });
    if (count === 0) throw new HttpError(404, 'Service not found');
    return ServiceModel.get(id);
  }

  // A service with bookings can only be hidden: the bookings still point at it.
  static async remove(id) {
    await prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({ where: { id }, select: { id: true } });
      if (!service) throw new HttpError(404, 'Service not found');
      const used = await tx.booking.count({ where: { serviceId: id } });
      if (used > 0) {
        throw new HttpError(409, `${bookingsUse(used)} this service, so it can be hidden but not deleted`, { bookingCount: used });
      }
      await tx.package.deleteMany({ where: { serviceId: id } }); // none has bookings
      await tx.service.delete({ where: { id } }); // extra_services cascade
    });
    return { id };
  }

  static async reorder(ids) {
    const all = await prisma.service.findMany({ select: { id: true }, orderBy: byPosition });
    if (ids.length !== all.length || !all.every((s) => ids.includes(s.id))) {
      throw new HttpError(400, 'The order has to list every service once');
    }
    await prisma.$transaction(ids.map((id, position) => prisma.service.update({ where: { id }, data: { position } })));
    return { ids };
  }

  // Which add-ons this service allows (replaces the whole set).
  static async setExtras(id, extraIds) {
    await prisma.$transaction(async (tx) => {
      if (!(await tx.service.findUnique({ where: { id }, select: { id: true } }))) throw new HttpError(404, 'Service not found');
      if ((await tx.extra.count({ where: { id: { in: extraIds } } })) !== extraIds.length) throw new HttpError(400, 'One of the add-ons does not exist');
      await tx.extraService.deleteMany({ where: { serviceId: id } });
      await tx.extraService.createMany({ data: extraIds.map((extraId) => ({ extraId, serviceId: id })) });
    });
    return ServiceModel.get(id);
  }

  // ── Packages ────────────────────────────────────────────────────────

  static async createPackage(serviceId, data) {
    return prisma.$transaction(async (tx) => {
      if (!(await tx.service.findUnique({ where: { id: serviceId }, select: { id: true } }))) throw new HttpError(404, 'Service not found');
      await ServiceModel.assertPackageName(tx, serviceId, data.name);
      const last = await tx.package.aggregate({ where: { serviceId }, _max: { position: true } });
      if (data.isFeatured) await tx.package.updateMany({ where: { serviceId }, data: { isFeatured: false } });
      const pkg = await tx.package.create({ data: { ...data, serviceId, position: (last._max.position ?? -1) + 1 } });
      return packageCard(pkg);
    });
  }

  static async updatePackage(id, data) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.package.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, 'Package not found');
      if (data.name && data.name !== current.name) await ServiceModel.assertPackageName(tx, current.serviceId, data.name);
      // One "Most booked" per service.
      if (data.isFeatured) await tx.package.updateMany({ where: { serviceId: current.serviceId, NOT: { id } }, data: { isFeatured: false } });
      const pkg = await tx.package.update({ where: { id }, data });
      return packageCard(pkg, await tx.booking.count({ where: { packageId: id } }));
    });
  }

  static async removePackage(id) {
    await prisma.$transaction(async (tx) => {
      if (!(await tx.package.findUnique({ where: { id }, select: { id: true } }))) throw new HttpError(404, 'Package not found');
      const used = await tx.booking.count({ where: { packageId: id } });
      if (used > 0) {
        throw new HttpError(409, `${bookingsUse(used)} this package, so it can be hidden but not deleted`, { bookingCount: used });
      }
      await tx.package.delete({ where: { id } });
    });
    return { id };
  }

  static async reorderPackages(serviceId, ids) {
    const all = await prisma.package.findMany({ where: { serviceId }, select: { id: true } });
    if (ids.length !== all.length || !all.every((p) => ids.includes(p.id))) {
      throw new HttpError(400, 'The order has to list every package of the service once');
    }
    await prisma.$transaction(ids.map((id, position) => prisma.package.update({ where: { id }, data: { position } })));
    return ServiceModel.get(serviceId);
  }

  static async assertPackageName(tx, serviceId, name) {
    if (await tx.package.findUnique({ where: { serviceId_name: { serviceId, name } }, select: { id: true } })) {
      throw new HttpError(409, 'This service already has a package with that name');
    }
  }
}

export default ServiceModel;
