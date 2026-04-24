// @ts-check
import { test, expect } from "@playwright/test";
import path from "path";

//helper function for selection tests
async function selectCustomOption(page, selector, index) {
  await page.click(`${selector} .selected`);
  const options = page.locator(`${selector} .options div`);
  await options.nth(index).click();
}

test.beforeEach(async ({ page }) => {
  const pagePath = path.join(process.cwd(), "pages", "temperature.html");
  await page.goto(`file://${pagePath}`);
  await page.waitForSelector(".calendar-picker", { timeout: 5000 });
});

// ── Structure ──────────────────────────────────────────────────────────────

test("calendar renders all 7 weekday headers", async ({ page }) => {
  const weekdays = await page.locator(".calendar-weekday").allTextContents();
  expect(weekdays).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
});

test("calendar renders a month select and year select", async ({ page }) => {
  await expect(page.locator("#monthSelect")).toBeVisible();
  await expect(page.locator("#yearSelect")).toBeVisible();
});

test("calendar renders previous and next navigation buttons", async ({
  page,
}) => {
  await expect(page.locator("#prevMonth")).toBeVisible();
  await expect(page.locator("#nextMonth")).toBeVisible();
});

test("calendar renders day cells for the current month", async ({ page }) => {
  const dayCells = page.locator(".calendar-day:not(.empty)");
  const count = await dayCells.count();
  // Every month has between 28 and 31 days
  expect(count).toBeGreaterThanOrEqual(28);
  expect(count).toBeLessThanOrEqual(31);
});

test("initial selected date display shows 'No date selected'", async ({
  page,
}) => {
  await expect(page.locator("#selectedDateDisplay")).toContainText(
    "No date selected",
  );
});

// ── Navigation ─────────────────────────────────────────────────────────────

test("next month button advances the month by one", async ({ page }) => {
  const initialMonth = await page
    .locator("#monthSelect")
    .getAttribute("data-value");
  await page.click("#nextMonth");
  const newMonth = await page
    .locator("#monthSelect")
    .getAttribute("data-value");
  const expected = (parseInt(initialMonth) + 1) % 12;
  expect(parseInt(newMonth)).toBe(expected);
});

test("previous month button moves the month back by one", async ({ page }) => {
  const initialMonth = await page
    .locator("#monthSelect")
    .getAttribute("data-value");
  await page.click("#prevMonth");
  const newMonth = await page
    .locator("#monthSelect")
    .getAttribute("data-value");
  const expected = (parseInt(initialMonth) + 11) % 12; // +11 mod 12 == -1 mod 12
  expect(parseInt(newMonth)).toBe(expected);
});

test("next month wraps from December (11) to January (0) and increments year", async ({
  page,
}) => {
  // Navigate to December
  await selectCustomOption(page, "#monthSelect", 11);
  const initialYear = await page
    .locator("#yearSelect")
    .getAttribute("data-value");

  await page.click("#nextMonth");

  await expect(page.locator("#monthSelect")).toHaveAttribute("data-value", "0");
  const newYear = await page.locator("#yearSelect").getAttribute("data-value");
  expect(parseInt(newYear)).toBe(parseInt(initialYear) + 1901);
});

test("previous month wraps from January (0) to December (11) and decrements year", async ({
  page,
}) => {
  // Navigate to January
  await selectCustomOption(page, "#monthSelect", 0);
    const initialYear = await page
    .locator("#yearSelect")
    .getAttribute("data-value");

  await page.click("#prevMonth");

  await expect(page.locator("#monthSelect")).toHaveAttribute("data-value", "11");
  const newYear = await page.locator("#yearSelect").getAttribute("data-value");
  expect(parseInt(newYear)).toBe(parseInt(initialYear) + 1899);
});

