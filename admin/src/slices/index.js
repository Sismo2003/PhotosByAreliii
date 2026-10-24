// Root re-exports — mirrors rebate/FrontEnd/src/slices/index.js (the rootReducer for Redux,
// here a list of hooks for Zustand). New domains: add a folder under slices/<domain>/ and
// re-export its public surface here.
export * from "./bookings";
export * from "./clients";
export * from "./galleries";
export * from "./services";
