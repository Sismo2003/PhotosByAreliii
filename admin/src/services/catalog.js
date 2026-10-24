// Services & Add-ons API — /api/admin/services and /api/admin/extras (docs/api-services.md).
// What Areli offers; it has nothing to do with the public landing. Money travels as integer cents.
import axios from "utils/axios";

const SERVICES = "/admin/services";
const EXTRAS = "/admin/extras";

// ---- Services ----

/** Header numbers: { services, live, packages, extras, activeExtras, counts{all,LIVE,HIDDEN,DRAFT} }. */
export const getServicesSummary = () => axios.get(`${SERVICES}/summary`);

/** Every service, for pickers: [{ id, name, status }]. */
export const listServiceOptions = () => axios.get(`${SERVICES}/options`);

export const listServices = ({ q, status, sort, dir, page = 1, pageSize = 25 }) =>
  axios.get(SERVICES, {
    params: { q: q || undefined, status: status || undefined, sort: sort || undefined, dir: sort ? dir : undefined, page, pageSize },
  });

/** → the service with its packages and every add-on flagged `offered`. */
export const getService = (id) => axios.get(`${SERVICES}/${id}`);

/** { name, status? } */
export const createService = (body) => axios.post(SERVICES, body);

/** { name?, status? } */
export const updateService = (id, body) => axios.patch(`${SERVICES}/${id}`, body);

/** 409 when bookings use it: it can only be hidden. */
export const deleteService = (id) => axios.delete(`${SERVICES}/${id}`);

/** { ids } — every service id, in the new order. */
export const reorderServices = (ids) => axios.put(`${SERVICES}/order`, { ids });

/** { extraIds } — replaces which add-ons this service allows. */
export const setServiceExtras = (id, extraIds) => axios.put(`${SERVICES}/${id}/extras`, { extraIds });

// ---- Packages ----

/** { name, priceCents, durationMinutes, outfits?, maxPeople?, sessionCount?, customDescription?, isFeatured?, hidden? } */
export const createPackage = (serviceId, body) => axios.post(`${SERVICES}/${serviceId}/packages`, body);

export const updatePackage = (packageId, body) => axios.patch(`${SERVICES}/packages/${packageId}`, body);

export const deletePackage = (packageId) => axios.delete(`${SERVICES}/packages/${packageId}`);

/** { ids } — every package id of the service, in the new order. Answers with the service. */
export const reorderPackages = (serviceId, ids) => axios.put(`${SERVICES}/${serviceId}/packages/order`, { ids });

// ---- Add-ons ----

export const listAddons = ({ q, active, serviceId, sort, dir, page = 1, pageSize = 25 }) =>
  axios.get(EXTRAS, {
    params: {
      q: q || undefined,
      active: active || undefined,
      serviceId: serviceId || undefined,
      sort: sort || undefined,
      dir: sort ? dir : undefined,
      page,
      pageSize,
    },
  });

/** { name, priceCents, minutes?, active?, serviceIds? } */
export const createAddon = (body) => axios.post(EXTRAS, body);

export const updateAddon = (id, body) => axios.patch(`${EXTRAS}/${id}`, body);

/** 409 when it was ever booked: it can only be switched off. */
export const deleteAddon = (id) => axios.delete(`${EXTRAS}/${id}`);

/** { serviceIds } — replaces which services allow this add-on. */
export const setAddonServices = (id, serviceIds) => axios.put(`${EXTRAS}/${id}/services`, { serviceIds });

export const reorderAddons = (ids) => axios.put(`${EXTRAS}/order`, { ids });
