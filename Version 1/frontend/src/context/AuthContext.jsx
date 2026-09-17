import React, { createContext, useContext, useState } from "react";
import {
  getStoredToken,
  getStoredUser,
  isTokenExpired,
  loginUser,
  logoutUser,
  registerUser,
} from "../services/auth";

const AuthContext = createContext(null);

function getInitialUser() {
  const token = getStoredToken();
  if (!token || isTokenExpired(token)) {
    return null; // Expired/missing token -> treat as logged out, don't trust stale storage.
  }
  return getStoredUser();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser());

  async function login(email, password, rememberMe) {
    const loggedInUser = await loginUser({ email, password, rememberMe });
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(formValues) {
    return registerUser(formValues);
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