test("changing the month select re-renders day cells", async ({ page }) => {
  // February always has fewer days than July
  await selectCustomOption(page, "#yearSelect", 2024 - 1900); // leap year
  await selectCustomOption(page, "#monthSelect", 1); // February
  const febDays = await page.locator(".calendar-day:not(.empty)").count();
  expect(febDays).toBe(29); // 2024 is a leap year

  await selectCustomOption(page, "#monthSelect", 6); // July
  const julDays = await page.locator(".calendar-day:not(.empty)").count();
  expect(julDays).toBe(31);
});

// ── Date Selection ─────────────────────────────────────────────────────────

test("clicking a day marks it as selected", async ({ page }) => {
  const firstDay = page.locator(".calendar-day:not(.empty)").first();
  await firstDay.click();
  await expect(firstDay).toHaveClass(/selected/);
});

test("clicking a day updates the selected date display", async ({ page }) => {
  await page.locator(".calendar-day:not(.empty)").first().click();
  await expect(page.locator("#selectedDateDisplay")).toContainText("Selected:");
});

test("selecting a date returns a YYYY-MM-DD formatted value from getValue()", async ({
  page,
}) => {
  await selectCustomOption(page, "#monthSelect", 5); // June (0-indexed)
  await selectCustomOption(page, "#yearSelect", 2023 - 1900); 

  // Click day 15
  await page.locator('.calendar-day:not(.empty):text("15")').click();

  const value = await page.evaluate(() => {
    return window.calendarPickers["dateInput"].getValue();
  });
  expect(value).toBe("2023-06-15");
});

test("getValue() returns empty string when no date is selected", async ({
  page,
}) => {
  const value = await page.evaluate(() => {
    return window.calendarPickers["dateInput"].getValue();
  });
  expect(value).toBe("");
});

test("previously selected day loses 'selected' class when a new day is clicked", async ({
  page,
}) => {
  const days = page.locator(".calendar-day:not(.empty)");
  await days.nth(0).click();
  await days.nth(1).click();

  const firstSelected = await days.nth(0).getAttribute("class");
  expect(firstSelected).not.toMatch(/\bselected\b/);
  await expect(days.nth(1)).toHaveClass(/selected/);
});

// ── setValue() ─────────────────────────────────────────────────────────────

test("setValue() navigates the calendar to the correct month and year", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.calendarPickers["dateInput"].setValue("2020-03-10");
  });

  await expect(page.locator("#monthSelect")).toHaveAttribute("data-value", "2"); // March = index 2
  await expect(page.locator("#yearSelect")).toHaveAttribute("data-value", "2020");
});

test("setValue() selects the correct day in the rendered calendar", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.calendarPickers["dateInput"].setValue("2020-03-10");
  });

  const selectedDay = page.locator(".calendar-day.selected");
  await expect(selectedDay).toHaveText("10");
});

test("setValue() followed by getValue() round-trips the date string", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const picker = window.calendarPickers["dateInput"];
    picker.setValue("2021-11-25");
    return picker.getValue();
  });
  expect(result).toBe("2021-11-25");
});

test("setValue() with null clears the selection", async ({ page }) => {
  const result = await page.evaluate(() => {
    const picker = window.calendarPickers["dateInput"];
    picker.setValue("2021-11-25");
    picker.setValue(null);
    return picker.getValue();
  });
  expect(result).toBe("");
});

test("setValue() with an invalid date string is ignored", async ({ page }) => {
  const result = await page.evaluate(() => {
    const picker = window.calendarPickers["dateInput"];
    picker.setValue("not-a-date");
    return picker.getValue();
  });
  expect(result).toBe("");
});

// ── formatDate() ───────────────────────────────────────────────────────────

test("formatDate() pads single-digit months and days with leading zeros", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const picker = window.calendarPickers["dateInput"];
    return picker.formatDate(new Date(2023, 0, 5)); // Jan 5
  });
  expect(result).toBe("2023-01-05");
});

test("formatDate() returns empty string for null", async ({ page }) => {
  const result = await page.evaluate(() => {
    const picker = window.calendarPickers["dateInput"];
    return picker.formatDate(null);
  });
  expect(result).toBe("");
});
