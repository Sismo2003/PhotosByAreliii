// Price preview of the New booking form. The server recomputes everything from the catalog
// (Backend/models/booking-create.model.js), so this only has to match it for display.
import { nowInStudio } from "utils/date";

/** "87.50" / "$1,200" / "-20" → integer cents; 0 when empty; null when it isn't an amount. */
export function dollarsToCents(value, { allowNegative = false } = {}) {
  const clean = String(value ?? "").replace(/[$,\s]/g, "");
  if (clean === "") return 0;
  const ok = (allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/).test(clean);
  return ok ? Math.round(Number(clean) * 100) : null;
}

export function computePrice({ pkg, extras, extraQty, travelFee, adjustment, depositPercent }) {
  const extrasCents = extras.reduce((sum, e) => sum + e.priceCents * (extraQty[e.id] ?? 0), 0);
  const travelCents = dollarsToCents(travelFee) ?? 0;
  const adjustmentCents = dollarsToCents(adjustment, { allowNegative: true }) ?? 0;
  const packageCents = pkg?.priceCents ?? 0;
  const totalCents = Math.max(0, packageCents + extrasCents + travelCents + adjustmentCents);
  return {
    packageCents,
    extrasCents,
    travelCents,
    adjustmentCents,
    totalCents,
    depositCents: Math.round((totalCents * depositPercent) / 100),
  };
}

export const todayInput = () => nowInStudio().toFormat("yyyy-LL-dd");
