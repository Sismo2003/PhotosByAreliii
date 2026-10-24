// Import Dependencies
import { isRouteErrorResponse, useRouteError } from "react-router";

// Local Imports
import ErrorPage from "./ErrorPage";

// ----------------------------------------------------------------------

// A page is a lazy chunk. It fails to load (not a bug in the page) when the dev server has just
// re-optimized its dependencies, or when a new deploy replaced the hashed files an open tab still
// points to. Reloading once fetches the right ones, so the error screen never shows.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Outdated Optimize Dep|error loading dynamically/i;
const RELOAD_KEY = "pba-chunk-reload";
const RELOAD_WINDOW_MS = 15_000; // a second failure inside this window is a real error: show it

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false; // storage blocked: don't risk a reload loop
  }
  window.location.reload();
  return true;
}

function RootErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  if (status === 500) console.error(error);
  if (status === 500 && CHUNK_ERROR.test(String(error?.message ?? error)) && reloadOnce()) return null;
  return <ErrorPage status={status} />;
}

export default RootErrorBoundary;
