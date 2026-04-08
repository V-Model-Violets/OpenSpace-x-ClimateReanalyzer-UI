// @ts-check
import { test, expect } from "@playwright/test";
import path from "path";

test.beforeEach(async ({ page }) => {
  const pagePath = path.join(process.cwd(), "pages", "temperature.html");
  await page.goto(`file://${pagePath}`);
  await page.waitForSelector(".calendar-picker", { timeout: 5000 });
});

// openspace connection tests
// the page tries to connect to localhost:4682 on load — since no server is running it will disconnect

test("status shows disconnected when openspace is not running", async ({
  page,
}) => {
  await page.waitForSelector("text=Disconnected from OpenSpace", {
    timeout: 10000,
  });
  await expect(page.locator("#connection-status")).toContainText(
    "Disconnected from OpenSpace",
  );
});

test("reconnect button appears after failed connection", async ({ page }) => {
  await page.waitForSelector("text=Disconnected from OpenSpace", {
    timeout: 10000,
  });
  await expect(page.locator('button:has-text("Reconnect")')).toBeVisible();
});

// submit without a date selected

test("submitting without a date shows an alert", async ({ page }) => {
  // listen for the alert before clicking
  page.on("dialog", async (dialog) => {
    expect(dialog.message()).toBe("Please select a date first.");
    await dialog.dismiss();
  });

  await page.click('button:has-text("Submit")');
});
