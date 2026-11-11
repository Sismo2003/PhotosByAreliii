// Prices on the site are whole-dollar starting prices (shared/services.js): "$160".
export const money = (dollars: number): string => `$${dollars.toLocaleString("en-US")}`;
