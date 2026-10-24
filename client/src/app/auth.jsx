// Session for the portal and the shared sign-in page. The session lives in the httpOnly cookie
// set by the backend; nothing is stored in the browser. The role always comes from the API.
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

import axios, { setUnauthorizedHandler } from "utils/axios";
import { ADMIN_HOME, ADMIN_ORIGIN, CLIENT_HOME } from "constants/app.constant";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // status: loading | guest | user. notice: why they're back on the sign-in page.
  const [state, setState] = useState({ status: "loading", user: null, notice: null });

  useEffect(() => {
    axios
      .get("/auth/me")
      .then(({ data }) => setState({ status: data.data ? "user" : "guest", user: data.data, notice: null }))
      .catch(() => setState({ status: "guest", user: null, notice: null }));
  }, []);

  // A 401 from any portal request = the session ended (expired, password changed elsewhere).
  useEffect(() => {
    setUnauthorizedHandler(() =>
      setState((s) => (s.user ? { status: "guest", user: null, notice: "sessionEnded" } : s)),
    );
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    const { data } = await axios.post("/auth/login", { identifier, password });
    setState({ status: "user", user: data.data, notice: null });
    return data.data;
  }, []);

  const logout = useCallback(async () => {
    await axios.post("/auth/logout").catch(() => {});
    setState({ status: "guest", user: null, notice: null });
  }, []);

  const setUser = useCallback((user) => setState((s) => ({ ...s, user })), []);

  const value = useMemo(() => ({ ...state, login, logout, setUser }), [state, login, logout, setUser]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Only paths of our own apps: "/client/galleries/x" yes; "//evil.com", "https://…", "/\evil" no.
const isSafePath = (url) => typeof url === "string" && /^\/(?![/\\])/.test(url);

/**
 * Where a signed-in person goes after the sign-in page.
 * Returns { href } for the admin (another app: full page load) or { to } inside this app.
 */
export function destinationFor(user, redirect) {
  if (user.role === "ADMIN") {
    const to = isSafePath(redirect) && redirect.startsWith("/admin") ? redirect : null;
    return { href: to ? `${ADMIN_ORIGIN}${to}` : ADMIN_HOME };
  }
  if (user.mustChangePassword) return { to: `${CLIENT_HOME}/welcome` };
  return { to: isSafePath(redirect) && redirect.startsWith(CLIENT_HOME) ? redirect : CLIENT_HOME };
}
