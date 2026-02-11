// @ts-check
import { test, expect } from "@playwright/test";
import path from "path";

test("Daily Temperature user flow - select date and view map tiles", async ({
  page,
}) => {
  // Navigate to the main page using file URL
  const indexPath = path.join(process.cwd(), "index.html");
  await page.goto(`file://${indexPath}`);

  // Verify we're on the main page
  await expect(page.locator("h1")).toContainText("Climate Reanalyzer");

  // Click on Daily Temperature button
  await page.click('button:has-text("Daily Temperature")');

  // Wait for navigation to daily temperature page
  await expect(page).toHaveURL(/daily-temperature\.html/);
  await expect(page.locator("h1")).toContainText("Daily Temperature");

  // Wait for calendar picker to load
  await page.waitForSelector(".calendar-picker", { timeout: 5000 });

  // Select year 2023
  await page.selectOption("#yearSelect", "2023");

  // Select June (month index 5)
  await page.selectOption("#monthSelect", "5");

  // Click on day 15
  await page.click('.calendar-day:has-text("15"):not(.empty)');

  // Verify date selection is displayed
  await expect(page.locator("#selectedDateDisplay")).toContainText(
    "Selected: 2023-06-15",
  );

  // Submit the date
  await page.click('button:has-text("Submit")');

  // Wait for and verify modal opens
  await expect(page.locator("#mapModal.show")).toBeVisible({ timeout: 5000 });
});
