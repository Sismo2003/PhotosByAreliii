// Add-ons ("Extra outfit change +$15", "Extra 30 minutes +$50"). `minutes` is the session time a
// unit adds, so a booking's duration = package + Σ(extra.minutes × quantity). Which services allow
// each add-on lives in ExtraService. Rules: docs/api-services.md.
import prisma from '../config/db.js';
import { HttpError } from '../utils/http.js';

const MAX_PAGE_SIZE = 100;
const bookingsUse = (n) => (n === 1 ? '1 booking uses' : `${n} bookings use`);
const byPosition = [{ position: 'asc' }, { id: 'asc' }];

const card = (e, bookingCount) => ({
  id: e.id,
  name: e.name,
  priceCents: e.priceCents,
  minutes: e.minutes,
  active: e.active,
  position: e.position,
  serviceIds: e.services.map((s) => s.serviceId),
  bookingCount,
});

async function counts() {
  const rows = await prisma.bookingExtra.groupBy({ by: ['extraId'], _sum: { quantity: true }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.extraId, r._count._all]));
}

class ExtraModel {
  static async list({ q, active, serviceId, sort, dir = 'asc', page = 1, pageSize = 25 }) {
    const take = Math.min(Math.max(Number(pageSize) || 25, 1), MAX_PAGE_SIZE);
    const currentPage = Math.max(Number(page) || 1, 1);
    const where = {
      ...(q ? { name: { contains: q } } : {}),
      ...(active ? { active: active === 'yes' } : {}),
      ...(serviceId ? { services: { some: { serviceId } } } : {}),
    };
    const [rows, used] = await Promise.all([
      prisma.extra.findMany({ where, orderBy: byPosition, include: { services: { select: { serviceId: true } } } }),
      counts(),
    ]);
    const all = rows.map((e) => card(e, used.get(e.id) ?? 0));
    if (sort) {
      const sign = dir === 'desc' ? -1 : 1;
      const key = { name: (r) => r.name.toLowerCase(), price: (r) => r.priceCents, bookings: (r) => r.bookingCount }[sort];
      all.sort((a, b) => {
        const [x, y] = [key(a), key(b)];
        return sign * (x < y ? -1 : x > y ? 1 : 0) || a.position - b.position || a.id - b.id;
      });
    }
    const start = (currentPage - 1) * take;
    return { items: all.slice(start, start + take), total: all.length };
  }

  static async get(id) {
    const extra = await prisma.extra.findUnique({ where: { id }, include: { services: { select: { serviceId: true } } } });
    if (!extra) throw new HttpError(404, 'Add-on not found');
    return card(extra, await prisma.bookingExtra.count({ where: { extraId: id } }));
  }

  static async create({ serviceIds = [], ...data }) {
    const id = await prisma.$transaction(async (tx) => {
      await ExtraModel.assertName(tx, data.name);
      if ((await tx.service.count({ where: { id: { in: serviceIds } } })) !== serviceIds.length) throw new HttpError(400, 'One of the services does not exist');
      const last = await tx.extra.aggregate({ _max: { position: true } });
      const extra = await tx.extra.create({
        data: { ...data, position: (last._max.position ?? -1) + 1, services: { create: serviceIds.map((serviceId) => ({ serviceId })) } },
      });
      return extra.id;
    });
    return ExtraModel.get(id);
  }

  static async update(id, data) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.extra.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, 'Add-on not found');
      if (data.name && data.name !== current.name) await ExtraModel.assertName(tx, data.name);
      await tx.extra.update({ where: { id }, data });
    });
    return ExtraModel.get(id);
  }

  // An add-on that was ever booked can only be switched off (BookingExtra points at it).
  static async remove(id) {
    await prisma.$transaction(async (tx) => {
      if (!(await tx.extra.findUnique({ where: { id }, select: { id: true } }))) throw new HttpError(404, 'Add-on not found');
      const used = await tx.bookingExtra.count({ where: { extraId: id } });
      if (used > 0) throw new HttpError(409, `${bookingsUse(used)} this add-on, so it can be switched off but not deleted`, { bookingCount: used });
      await tx.extra.delete({ where: { id } }); // extra_services cascade
    });
    return { id };
  }

  // Which services allow this add-on (replaces the whole set).
  static async setServices(id, serviceIds) {
    await prisma.$transaction(async (tx) => {
      if (!(await tx.extra.findUnique({ where: { id }, select: { id: true } }))) throw new HttpError(404, 'Add-on not found');
      if ((await tx.service.count({ where: { id: { in: serviceIds } } })) !== serviceIds.length) throw new HttpError(400, 'One of the services does not exist');
      await tx.extraService.deleteMany({ where: { extraId: id } });
      await tx.extraService.createMany({ data: serviceIds.map((serviceId) => ({ extraId: id, serviceId })) });
    });
    return ExtraModel.get(id);
  }

  static async reorder(ids) {
    const all = await prisma.extra.findMany({ select: { id: true } });
    if (ids.length !== all.length || !all.every((e) => ids.includes(e.id))) throw new HttpError(400, 'The order has to list every add-on once');
    await prisma.$transaction(ids.map((id, position) => prisma.extra.update({ where: { id }, data: { position } })));
    return { ids };
  }

  static async assertName(tx, name) {
    if (await tx.extra.findUnique({ where: { name }, select: { id: true } })) throw new HttpError(409, 'There is already an add-on with that name');
  }
}

export default ExtraModel;
