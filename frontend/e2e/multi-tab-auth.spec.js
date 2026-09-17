import { test, expect } from "@playwright/test";

// Requires both servers running:
//   backend:  uvicorn app.main:app --reload   (port 8000)
//   frontend: npm run dev                      (port 5173)
// Run with: npx playwright test
//
// ROOT CAUSE NOTE (fixed here): an earlier version of this test asserted
// tabA.reload() would land on /dashboard. That was never true -- by that
// point in the test, Tab A had already navigated to /trips/{id} to create
// a trip and never navigated back to /dashboard. Reload correctly
// preserves the CURRENT route in a single-page app (that's standard,
// correct behavior -- verified against ProtectedRoute.jsx and
// AuthContext.jsx, neither of which contains any "redirect an
// authenticated user back to /dashboard" logic, nor should they: that
// would break normal deep-linking/bookmarking). The bug was in the
// test's assumption, not the application. This version asserts the REAL
// requirement instead: identity and data-ownership survive reload,
// regardless of which route each tab happens to be on.

function uniqueEmail(label) {
  // Date.now() alone can collide if Playwright runs tests in parallel
  // workers (the default) and two registrations land in the same
  // millisecond -- adding a random component makes collision
  // astronomically unlikely rather than merely "unlikely".
  return `e2e_multitab_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function register(page, name, email) {
  await page.goto("/register");
  await page.getByPlaceholder("Jane Doe").fill(name);
  await page.getByPlaceholder("jane@example.com").fill(email);
  await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
  await page.getByPlaceholder("At least 8 characters, 1 letter, 1 number").fill("Password123");
  await page.locator('input[type="password"]').nth(1).fill("Password123");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText("Registration successful. Please login.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
}

async function login(page, email) {
  await page.getByPlaceholder("jane@example.com").fill(email);
  await page.locator('input[type="password"]').fill("Password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function registerAndLogin(page, name, email) {
  await register(page, name, email);
  await login(page, email);
}

// Route-independent identity check: the sidebar's user summary (name +
// email) is part of AppShell, which wraps EVERY authenticated page --
// unlike a "Welcome back, X" heading that only exists on /dashboard,
// this works regardless of which route the tab is currently on, which is
// exactly what's needed after a reload that legitimately stays on a
// non-dashboard route.
async function expectAuthenticatedAs(page, email) {
  await expect(page.getByText(email)).toBeVisible();
}

test("multi-tab session isolation: independent identity, data ownership, and logout across two tabs", async ({ context }) => {
  // Two `page`s from the SAME context == two tabs of the same browser
  // window, sharing cookies/localStorage exactly like a real user's two
  // tabs would. This is deliberately NOT two separate browser contexts --
  // that would trivially "pass" without proving anything, since separate
  // contexts don't share storage at all.
  const tabA = await context.newPage();
  const tabB = await context.newPage();

  const emailA = uniqueEmail("a");
  const emailB = uniqueEmail("b");

  // A. User A login in Tab A
  await registerAndLogin(tabA, "User A", emailA);
  await expectAuthenticatedAs(tabA, emailA);

  // B. User B login in Tab B -- must not disturb Tab A.
  await registerAndLogin(tabB, "User B", emailB);
  await expectAuthenticatedAs(tabB, emailB);
  await expectAuthenticatedAs(tabA, emailA);

  // C. Create a trip belonging only to User A.
  await tabA.getByRole("link", { name: "Plan New Trip" }).click();
  await tabA.getByPlaceholder("Medicine delivery to Tawang").fill("User A Only Trip");
  await tabA.locator("select").nth(0).selectOption("Guwahati");
  await tabA.locator("select").nth(1).selectOption("Shillong");
  await tabA.getByRole("button", { name: "Save Trip" }).click();
  await expect(tabA).toHaveURL(/\/trips\/(\d+)/);

  // Extract the real trip id from the URL Playwright actually navigated
  // to -- never hardcoded, since a fresh id is created every run.
  const tripUrlMatch = tabA.url().match(/\/trips\/(\d+)/);
  const tripAId = tripUrlMatch[1];

  // D. Verify User A can see it (both on the details page just navigated
  // to, and in the My Trips list).
  await expect(tabA.getByText("User A Only Trip")).toBeVisible();
  await tabA.getByRole("link", { name: "My Trips", exact: true }).click();
  await expect(tabA.getByText("User A Only Trip")).toBeVisible();

  // E. Verify User B cannot see it in their own My Trips list.
  await tabB.getByRole("link", { name: "My Trips", exact: true }).click();
  await expect(tabB).toHaveURL(/\/trips$/);
  await expect(tabB.getByText("User A Only Trip")).not.toBeVisible();

  // Navigate Tab A back to the trip's own details page before reloading,
  // so the reload-preserves-route assertion below has a real route (not
  // the list page) to verify against.
  await tabA.getByText("User A Only Trip").click();
  await expect(tabA).toHaveURL(new RegExp(`/trips/${tripAId}$`));

  // F/G/H. Reload Tab A -- must remain authenticated as User A, on the
  // SAME route (reload legitimately preserves the current route in an
  // SPA -- this is not a bug), and still showing only User A's own data.
  await tabA.reload();
  await expect(tabA).toHaveURL(new RegExp(`/trips/${tripAId}$`));
  await expectAuthenticatedAs(tabA, emailA);
  await expect(tabA.getByText("User A Only Trip")).toBeVisible();

  // I/J/K. Reload Tab B -- must remain authenticated as User B, and
  // still unable to see User A's trip.
  await tabB.reload();
  await expect(tabB).toHaveURL(/\/trips$/);
  await expectAuthenticatedAs(tabB, emailB);
  await expect(tabB.getByText("User A Only Trip")).not.toBeVisible();

  // L/M. Direct URL access from Tab B to User A's trip must be rejected,
  // not merely "not linked to" -- this is the real security boundary,
  // enforced server-side (see backend/app/routers/trips.py's
  // _get_owned_trip_or_404), not just a missing UI link.
  await tabB.goto(`/trips/${tripAId}`);
  await expect(tabB.getByText("Trip not found.")).toBeVisible();
  await expect(tabB.getByText("User A Only Trip")).not.toBeVisible();

  // N. Logging out Tab B must not affect Tab A's session.
  await tabB.getByRole("button", { name: "Log out" }).click();
  await expect(tabB).toHaveURL(/\/login/);
  await expectAuthenticatedAs(tabA, emailA);

  // Re-login Tab B (same already-registered account -- no new
  // registration, no collision risk) so the reverse direction can also
  // be tested against a genuinely logged-in tab, not an assumption.
  await login(tabB, emailB);
  await expectAuthenticatedAs(tabB, emailB);

  // O. Logging out Tab A must not affect Tab B's session.
  await tabA.getByRole("button", { name: "Log out" }).click();
  await expect(tabA).toHaveURL(/\/login/);
  await expectAuthenticatedAs(tabB, emailB);

  await tabA.close();
  await tabB.close();
});
