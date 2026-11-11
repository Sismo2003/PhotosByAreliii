// The price of a booking, read from the catalog — never from the request (docs/formulario-publico-booking.md §1.4).
// Shared by the admin's "New booking" (models/booking-create.model.js) and the public /book form
// (models/public-booking.model.js), so both freeze the same numbers.
//
//   total    = package + Σ(extra price × quantity) + travel fee + adjustment
//   duration = package minutes + Σ(extra minutes × quantity)     ("every 30 mins added is +$50")
//   deposit  = total × StudioSettings.depositPercent / 100, rounded to the cent
import { HttpError } from '../utils/http.js';

/**
 * @param db        Prisma client or transaction
 * @param input     { serviceId, packageId, extras: [{ extraId, quantity }], travelFeeCents, adjustmentCents }
 * @param settings  StudioSettings with fallbacks (withSettingsFallback)
 * @param options   { bookableOnly } — the public form only accepts LIVE services and visible packages
 */
export async function priceBooking(db, input, settings, { bookableOnly = false } = {}) {
  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service || (bookableOnly && service.status !== 'LIVE')) {
    throw new HttpError(400, 'That service does not exist', { code: 'SERVICE_UNAVAILABLE' });
  }
  const pkg = await db.package.findUnique({ where: { id: input.packageId } });
  if (!pkg || pkg.serviceId !== service.id || (bookableOnly && pkg.hidden)) {
    throw new HttpError(400, 'That package does not belong to the service', { code: 'PACKAGE_UNAVAILABLE' });
  }

  // The same extra twice in the list counts as one line with both quantities added.
  const wanted = new Map();
  for (const e of input.extras ?? []) wanted.set(e.extraId, (wanted.get(e.extraId) ?? 0) + e.quantity);
  const extras = wanted.size
    ? await db.extra.findMany({ where: { id: { in: [...wanted.keys()] }, active: true }, include: { services: true } })
    : [];
  if (extras.length !== wanted.size) throw new HttpError(400, 'One of the extras is not available', { code: 'EXTRA_UNAVAILABLE' });
  for (const e of extras) {
    if (!e.services.some((s) => s.serviceId === service.id)) {
      throw new HttpError(400, `"${e.name}" is not offered for ${service.name}`, { code: 'EXTRA_UNAVAILABLE' });
    }
  }

  const extrasCents = extras.reduce((sum, e) => sum + e.priceCents * wanted.get(e.id), 0);
  const durationMinutes = pkg.durationMinutes + extras.reduce((sum, e) => sum + e.minutes * wanted.get(e.id), 0);
  const travelFeeCents = input.travelFeeCents ?? 0;
  const adjustmentCents = input.adjustmentCents ?? 0;
  const totalCents = pkg.priceCents + extrasCents + travelFeeCents + adjustmentCents;
  if (totalCents < 0) throw new HttpError(400, 'The adjustment is larger than the total');
  const depositCents = Math.round((totalCents * settings.depositPercent) / 100);

  return {
    service,
    pkg,
    durationMinutes,
    travelFeeCents,
    adjustmentCents,
    totalCents,
    depositCents,
    // BookingExtra rows: name and price of ONE unit frozen, plus the quantity.
    extraLines: extras.map((e) => ({ extraId: e.id, nameSnapshot: e.name, priceCentsSnapshot: e.priceCents, quantity: wanted.get(e.id) })),
  };
}
