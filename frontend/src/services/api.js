import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL: API_BASE_URL });

// Auth endpoints are exempt from the auto-logout-on-401 behavior below --
// a wrong password on /login is an expected 401, not an expired session,
// and the login/register pages need to see and display that error
// themselves rather than have it silently redirected away.
const AUTH_ENDPOINTS_EXEMPT_FROM_AUTO_LOGOUT = ["/api/auth/login", "/api/auth/register"];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("routesense_token") || sessionStorage.getItem("routesense_token");
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
      localStorage.removeItem("routesense_token");
      localStorage.removeItem("routesense_user");
      sessionStorage.removeItem("routesense_token");
      sessionStorage.removeItem("routesense_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
