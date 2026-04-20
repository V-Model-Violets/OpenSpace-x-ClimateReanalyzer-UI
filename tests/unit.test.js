/**
 * Pure Node.js unit tests — no browser required.
 *
 * Uses the built-in `node:test` runner (Node 18+) and Node's `vm` module to
 * load the application scripts into a minimal stub environment, then calls
 * pure functions directly.
 *
 * Run with:  node --test tests/unit.test.js
 *
 * These tests complement the Playwright E2E suite by validating pure logic
 * in isolation, with no browser startup cost.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// ── Minimal browser stubs ────────────────────────────────────────────────────

function makeEl() {
  return {
    style: { cssText: "" },
    className: "",
    classList: {
      add() {},
      remove() {},
      contains() {
        return false;
      },
    },
    addEventListener() {},
    appendChild() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    innerHTML: "",
    textContent: "",
    options: { length: 0 },
    value: "",
    remove() {},
  };
}

function makeDocument() {
  return {
    getElementById: () => makeEl(),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => makeEl(),
    addEventListener() {},
  };
}

function makeSessionStorage() {
  const store = Object.create(null);
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
}

/**
 * Load calendar-picker.js and search-page.js into a fresh VM context and
 * return the context.  `pathname` controls window.location.pathname so that
 * getPageLayerType() can be tested for different pages.
 */
function loadScripts(pathname = "/pages/temperature.html") {
  const ctx = vm.createContext({
    window: {
      addEventListener() {},
      location: { pathname },
      calendarPickers: {},
      openspaceApi: undefined,
    },
    document: makeDocument(),
    sessionStorage: makeSessionStorage(),
    console,
    alert() {},
    Image: function () {},
    setTimeout() {},
    clearTimeout() {},
  });

  vm.runInContext(
    readFileSync(join(ROOT, "scripts", "calendar-picker.js"), "utf8"),
    ctx,
  );

  // Expose the class declaration (top-level `class` is not a global property
  // in classic script contexts, but a subsequent `var` assignment is).
  vm.runInContext("var CalendarPickerClass = CalendarPicker;", ctx);

  vm.runInContext(
    readFileSync(join(ROOT, "scripts", "search-page.js"), "utf8"),
    ctx,
  );

  return ctx;
}

// ── buildGdalWmsXml ───────────────────────────────────────────────────────────

