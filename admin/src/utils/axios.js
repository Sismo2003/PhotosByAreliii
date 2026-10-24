import axios from "axios";

// Same origin as the site: nginx serves the admin at /admin and proxies /api to the backend,
// so the httpOnly session cookie set by POST /api/auth/login is sent automatically.
// In development, vite.config.js proxies /api to http://localhost:4000.
const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// The AuthProvider registers what happens when a request comes back 401 (session over).
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

// Backend envelope: { message, data, error, error_message } (see the `backend` skill).
// Resolve with `data`; reject with { status, message, code, details }.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 on any call but the sign-in family (login, /me at startup, logout) = the session
    // expired or was revoked (password changed elsewhere): send the person to the login.
    if (error.response?.status === 401 && !error.config?.url?.startsWith("/auth/")) onUnauthorized?.();
    const body = error.response?.data;
    return Promise.reject({
      status: error.response?.status ?? 0,
      message:
        body?.error_message ||
        body?.error?.message ||
        (error.response ? "Something went wrong" : "Can't reach the server"),
      code: body?.error?.code,
      details: body?.details ?? body?.error?.details,
    });
  },
);

export default axiosInstance;
