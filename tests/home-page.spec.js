// @ts-check
import { test, expect } from "@playwright/test";
import path from "path";

test.beforeEach(async ({ page }) => {
  const indexPath = path.join(process.cwd(), "index.html");
  await page.goto(`file://${indexPath}`);
});

test("home page - all 7 nav buttons are visible", async ({ page }) => {
  await expect(page.locator("button.nav-button")).toHaveCount(7);
});

test("home page - nav buttons have correct labels", async ({ page }) => {
  await expect(page.locator("button.nav-button").nth(0)).toContainText(
    "Air Temperature",
  );
  await expect(page.locator("button.nav-button").nth(1)).toContainText(
    "Air Temperature Anomaly",
  );
  await expect(page.locator("button.nav-button").nth(2)).toContainText(
    "Sea Surface Temperature",
  );
  await expect(page.locator("button.nav-button").nth(3)).toContainText(
    "Sea Level Pressure",
  );
  await expect(page.locator("button.nav-button").nth(4)).toContainText(
    "Precipitation",
  );
  await expect(page.locator("button.nav-button").nth(5)).toContainText("Wind");
  await expect(page.locator("button.nav-button").nth(6)).toContainText(
    "Jetstream",
  );
});

test("Air Temperature button navigates to temperature page", async ({
  page,
}) => {
  await page.locator("button.nav-button").nth(0).click();
  await expect(page).toHaveURL(/\/temperature\.html$/);
});

test("Air Temperature Anomaly button navigates to temperature anomaly page", async ({
  page,
}) => {
  await page.locator("button.nav-button").nth(1).click();
  await expect(page).toHaveURL(/\/temperature-anomaly\.html$/);
});

test("Sea Surface Temperature button navigates to sea surface temperature page", async ({
  page,
}) => {
  await page.locator("button.nav-button").nth(2).click();
  await expect(page).toHaveURL(/\/sea-surface-temperature\.html$/);
});

test("Sea Level Pressure button navigates to sea level pressure page", async ({
  page,
}) => {
  await page.locator("button.nav-button").nth(3).click();
  await expect(page).toHaveURL(/\/sea-level-pressure\.html$/);
});

test("Precipitation button navigates to precipitation page", async ({
  page,
}) => {
  await page.locator("button.nav-button").nth(4).click();
  await expect(page).toHaveURL(/\/precipitation\.html$/);
});

test("Wind button navigates to wind page", async ({ page }) => {
  await page.locator("button.nav-button").nth(5).click();
  await expect(page).toHaveURL(/\/wind\.html$/);
});

test("Jetstream button navigates to jetstream page", async ({ page }) => {
  await page.locator("button.nav-button").nth(6).click();
  await expect(page).toHaveURL(/\/jetstream\.html$/);
});
