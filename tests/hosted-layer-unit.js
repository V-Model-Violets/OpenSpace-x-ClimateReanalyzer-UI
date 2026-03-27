/**
 * hosted-layer-unit.js
 *
 * Unit tests for scripts/hosted-layer.js using Node.js's built-in test runner.
 * Run with:   node --experimental-vm-modules tests/hosted-layer-unit.js
 *         or: node tests/hosted-layer-unit.js   (Node 18+)
 *
 * No browser is required — these tests exercise pure JS logic only.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RESOLUTION_TO_LEVEL,
  FORMAT_BAND_COUNT,
  createTileServerGdalXml,
  buildOpenSpaceLayerConfig,
  createTemporalHostedLayerConfig,
  addHostedLayerToOpenSpace,
} from "../scripts/hosted-layer.js";

// ---------------------------------------------------------------------------
// createTileServerGdalXml — happy paths
// ---------------------------------------------------------------------------

test("createTileServerGdalXml: resolution map has all expected keys", () => {
  const expected = [
    "2km",
    "1km",
    "500m",
    "250m",
    "125m",
    "62.5m",
    "31.25m",
    "15.625m",
  ];
  for (const key of expected) {
    assert.ok(key in RESOLUTION_TO_LEVEL, `Missing resolution key: ${key}`);
  }
});

test("createTileServerGdalXml: resolution maps to correct tile levels", () => {
  assert.equal(RESOLUTION_TO_LEVEL["2km"], 5);
  assert.equal(RESOLUTION_TO_LEVEL["1km"], 6);
  assert.equal(RESOLUTION_TO_LEVEL["500m"], 7);
  assert.equal(RESOLUTION_TO_LEVEL["250m"], 8);
  assert.equal(RESOLUTION_TO_LEVEL["125m"], 9);
  assert.equal(RESOLUTION_TO_LEVEL["62.5m"], 10);
  assert.equal(RESOLUTION_TO_LEVEL["31.25m"], 11);
  assert.equal(RESOLUTION_TO_LEVEL["15.625m"], 12);
});

test("createTileServerGdalXml: PNG produces 4 bands by default", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.match(xml, /<BandsCount>4<\/BandsCount>/);
});

test("createTileServerGdalXml: JPG produces 3 bands by default", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "jpg");
  assert.match(xml, /<BandsCount>3<\/BandsCount>/);
});

test("createTileServerGdalXml: JPEG (alias) produces 3 bands by default", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "jpeg");
  assert.match(xml, /<BandsCount>3<\/BandsCount>/);
});

test("createTileServerGdalXml: options.bandCount overrides format default (grayscale)", () => {
  const xml = createTileServerGdalXml("ndvi", "2026-03-27", "250m", "png", {
    bandCount: 1,
  });
  assert.match(xml, /<BandsCount>1<\/BandsCount>/);
});

test("createTileServerGdalXml: TileLevel matches resolution", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "500m", "png");
  assert.match(xml, /<TileLevel>7<\/TileLevel>/);
});

test("createTileServerGdalXml: default base URL appears in ServerUrl", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.match(xml, /<ServerUrl>http:\/\/localhost\/tiles\//);
});

test("createTileServerGdalXml: custom baseUrl is applied", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png", {
    baseUrl: "https://tiles.example.com",
  });
  assert.match(xml, /<ServerUrl>https:\/\/tiles\.example\.com\//);
});

test("createTileServerGdalXml: ServerUrl contains layerName and date", () => {
  const xml = createTileServerGdalXml("my-layer", "2099-12-31", "250m", "png");
  assert.match(xml, /my-layer\/2099-12-31\/250m/);
});

test("createTileServerGdalXml: ${z}/${y}/${x} are literal strings in the output", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  // These must appear as literal ASCII characters in the XML, not be resolved.
  assert.ok(xml.includes("${z}"), "Missing literal ${z} placeholder");
  assert.ok(xml.includes("${y}"), "Missing literal ${y} placeholder");
  assert.ok(xml.includes("${x}"), "Missing literal ${x} placeholder");
});

test("createTileServerGdalXml: default projection is EPSG:4326", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.match(xml, /<Projection>EPSG:4326<\/Projection>/);
});

test("createTileServerGdalXml: custom projection is applied", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png", {
    projection: "EPSG:3857",
  });
  assert.match(xml, /<Projection>EPSG:3857<\/Projection>/);
});

test("createTileServerGdalXml: default block size is 512×512", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.match(xml, /<BlockSizeX>512<\/BlockSizeX>/);
  assert.match(xml, /<BlockSizeY>512<\/BlockSizeY>/);
});

test("createTileServerGdalXml: custom block size is applied", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png", {
    blockSizeX: 512,
    blockSizeY: 512,
  });
  assert.match(xml, /<BlockSizeX>512<\/BlockSizeX>/);
  assert.match(xml, /<BlockSizeY>512<\/BlockSizeY>/);
});

test("createTileServerGdalXml: default extent is global EPSG:4326", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.match(xml, /<UpperLeftX>-180<\/UpperLeftX>/);
  assert.match(xml, /<UpperLeftY>90<\/UpperLeftY>/);
  assert.match(xml, /<LowerRightX>180<\/LowerRightX>/);
  assert.match(xml, /<LowerRightY>-90<\/LowerRightY>/);
});

test("createTileServerGdalXml: default TileCountX=2 and TileCountY=1", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.match(xml, /<TileCountX>2<\/TileCountX>/);
  assert.match(xml, /<TileCountY>1<\/TileCountY>/);
});

test("createTileServerGdalXml: default YOrigin is top", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.match(xml, /<YOrigin>top<\/YOrigin>/);
});

test("createTileServerGdalXml: default ZeroBlockHttpCodes is 404,400", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.match(xml, /<ZeroBlockHttpCodes>404,400<\/ZeroBlockHttpCodes>/);
});

test("createTileServerGdalXml: custom ZeroBlockHttpCodes is applied", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png", {
    zeroBlockHttpCodes: "204,404,400",
  });
  assert.match(xml, /<ZeroBlockHttpCodes>204,404,400<\/ZeroBlockHttpCodes>/);
});

test("createTileServerGdalXml: default MaxConnections is 10", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.match(xml, /<MaxConnections>10<\/MaxConnections>/);
});

test("createTileServerGdalXml: custom MaxConnections is applied", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png", {
    maxConnections: 5,
  });
  assert.match(xml, /<MaxConnections>5<\/MaxConnections>/);
});

test("createTileServerGdalXml: no DataValues element by default", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.ok(
    !xml.includes("<DataValues"),
    "DataValues must not appear by default",
  );
});

test("createTileServerGdalXml: DataValues element is emitted when options.dataValues is set", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png", {
    dataValues: { noData: 0, min: 1, max: 255 },
  });
  assert.match(xml, /<DataValues NoData="0" Min="1" Max="255"\/>/);
});

test("createTileServerGdalXml: TimeOut element is not emitted", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.ok(!xml.includes("<TimeOut"), "TimeOut must not appear in XML");
});

test("createTileServerGdalXml: TileCountX and TileCountY appear before TileLevel in DataWindow", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  const countXPos = xml.indexOf("<TileCountX>");
  const tileLevelPos = xml.indexOf("<TileLevel>");
  assert.ok(
    countXPos < tileLevelPos,
    "TileCountX must appear before TileLevel",
  );
});

test("createTileServerGdalXml: output starts with <GDAL_WMS>", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.ok(
    xml.trimStart().startsWith("<GDAL_WMS>"),
    "XML must start with <GDAL_WMS>",
  );
});

test("createTileServerGdalXml: output ends with </GDAL_WMS>", () => {
  const xml = createTileServerGdalXml("sst", "2026-03-27", "1km", "png");
  assert.ok(
    xml.trimEnd().endsWith("</GDAL_WMS>"),
    "XML must end with </GDAL_WMS>",
  );
});

// ---------------------------------------------------------------------------
// createTileServerGdalXml — error cases
// ---------------------------------------------------------------------------

test("createTileServerGdalXml: throws on empty layerName", () => {
  assert.throws(
    () => createTileServerGdalXml("", "2026-03-27", "1km", "png"),
    /layerName must be a non-empty string/,
  );
});

test("createTileServerGdalXml: throws on missing date", () => {
  assert.throws(
    () => createTileServerGdalXml("sst", "", "1km", "png"),
    /date must be a non-empty/,
  );
});

test("createTileServerGdalXml: throws on invalid resolution", () => {
  assert.throws(
    () => createTileServerGdalXml("sst", "2026-03-27", "999km", "png"),
    /unsupported resolution/,
  );
});

test("createTileServerGdalXml: throws on invalid format", () => {
  assert.throws(
    () => createTileServerGdalXml("sst", "2026-03-27", "1km", "webp"),
    /unsupported format/,
  );
});

test("createTileServerGdalXml: error message for invalid resolution lists valid options", () => {
  try {
    createTileServerGdalXml("sst", "2026-03-27", "bad", "png");
    assert.fail("Expected an error to be thrown");
  } catch (err) {
    assert.ok(
      err.message.includes("1km"),
      "Error should list valid resolutions",
    );
  }
});

// ---------------------------------------------------------------------------
// buildOpenSpaceLayerConfig
// ---------------------------------------------------------------------------

test("buildOpenSpaceLayerConfig: returns correct Identifier and Name", () => {
  const config = buildOpenSpaceLayerConfig("my-layer", "<GDAL_WMS/>");
  assert.equal(config.Identifier, "my-layer");
  assert.equal(config.Name, "my-layer");
});

test("buildOpenSpaceLayerConfig: FilePath equals the provided xmlString", () => {
  const xml = "<GDAL_WMS>dummy</GDAL_WMS>";
  const config = buildOpenSpaceLayerConfig("my-layer", xml);
  assert.equal(config.FilePath, xml);
});

test("buildOpenSpaceLayerConfig: overrides are merged onto the base", () => {
  const config = buildOpenSpaceLayerConfig("my-layer", "<GDAL_WMS/>", {
    Description: "Test layer",
    Enabled: true,
  });
  assert.equal(config.Description, "Test layer");
  assert.equal(config.Enabled, true);
});

test("buildOpenSpaceLayerConfig: overrides can replace Identifier", () => {
  const config = buildOpenSpaceLayerConfig("my-layer", "<GDAL_WMS/>", {
    Identifier: "custom-id",
  });
  assert.equal(config.Identifier, "custom-id");
});

test("buildOpenSpaceLayerConfig: throws on empty layerName", () => {
  assert.throws(
    () => buildOpenSpaceLayerConfig("", "<GDAL_WMS/>"),
    /layerName must be a non-empty string/,
  );
});

test("buildOpenSpaceLayerConfig: throws on empty xmlString", () => {
  assert.throws(
    () => buildOpenSpaceLayerConfig("layer", ""),
    /xmlString must be a non-empty string/,
  );
});

// ---------------------------------------------------------------------------
// createTemporalHostedLayerConfig
// ---------------------------------------------------------------------------

test("createTemporalHostedLayerConfig: fixed date string appears in FilePath", () => {
  const config = createTemporalHostedLayerConfig(
    "precipitation",
    "2026-03-27",
    "500m",
    "png",
  );
  assert.ok(
    config.FilePath.includes("2026-03-27"),
    "Fixed date should be in XML",
  );
});

test('createTemporalHostedLayerConfig: token "${OpenSpaceTimeId}" is preserved literally', () => {
  // The token is constructed as a plain JS string — not a template literal.
  const token = "$" + "{OpenSpaceTimeId}";
  const config = createTemporalHostedLayerConfig(
    "precipitation",
    token,
    "500m",
    "png",
  );
  assert.ok(
    config.FilePath.includes(token),
    "Temporal token must appear verbatim in FilePath XML",
  );
});

test("createTemporalHostedLayerConfig: returns a valid layer config object", () => {
  const config = createTemporalHostedLayerConfig(
    "precipitation",
    "2026-03-27",
    "500m",
    "png",
  );
  assert.ok("Identifier" in config);
  assert.ok("Name" in config);
  assert.ok("FilePath" in config);
});

test("createTemporalHostedLayerConfig: layerOverrides are applied", () => {
  const config = createTemporalHostedLayerConfig(
    "precipitation",
    "2026-03-27",
    "500m",
    "png",
    {},
    { Description: "Temporal precip" },
  );
  assert.equal(config.Description, "Temporal precip");
});

// ---------------------------------------------------------------------------
// addHostedLayerToOpenSpace
// ---------------------------------------------------------------------------

test("addHostedLayerToOpenSpace: returns success with a mock adapter", async () => {
  const mockAdapter = async (_api, _globe, _group, config) => ({
    status: "ok",
    receivedIdentifier: config.Identifier,
  });

  const result = await addHostedLayerToOpenSpace(
    {},
    {
      layerName: "sea-surface-temp",
      date: "2026-03-27",
      resolution: "1km",
      format: "png",
      adapterCallback: mockAdapter,
    },
  );

  assert.equal(result.success, true);
  assert.ok(result.layerConfig !== null);
  assert.equal(result.result.receivedIdentifier, "sea-surface-temp");
});

test("addHostedLayerToOpenSpace: returns failure when XML build throws", async () => {
  const mockAdapter = async () => {
    throw new Error("should not reach adapter");
  };

  const result = await addHostedLayerToOpenSpace(
    {},
    {
      layerName: "bad-layer",
      date: "2026-03-27",
      resolution: "INVALID", // triggers build error
      format: "png",
      adapterCallback: mockAdapter,
    },
  );

  assert.equal(result.success, false);
  assert.ok(result.error instanceof Error);
  assert.match(result.error.message, /unsupported resolution/);
  assert.equal(result.layerConfig, null);
});

test("addHostedLayerToOpenSpace: returns failure when adapter throws", async () => {
  const failingAdapter = async () => {
    throw new Error("OpenSpace connection refused");
  };

  const result = await addHostedLayerToOpenSpace(
    {},
    {
      layerName: "sst",
      date: "2026-03-27",
      resolution: "1km",
      format: "png",
      adapterCallback: failingAdapter,
    },
  );

  assert.equal(result.success, false);
  assert.ok(
    result.layerConfig !== null,
    "layerConfig should have been built before adapter call",
  );
  assert.match(result.error.message, /connection refused/);
});

test("addHostedLayerToOpenSpace: passes globeIdentifier and layerGroup to adapter", async () => {
  let capturedGlobe, capturedGroup;
  const captureAdapter = async (_api, globe, group, _config) => {
    capturedGlobe = globe;
    capturedGroup = group;
  };

  await addHostedLayerToOpenSpace(
    {},
    {
      layerName: "sst",
      date: "2026-03-27",
      resolution: "1km",
      format: "png",
      globeIdentifier: "Mars",
      layerGroup: "NightLayers",
      adapterCallback: captureAdapter,
    },
  );

  assert.equal(capturedGlobe, "Mars");
  assert.equal(capturedGroup, "NightLayers");
});

test("addHostedLayerToOpenSpace: defaults globeIdentifier to Earth and layerGroup to ColorLayers", async () => {
  let capturedGlobe, capturedGroup;
  const captureAdapter = async (_api, globe, group) => {
    capturedGlobe = globe;
    capturedGroup = group;
  };

  await addHostedLayerToOpenSpace(
    {},
    {
      layerName: "sst",
      date: "2026-03-27",
      resolution: "1km",
      format: "png",
      adapterCallback: captureAdapter,
    },
  );

  assert.equal(capturedGlobe, "Earth");
  assert.equal(capturedGroup, "ColorLayers");
});

test("addHostedLayerToOpenSpace: layerOverrides appear in the config passed to adapter", async () => {
  let receivedConfig;
  const captureAdapter = async (_api, _globe, _group, config) => {
    receivedConfig = config;
  };

  await addHostedLayerToOpenSpace(
    {},
    {
      layerName: "sst",
      date: "2026-03-27",
      resolution: "1km",
      format: "png",
      layerOverrides: { Description: "From test", Enabled: false },
      adapterCallback: captureAdapter,
    },
  );

  assert.equal(receivedConfig.Description, "From test");
  assert.equal(receivedConfig.Enabled, false);
});
