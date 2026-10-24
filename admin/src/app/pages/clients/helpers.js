// Non-component helpers shared by the Clients pages (kept out of .jsx for Fast Refresh).
export const clientPath = (id) => `/clients/${id}`;
export const NEW_CLIENT_PATH = "/clients/new";

/** "Mía Castillo" → "MC", "The Ortega family" → "TO"; "·" when there is no name. */
export function initials(name) {
  const letters = String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase());
  return letters.join("") || "·";
}