describe("buildGdalWmsXml", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadScripts();
  });

  // Structure

  it("wraps output in <GDAL_WMS> root element", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.startsWith("<GDAL_WMS>"), "must start with <GDAL_WMS>");
    assert.ok(
      xml.trimEnd().endsWith("</GDAL_WMS>"),
      "must end with </GDAL_WMS>",
    );
  });

  it("includes a TMS service block", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes('<Service name="TMS">'));
    assert.ok(xml.includes("</Service>"));
  });

  it("includes a DataWindow block with global WGS-84 extents", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes("<UpperLeftX>-180.0</UpperLeftX>"));
    assert.ok(xml.includes("<UpperLeftY>90.0</UpperLeftY>"));
    assert.ok(xml.includes("<LowerRightX>180.0</LowerRightX>"));
    assert.ok(xml.includes("<LowerRightY>-90.0</LowerRightY>"));
  });

  it("specifies EPSG:4326 projection", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes("<Projection>EPSG:4326</Projection>"));
  });

  it("uses 512 × 512 block size", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes("<BlockSizeX>512</BlockSizeX>"));
    assert.ok(xml.includes("<BlockSizeY>512</BlockSizeY>"));
  });

  it("uses tile level 3", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes("<TileLevel>3</TileLevel>"));
  });

  it("sets BandsCount to 4", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes("<BandsCount>4</BandsCount>"));
  });

  it("sets MaxConnections to 10", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes("<MaxConnections>10</MaxConnections>"));
  });

  it("sets YOrigin to top", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes("<YOrigin>top</YOrigin>"));
  });

  it("sets SizeX to 4000 and SizeY to 2000", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes("<SizeX>4000</SizeX>"));
    assert.ok(xml.includes("<SizeY>2000</SizeY>"));
  });

  it("preserves literal tile path template tokens (not evaluated as JS)", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    // These must survive as literal strings, not be resolved by JS template expansion.
    assert.ok(
      xml.includes("tile/${z}/${y}/${x}"),
      "tile path tokens must be literal",
    );
  });

  // Layer type embedding

  const ALL_TYPES = ["t2", "t2anom", "prcp", "sst", "mslp", "ws500", "ws10"];
  for (const type of ALL_TYPES) {
    it(`embeds layer type "${type}" in the ServerUrl`, () => {
      const xml = ctx.buildGdalWmsXml(type, "20230615");
      assert.ok(xml.includes(`/${type}/`), `expected /${type}/ in server URL`);
    });
  }

  // Date embedding

  it("embeds the supplied date in the ServerUrl", () => {
    const xml = ctx.buildGdalWmsXml("t2", "20230615");
    assert.ok(xml.includes("/20230615/"));
  });

  it("works with an older date (e.g. 19400101)", () => {
    const xml = ctx.buildGdalWmsXml("t2", "19400101");
    assert.ok(xml.includes("/19400101/"));
  });

  it("works with a recent date (e.g. 20260101)", () => {
    const xml = ctx.buildGdalWmsXml("prcp", "20260101");
    assert.ok(xml.includes("/prcp/"));
    assert.ok(xml.includes("/20260101/"));
  });

  it("different types produce different ServerUrl values", () => {
    const xmlT2 = ctx.buildGdalWmsXml("t2", "20230615");
    const xmlPrcp = ctx.buildGdalWmsXml("prcp", "20230615");
    assert.notEqual(xmlT2, xmlPrcp);
  });

  it("different dates produce different ServerUrl values", () => {
    const xml1 = ctx.buildGdalWmsXml("t2", "20230615");
    const xml2 = ctx.buildGdalWmsXml("t2", "20230616");
    assert.notEqual(xml1, xml2);
  });

  // Lua XML escaping — this is the logic in updateOpenSpaceForDate that converts
  // the raw XML into a single-line Lua string argument.  It is the only path in
  // the application that transforms the XML output, and has no dedicated test
  // elsewhere.

  describe("Lua escaping of XML output", () => {
    it("collapsed to a single line contains no bare newlines", () => {
      const xml = ctx.buildGdalWmsXml("t2", "20230615");
      const oneLine = xml.replace(/\n\s*/g, " ");
      assert.equal(oneLine.indexOf("\n"), -1, "no newlines after collapsing");
    });

    it("after escaping, output contains no unescaped double-quote characters", () => {
      const xml = ctx.buildGdalWmsXml("t2", "20230615");
      // Replicate the exact transformation from updateOpenSpaceForDate:
      const escaped = xml.replace(/\n\s*/g, " ").replace(/"/g, '\\"');
      // A bare " would be followed by a non-backslash character (or end-of-string).
      // We check that no such pattern remains.
      assert.ok(
        !escaped.match(/(?<!\\)"/),
        "should have no unescaped double quotes",
      );
    });

    it("escaped XML still contains the layer type in the server URL", () => {
      const xml = ctx.buildGdalWmsXml("sst", "20230615");
      const escaped = xml.replace(/\n\s*/g, " ").replace(/"/g, '\\"');
      assert.ok(escaped.includes("/sst/"));
    });

    it("escaped XML still contains the tile path template tokens", () => {
      const xml = ctx.buildGdalWmsXml("t2", "20230615");
      const escaped = xml.replace(/\n\s*/g, " ").replace(/"/g, '\\"');
      assert.ok(escaped.includes("tile/${z}/${y}/${x}"));
    });

    it("escaped XML still contains the EPSG:4326 projection tag", () => {
      const xml = ctx.buildGdalWmsXml("t2", "20230615");
      const escaped = xml.replace(/\n\s*/g, " ").replace(/"/g, '\\"');
      assert.ok(escaped.includes("<Projection>EPSG:4326</Projection>"));
    });
  });
});

// ── CalendarPicker.formatDate ────────────────────────────────────────────────

describe("CalendarPicker.formatDate", () => {
  let format;
  beforeEach(() => {
    const ctx = loadScripts();
    // Use Object.create to get an instance without invoking the DOM-dependent
    // constructor.
    const instance = Object.create(ctx.CalendarPickerClass.prototype);
    format = (date) => instance.formatDate(date);
  });

  it("returns empty string for null", () => {
    assert.equal(format(null), "");
  });

  it("returns empty string for undefined", () => {
    assert.equal(format(undefined), "");
  });

  it("formats a date with single-digit month and day", () => {
    assert.equal(format(new Date(2023, 0, 5)), "2023-01-05"); // Jan 5
  });

  it("formats a date with double-digit month and day", () => {
    assert.equal(format(new Date(2023, 10, 15)), "2023-11-15"); // Nov 15
  });

  it("formats December 31 correctly", () => {
    assert.equal(format(new Date(2023, 11, 31)), "2023-12-31");
  });

  it("formats January 1 correctly", () => {
    assert.equal(format(new Date(2024, 0, 1)), "2024-01-01");
  });

  it("handles a leap-year date (Feb 29, 2024)", () => {
    assert.equal(format(new Date(2024, 1, 29)), "2024-02-29");
  });

  it("handles a historical date (1940-01-01)", () => {
    assert.equal(format(new Date(1940, 0, 1)), "1940-01-01");
  });

  it("year portion is always 4 digits", () => {
    const result = format(new Date(2023, 5, 15));
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("month portion is always 2 digits", () => {
    const result = format(new Date(2023, 0, 15)); // January → "01"
    assert.equal(result.slice(5, 7), "01");
  });

  it("day portion is always 2 digits", () => {
    const result = format(new Date(2023, 5, 3)); // Day 3 → "03"
    assert.equal(result.slice(8, 10), "03");
  });
});

// ── getPageLayerType ─────────────────────────────────────────────────────────

describe("getPageLayerType", () => {
  const cases = [
    ["/pages/temperature.html", "t2"],
    ["/pages/temperature-anomaly.html", "t2anom"],
    ["/pages/precipitation.html", "prcp"],
    ["/pages/sea-surface-temperature.html", "sst"],
    ["/pages/sea-level-pressure.html", "mslp"],
    ["/pages/jetstream.html", "ws500"],
    ["/pages/wind.html", "ws10"],
  ];

  for (const [pathname, expected] of cases) {
    it(`returns "${expected}" for ${pathname}`, () => {
      const ctx = loadScripts(pathname);
      assert.equal(ctx.getPageLayerType(), expected);
    });
  }

  it('defaults to "t2" for an unknown page filename', () => {
    const ctx = loadScripts("/pages/unknown-page.html");
    assert.equal(ctx.getPageLayerType(), "t2");
  });

  it('defaults to "t2" when there is no .html extension', () => {
    const ctx = loadScripts("/dashboard");
    assert.equal(ctx.getPageLayerType(), "t2");
  });
});

// ── Session storage helpers ───────────────────────────────────────────────────

describe("getSessionLayerIds", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadScripts();
  });

  it("returns an empty array when nothing is stored", () => {
    const result = ctx.getSessionLayerIds();
    assert.equal(result.length, 0);
  });

  it("returns the stored array after saveSessionLayerId is called", () => {
    ctx.saveSessionLayerId("layer-A");
    const result = ctx.getSessionLayerIds();
    assert.equal(result.length, 1);
    assert.equal(result[0], "layer-A");
  });

  it("returns an empty array when sessionStorage contains invalid JSON", () => {
    ctx.sessionStorage.setItem("openspaceCreatedLayerIds", "NOT_JSON{{{");
    const result = ctx.getSessionLayerIds();
    assert.equal(result.length, 0);
  });
});

describe("saveSessionLayerId", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadScripts();
  });

  it("adds a new layer ID to the list", () => {
    ctx.saveSessionLayerId("my-layer");
    assert.ok(ctx.getSessionLayerIds().includes("my-layer"));
  });

  it("does not add duplicate layer IDs", () => {
    ctx.saveSessionLayerId("dup");
    ctx.saveSessionLayerId("dup");
    const ids = ctx.getSessionLayerIds();
    assert.equal(
      ids.filter((id) => id === "dup").length,
      1,
      "should appear exactly once",
    );
  });

  it("preserves existing IDs when adding a new one", () => {
    ctx.saveSessionLayerId("first");
    ctx.saveSessionLayerId("second");
    const ids = ctx.getSessionLayerIds();
    assert.ok(ids.includes("first"));
    assert.ok(ids.includes("second"));
  });

  it("stores multiple unique IDs", () => {
    ["a", "b", "c", "d"].forEach((id) => ctx.saveSessionLayerId(id));
    assert.equal(ctx.getSessionLayerIds().length, 4);
  });
});

