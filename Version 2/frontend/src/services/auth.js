import api from "./api";

const TOKEN_KEY = "routesense_token";
const USER_KEY = "routesense_user";

export async function registerUser({ fullName, email, phoneNumber, password, confirmPassword }) {
  const { data } = await api.post("/api/auth/register", {
    full_name: fullName,
    email,
    phone_number: phoneNumber,
    password,
    confirm_password: confirmPassword,
  });
  return data;
}

export async function loginUser({ email, password, rememberMe }) {
  const { data } = await api.post("/api/auth/login", { email, password, remember_me: rememberMe });

  // Auth state is ALWAYS sessionStorage -- sessionStorage is scoped to a
  // single tab/browsing context (unlike localStorage, which is shared
  // across every tab of the same origin), so each tab keeps its own
  // independent session. "Remember me" still controls the JWT's lifetime
  // (a longer-lived token from the backend, see remember_me above) --
  // it no longer controls *where* the token is stored, since storing it
  // in localStorage was exactly what let one tab's login overwrite
  // another tab's session. A tab closed and reopened will need to log in
  // again even with "remember me" checked; that's the necessary trade-off
  // for real per-tab isolation.
  sessionStorage.setItem(TOKEN_KEY, data.access_token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));

  return data.user;
}

export async function logoutUser() {
  try {
    await api.post("/api/auth/logout");
  } finally {
    // Only this tab's session is cleared -- sessionStorage is already
    // scoped to this tab, so there is nothing cross-tab to worry about.
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
}

export function getStoredUser() {
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

/** Decodes a JWT's payload without verifying the signature -- fine for
 * client-side "is this expired" checks; the server still verifies
 * signature + expiry on every real request. */
export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

