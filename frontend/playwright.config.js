import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
  },
  // Requires both the backend (port 8000) and frontend (port 5173) to
  // already be running -- this suite does not start them for you, since
  // the backend needs its own Python environment.
});
