import { test, expect } from "@playwright/test";

// Requires both servers running:
//   backend:  uvicorn app.main:app --reload   (port 8000)
//   frontend: npm run dev                      (port 5173)
// Run with: npx playwright test

function uniqueEmail() {
  // Date.now() alone can collide if Playwright runs tests in parallel
  // workers (the default) and two registrations land in the same
  // millisecond -- adding a random component makes collision
  // astronomically unlikely rather than merely "unlikely".
  return `e2e_v2_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function registerAndLogin(page, email) {
  await page.goto("/register");
  await page.getByPlaceholder("Jane Doe").fill("E2E Trip User");
  await page.getByPlaceholder("jane@example.com").fill(email);
  await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
  await page.getByPlaceholder("At least 8 characters, 1 letter, 1 number").fill("Password123");
  await page.locator('input[type="password"]').nth(1).fill("Password123");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText("Registration successful. Please login.")).toBeVisible();

  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  await page.getByPlaceholder("jane@example.com").fill(email);
  await page.locator('input[type="password"]').fill("Password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("login and dashboard loads with real stats", async ({ page }) => {
  await registerAndLogin(page, uniqueEmail());
  await expect(page.getByText(/Welcome back, E2E Trip User/)).toBeVisible();
  await expect(page.getByText("Total Trips")).toBeVisible();
  await expect(page.getByText("No trips planned yet.")).toBeVisible();
});

test("create a trip, see it in My Trips, open details, update status", async ({ page }) => {
  await registerAndLogin(page, uniqueEmail());

  // Plan Trip
  await page.getByRole("link", { name: "Plan New Trip" }).click();
  await expect(page).toHaveURL(/\/trips\/new/);

  await page.getByPlaceholder("Medicine delivery to Tawang").fill("E2E Medicine Run");
  await page.locator("select").nth(0).selectOption("Guwahati");
  await page.locator("select").nth(1).selectOption("Tawang");
  await page.locator("select").nth(3).selectOption("critical"); // priority select
  await page.getByRole("button", { name: "Save Trip" }).click();

  // Should land on trip details
  await expect(page).toHaveURL(/\/trips\/\d+/);
  await expect(page.getByText("E2E Medicine Run")).toBeVisible();
  await expect(page.getByText("Guwahati")).toBeVisible();
  await expect(page.getByText("Tawang")).toBeVisible();

  // Trip appears in My Trips
  await page.getByRole("button", { name: "← Back to My Trips" }).click();
  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.getByText("E2E Medicine Run")).toBeVisible();

  // Open details again and update status Planned -> Active
  await page.getByText("E2E Medicine Run").click();
  await page.getByRole("button", { name: "Mark as Active" }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();

  // Active -> Completed
  await page.getByRole("button", { name: "Mark as Completed" }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
});

test("dashboard statistics update after creating a trip", async ({ page }) => {
  await registerAndLogin(page, uniqueEmail());

  await page.getByRole("link", { name: "Plan New Trip" }).click();
  await page.getByPlaceholder("Medicine delivery to Tawang").fill("Stat Check Trip");
  await page.locator("select").nth(0).selectOption("Guwahati");
  await page.locator("select").nth(1).selectOption("Shillong");
  await page.getByRole("button", { name: "Save Trip" }).click();
  await expect(page).toHaveURL(/\/trips\/\d+/);

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  // Total Trips stat card should now read 1, not 0.
  const totalCard = page.locator("text=Total Trips").locator("..");
  await expect(totalCard.getByText("1")).toBeVisible();
});

test("profile loads and can be updated", async ({ page }) => {
  await registerAndLogin(page, uniqueEmail());

  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.locator('input[value="E2E Trip User"]')).toBeVisible();

  const nameInput = page.locator('input[value="E2E Trip User"]');
  await nameInput.fill("Updated E2E Name");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();
});

test("logout redirects to login and protects dashboard", async ({ page }) => {
  await registerAndLogin(page, uniqueEmail());
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
