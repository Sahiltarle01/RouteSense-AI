import { test, expect } from "@playwright/test";

// Requires both servers running:
//   backend:  uvicorn app.main:app --reload   (port 8000)
//   frontend: npm run dev                      (port 5173)
// Run with: npx playwright test

function uniqueEmail() {
  return `e2e_${Date.now()}@example.com`;
}

test("landing page shows Get Started and Login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("RouteSense AI")).toBeVisible();
  await expect(page.getByRole("link", { name: "Get Started" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" }).first()).toBeVisible();
});

test("full flow: register -> login -> dashboard -> logout -> protected redirect", async ({ page }) => {
  const email = uniqueEmail();

  await page.goto("/register");
  await page.getByPlaceholder("Jane Doe").fill("E2E Test User");
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
  await expect(page.getByText("Welcome, E2E Test User")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  // Protected route must reject direct access after logout.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("duplicate registration shows an error, not a crash", async ({ page }) => {
  const email = uniqueEmail();

  async function fillRegisterForm() {
    await page.getByPlaceholder("Jane Doe").fill("Dup User");
    await page.getByPlaceholder("jane@example.com").fill(email);
    await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
    await page.getByPlaceholder("At least 8 characters, 1 letter, 1 number").fill("Password123");
    await page.locator('input[type="password"]').nth(1).fill("Password123");
    await page.getByRole("button", { name: "Create Account" }).click();
  }

  await page.goto("/register");
  await fillRegisterForm();
  await expect(page.getByText("Registration successful. Please login.")).toBeVisible();

  await page.goto("/register");
  await fillRegisterForm();
  await expect(page.getByText(/already exists/i)).toBeVisible();
});

test("invalid password shows a clear error", async ({ page }) => {
  const email = uniqueEmail();

  await page.goto("/register");
  await page.getByPlaceholder("Jane Doe").fill("Wrong Pass User");
  await page.getByPlaceholder("jane@example.com").fill(email);
  await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
  await page.getByPlaceholder("At least 8 characters, 1 letter, 1 number").fill("Password123");
  await page.locator('input[type="password"]').nth(1).fill("Password123");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText("Registration successful. Please login.")).toBeVisible();

  await page.goto("/login");
  await page.getByPlaceholder("jane@example.com").fill(email);
  await page.locator('input[type="password"]').fill("WrongPassword999");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(/incorrect password/i)).toBeVisible();
});

test("unknown email shows account-not-found error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("jane@example.com").fill("no_such_user_e2e@example.com");
  await page.locator('input[type="password"]').fill("Password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(/no account found/i)).toBeVisible();
});
