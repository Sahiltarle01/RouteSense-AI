import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "routesense_token";
const USER_KEY = "routesense_user";

const api = axios.create({ baseURL: API_BASE_URL });

// Auth endpoints are exempt from the auto-logout-on-401 behavior below --
// a wrong password on /login is an expected 401, not an expired session,
// and the login/register pages need to see and display that error
// themselves rather than have it silently redirected away.
const AUTH_ENDPOINTS_EXEMPT_FROM_AUTO_LOGOUT = ["/api/auth/login", "/api/auth/register"];

// Auth state lives ONLY in sessionStorage, deliberately -- sessionStorage
// is scoped per-tab, so each tab's requests carry that tab's own token.
// localStorage is shared across every tab of the same origin and was the
// root cause of one tab's login silently overwriting another tab's
// session; it must never be read/written for auth here.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthEndpoint = AUTH_ENDPOINTS_EXEMPT_FROM_AUTO_LOGOUT.some((path) => requestUrl.includes(path));

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Clears and redirects only THIS tab -- sessionStorage is already
      // tab-scoped, and window.location.href affects only this window,
      // not a cross-tab broadcast. No storage event or BroadcastChannel
      // is used here on purpose: an expired session in one tab must not
      // log out a different, still-valid session in another tab.
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