describe("getSessionLayerEnabled / setSessionLayerEnabled", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadScripts();
  });

  it("returns true by default for an unknown layer ID", () => {
    assert.equal(ctx.getSessionLayerEnabled("unknown-layer"), true);
  });

  it("returns true after setSessionLayerEnabled(id, true)", () => {
    ctx.setSessionLayerEnabled("my-layer", true);
    assert.equal(ctx.getSessionLayerEnabled("my-layer"), true);
  });

  it("returns false after setSessionLayerEnabled(id, false)", () => {
    ctx.setSessionLayerEnabled("my-layer", false);
    assert.equal(ctx.getSessionLayerEnabled("my-layer"), false);
  });

  it("can toggle from false back to true", () => {
    ctx.setSessionLayerEnabled("layer-x", false);
    ctx.setSessionLayerEnabled("layer-x", true);
    assert.equal(ctx.getSessionLayerEnabled("layer-x"), true);
  });

  it("stores enabled states for multiple layers independently", () => {
    ctx.setSessionLayerEnabled("layer-1", true);
    ctx.setSessionLayerEnabled("layer-2", false);
    assert.equal(ctx.getSessionLayerEnabled("layer-1"), true);
    assert.equal(ctx.getSessionLayerEnabled("layer-2"), false);
  });

  it("returns true when sessionStorage contains invalid JSON", () => {
    ctx.sessionStorage.setItem("openspaceLayerEnabled", "INVALID{{");
    assert.equal(ctx.getSessionLayerEnabled("any-layer"), true);
  });
});
