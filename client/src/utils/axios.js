import axios from "axios";

// Same origin as the site: nginx serves the portal at /client and proxies /api to the backend,
// so the httpOnly session cookie set by POST /api/auth/login is sent automatically.
// In development, vite.config.js proxies /api to http://localhost:4000. Same envelope handling
// as admin/src/utils/axios.js.
const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

// Backend envelope: { message, data, error, error_message }.
// Reject with { status, message, code, details }.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith("/auth/")) onUnauthorized?.();
    const body = error.response?.data;
    return Promise.reject({
      status: error.response?.status ?? 0,
      message: body?.error_message || (error.response ? "Something went wrong" : "Can't reach the server"),
      code: body?.details?.code,
      details: body?.details,
    });
  },
);

export default axiosInstance;
