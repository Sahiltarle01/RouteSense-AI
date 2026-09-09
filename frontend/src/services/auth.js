import api from "./api";

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

  // "Remember me" -> localStorage (survives browser close).
  // Otherwise -> sessionStorage (cleared when the tab/browser closes).
  const store = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;
  other.removeItem("routesense_token");
  other.removeItem("routesense_user");
  store.setItem("routesense_token", data.access_token);
  store.setItem("routesense_user", JSON.stringify(data.user));

  return data.user;
}

export async function logoutUser() {
  try {
    await api.post("/api/auth/logout");
  } finally {
    localStorage.removeItem("routesense_token");
    localStorage.removeItem("routesense_user");
    sessionStorage.removeItem("routesense_token");
    sessionStorage.removeItem("routesense_user");
  }
}

export function getStoredUser() {
  const raw = localStorage.getItem("routesense_user") || sessionStorage.getItem("routesense_user");
  return raw ? JSON.parse(raw) : null;
}

export function getStoredToken() {
  return localStorage.getItem("routesense_token") || sessionStorage.getItem("routesense_token");
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
