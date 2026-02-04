import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("http://localhost:8000");

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Climate Reanalyzer/);
});

test("main page loads with navigation buttons", async ({ page }) => {
  await page.goto("http://localhost:8000");

  // Check for main title
  await expect(
    page.getByRole("heading", { name: /Climate Reanalyzer/ }),
  ).toBeVisible();

  // Check navigation buttons are visible
  await expect(
    page.getByRole("button", { name: /Daily Temperature/ }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: /Precipitation/ }),
  ).toBeVisible();
});

test("daily temperature page navigation", async ({ page }) => {
  await page.goto("http://localhost:8000");

  // Click the Daily Temperature button
  await page.getByRole("button", { name: /Daily Temperature/ }).click();

  // Expects page to navigate to daily temperature page
  await expect(page).toHaveURL(/daily-temperature\.html/);

  // Check for page title
  await expect(
    page.getByRole("heading", { name: /Daily Temperature/ }),
  ).toBeVisible();
});
