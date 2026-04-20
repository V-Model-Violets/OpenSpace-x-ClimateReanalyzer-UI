// @ts-check
import { test, expect } from "@playwright/test";
import path from "path";

// Helper to load a page and wait for its calendar picker to initialise
async function loadPage(page, filename) {
  const pagePath = path.join(process.cwd(), "pages", filename);
  await page.goto(`file://${pagePath}`);
  await page.waitForSelector(".calendar-picker", { timeout: 5000 });
}

// ── getPageLayerType() ─────────────────────────────────────────────────────

const PAGE_LAYER_MAP = [
  ["temperature.html", "t2"],
  ["temperature-anomaly.html", "t2anom"],
  ["precipitation.html", "prcp"],
  ["sea-surface-temperature.html", "sst"],
  ["sea-level-pressure.html", "mslp"],
  ["jetstream.html", "ws500"],
  ["wind.html", "ws10"],
];

for (const [filename, expectedType] of PAGE_LAYER_MAP) {
  test(`getPageLayerType() returns "${expectedType}" on ${filename}`, async ({
    page,
  }) => {
    await loadPage(page, filename);
    const layerType = await page.evaluate(() => getPageLayerType());
    expect(layerType).toBe(expectedType);
  });
}

// ── buildGdalWmsXml() ──────────────────────────────────────────────────────

test.describe("buildGdalWmsXml()", () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, "temperature.html");
  });

  test("returns a string containing <GDAL_WMS> root element", async ({
    page,
  }) => {
    const xml = await page.evaluate(() => buildGdalWmsXml("t2", "20230615"));
    expect(xml).toContain("<GDAL_WMS>");
    expect(xml).toContain("</GDAL_WMS>");
  });

  test("embeds the layer type in the server URL", async ({ page }) => {
    const xml = await page.evaluate(() => buildGdalWmsXml("prcp", "20230615"));
    expect(xml).toContain("/prcp/");
  });

  test("embeds the date in the server URL", async ({ page }) => {
    const xml = await page.evaluate(() => buildGdalWmsXml("t2", "20230615"));
    expect(xml).toContain("/20230615/");
  });

  test("uses the correct tile path template", async ({ page }) => {
    const xml = await page.evaluate(() => buildGdalWmsXml("t2", "20230615"));
    expect(xml).toContain("tile/${z}/${y}/${x}");
  });

  test("specifies EPSG:4326 projection", async ({ page }) => {
    const xml = await page.evaluate(() => buildGdalWmsXml("t2", "20230615"));
    expect(xml).toContain("<Projection>EPSG:4326</Projection>");
  });

  test("sets 4 bands count", async ({ page }) => {
    const xml = await page.evaluate(() => buildGdalWmsXml("t2", "20230615"));
    expect(xml).toContain("<BandsCount>4</BandsCount>");
  });

  test("covers full global extent", async ({ page }) => {
    const xml = await page.evaluate(() => buildGdalWmsXml("t2", "20230615"));
    expect(xml).toContain("<UpperLeftX>-180.0</UpperLeftX>");
    expect(xml).toContain("<LowerRightX>180.0</LowerRightX>");
    expect(xml).toContain("<UpperLeftY>90.0</UpperLeftY>");
    expect(xml).toContain("<LowerRightY>-90.0</LowerRightY>");
  });
});

// ── Session storage helpers ────────────────────────────────────────────────

test.describe("session storage helpers", () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page, "temperature.html");
    // Clear any leftover session data from previous tests
    await page.evaluate(() => {
      sessionStorage.removeItem("openspaceCreatedLayerIds");
      sessionStorage.removeItem("openspaceLayerEnabled");
    });
  });

  test("getSessionLayerIds() returns an empty array when nothing is stored", async ({
    page,
  }) => {
    const ids = await page.evaluate(() => getSessionLayerIds());
    expect(ids).toEqual([]);
  });

  test("saveSessionLayerId() adds a new layer ID", async ({ page }) => {
    await page.evaluate(() => saveSessionLayerId("my-layer-1"));
    const ids = await page.evaluate(() => getSessionLayerIds());
    expect(ids).toContain("my-layer-1");
  });

  test("saveSessionLayerId() does not add duplicates", async ({ page }) => {
    await page.evaluate(() => {
      saveSessionLayerId("layer-a");
      saveSessionLayerId("layer-a");
    });
    const ids = await page.evaluate(() => getSessionLayerIds());
    expect(ids.filter((id) => id === "layer-a").length).toBe(1);
  });

  test("saveSessionLayerId() preserves previously saved IDs", async ({
    page,
  }) => {
    await page.evaluate(() => {
      saveSessionLayerId("layer-1");
      saveSessionLayerId("layer-2");
    });
    const ids = await page.evaluate(() => getSessionLayerIds());
    expect(ids).toContain("layer-1");
    expect(ids).toContain("layer-2");
  });

  test("getSessionLayerEnabled() defaults to true for unknown layer IDs", async ({
    page,
  }) => {
    const enabled = await page.evaluate(() =>
      getSessionLayerEnabled("nonexistent-layer"),
    );
    expect(enabled).toBe(true);
  });

  test("setSessionLayerEnabled() persists a disabled state", async ({
    page,
  }) => {
    await page.evaluate(() => setSessionLayerEnabled("layer-x", false));
    const enabled = await page.evaluate(() =>
      getSessionLayerEnabled("layer-x"),
    );
    expect(enabled).toBe(false);
  });

  test("setSessionLayerEnabled() persists an enabled state", async ({
    page,
  }) => {
    await page.evaluate(() => {
      setSessionLayerEnabled("layer-y", false);
      setSessionLayerEnabled("layer-y", true);
    });
    const enabled = await page.evaluate(() =>
      getSessionLayerEnabled("layer-y"),
    );
    expect(enabled).toBe(true);
  });
});

// ── Page structure (all 7 data pages) ─────────────────────────────────────

const ALL_PAGES = PAGE_LAYER_MAP.map(([filename]) => filename);

for (const filename of ALL_PAGES) {
  test(`${filename} has a Back button`, async ({ page }) => {
    await loadPage(page, filename);
    await expect(page.locator(".back-button")).toBeVisible();
  });

  test(`${filename} has a Submit button`, async ({ page }) => {
    await loadPage(page, filename);
    await expect(page.locator('button:has-text("Submit")')).toBeVisible();
  });

  test(`${filename} has a calendar picker`, async ({ page }) => {
    await loadPage(page, filename);
    await expect(page.locator(".calendar-picker")).toBeVisible();
  });

  test(`${filename} has an OpenSpace connection status div`, async ({
    page,
  }) => {
    await loadPage(page, filename);
    await expect(page.locator("#connection-status")).toBeVisible();
  });
}

// ── Submit validation ──────────────────────────────────────────────────────

test("submitting without a date on each page shows an alert", async ({
  page,
}) => {
  await loadPage(page, "temperature.html");

  page.on("dialog", async (dialog) => {
    expect(dialog.message()).toBe("Please select a date first.");
    await dialog.dismiss();
  });

  await page.click('button:has-text("Submit")');
});
