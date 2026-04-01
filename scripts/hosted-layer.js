/**
 * hosted-layer.js
 *
 * Utilities for adding custom hosted image tile layers to OpenSpace via GDAL_WMS XML.
 *
 * Design overview
 * ---------------
 * 1. createTileServerGdalXml  — Generates a GDAL_WMS XML string for a TMS tile server.
 * 2. buildOpenSpaceLayerConfig — Wraps the XML into an OpenSpace layer definition object.
 * 3. createTemporalHostedLayerConfig — Variant that supports date tokens / placeholders.
 * 4. addHostedLayerToOpenSpace — Full async flow: build XML → build config → call API.
 *
 * Assumptions
 * -----------
 * - Tile URLs follow the pattern: {baseUrl}/{layerName}/{date}/{resolution}/{z}/{y}/{x}.{format}
 *   The ${z}, ${y}, ${x} segments are preserved as *literal strings* in the XML output.
 *   They are NOT evaluated as JavaScript template expressions.
 * - The OpenSpace WebSocket API object is the one produced by window.openspaceApi()
 *   from openspace-api.js. Its `library()` method returns a dynamic Lua-backed object.
 * - Temporal layers pass their date token (e.g. "${OpenSpaceTimeId}") straight into
 *   the ServerUrl; OpenSpace's temporal tile provider resolves it at runtime.
 * - No framework or third-party dependencies are required.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maps user-facing resolution strings to GDAL_WMS <TileLevel> values.
 * TileLevel N means the tile grid has 2^(N+1) columns and 2^N rows at the
 * deepest zoom level (for a global EPSG:4326 extent).
 *
 * @type {Readonly<Record<string, number>>}
 */
export const RESOLUTION_TO_LEVEL = Object.freeze({
  "2km": 5,
  "1km": 6,
  "500m": 7,
  "250m": 8,
  "125m": 9,
  "62.5m": 10,
  "31.25m": 11,
  "15.625m": 12,
});

/**
 * Default raster band counts per image format.
 * PNG uses 4 bands (RGBA); JPEG/JPG uses 3 bands (RGB).
 *
 * @type {Readonly<Record<string, number>>}
 */
export const FORMAT_BAND_COUNT = Object.freeze({
  png: 4,
  jpg: 3,
  jpeg: 3,
});

// ---------------------------------------------------------------------------
// XML generation layer
// ---------------------------------------------------------------------------

/**
 * Creates a GDAL_WMS XML string for a TMS-style tile server.
 *
 * The `${z}`, `${y}`, and `${x}` path segments in the ServerUrl are emitted as
 * *literal character sequences* in the returned XML string — they are built via
 * plain string concatenation and are never evaluated as JS template expressions.
 *
 * @param {string} layerName
 *   Logical name/identifier of the layer, used as a path segment in the tile URL.
 * @param {string} date
 *   A fixed date string such as "2026-03-27", or a literal placeholder token
 *   such as "${OpenSpaceTimeId}" (the token must be an ordinary JS string value,
 *   not a template-literal expression).
 * @param {string} resolution
 *   One of: "2km" | "1km" | "500m" | "250m" | "125m" | "62.5m" | "31.25m" | "15.625m".
 * @param {string} format
 *   The tile image format: "png", "jpg", or "jpeg".
 * @param {object} [options={}]
 *   Optional configuration overrides.
 * @param {string} [options.baseUrl="http://localhost/tiles"]
 *   Root URL of the tile server (no trailing slash).
 * @param {string} [options.projection="EPSG:4326"]
 *   Spatial reference for the DataWindow extent.
 * @param {number} [options.blockSizeX=512]
 *   Tile width in pixels.
 * @param {number} [options.blockSizeY=512]
 *   Tile height in pixels.
 * @param {number} [options.tileCountX=2]
 *   Number of tiles across the full extent at zoom level 0.
 * @param {number} [options.tileCountY=1]
 *   Number of tiles tall at zoom level 0.
 * @param {number} [options.upperLeftX=-180]
 * @param {number} [options.upperLeftY=90]
 * @param {number} [options.lowerRightX=180]
 * @param {number} [options.lowerRightY=-90]
 * @param {string} [options.yOrigin="top"]
 *   Tile Y-origin convention ("top" = TMS, "bottom" = XYZ/Slippy).
 * @param {number} [options.maxConnections=10]
 *   Maximum number of simultaneous HTTP connections GDAL may open.
 * @param {string} [options.zeroBlockHttpCodes="404,400"]
 *   Comma-separated HTTP codes that GDAL treats as empty/transparent tiles.
 * @param {object} [options.dataValues]
 *   Optional <DataValues> element attributes.  If provided, all three sub-fields
 *   must be supplied.
 * @param {number} [options.dataValues.noData]  Value treated as no-data (e.g. 0).
 * @param {number} [options.dataValues.min]     Minimum valid pixel value.
 * @param {number} [options.dataValues.max]     Maximum valid pixel value.
 * @param {number} [options.bandCount]
 *   Explicit raster band count; overrides the format-derived default.
 *   Use this to declare single-band (grayscale) layers.
 * @returns {string} A valid GDAL_WMS XML string.
 * @throws {Error} If resolution or format are invalid, or required args are missing.
 */
export function createTileServerGdalXml(
  layerName,
  date,
  resolution,
  format,
  options = {},
) {
  // --- Input validation ---
  if (!layerName || typeof layerName !== "string" || layerName.trim() === "") {
    throw new Error(
      "createTileServerGdalXml: layerName must be a non-empty string",
    );
  }
  if (date === undefined || date === null || String(date).trim() === "") {
    throw new Error(
      "createTileServerGdalXml: date must be a non-empty string or placeholder token",
    );
  }
  if (!format || typeof format !== "string") {
    throw new Error(
      "createTileServerGdalXml: format must be a non-empty string",
    );
  }

  const normalizedFormat = format.toLowerCase();
  if (!(normalizedFormat in FORMAT_BAND_COUNT)) {
    throw new Error(
      'createTileServerGdalXml: unsupported format "' +
        format +
        '". ' +
        "Valid formats: " +
        Object.keys(FORMAT_BAND_COUNT).join(", "),
    );
  }

  if (!resolution || !(resolution in RESOLUTION_TO_LEVEL)) {
    throw new Error(
      'createTileServerGdalXml: unsupported resolution "' +
        resolution +
        '". ' +
        "Valid resolutions: " +
        Object.keys(RESOLUTION_TO_LEVEL).join(", "),
    );
  }

  // --- Resolve configuration with defaults ---
  const baseUrl = options.baseUrl ?? "http://localhost/tiles";
  const projection = options.projection ?? "EPSG:4326";
  const blockSizeX = options.blockSizeX ?? 512;
  const blockSizeY = options.blockSizeY ?? 512;
  const tileCountX = options.tileCountX ?? 2;
  const tileCountY = options.tileCountY ?? 1;
  const upperLeftX = options.upperLeftX ?? -180;
  const upperLeftY = options.upperLeftY ?? 90;
  const lowerRightX = options.lowerRightX ?? 180;
  const lowerRightY = options.lowerRightY ?? -90;
  const yOrigin = options.yOrigin ?? "top";
  const maxConnections = options.maxConnections ?? 10;
  const zeroBlockCodes = options.zeroBlockHttpCodes ?? "404,400";
  const dataValues = options.dataValues ?? null;
  const tileLevel = RESOLUTION_TO_LEVEL[resolution];

  // Band count: explicit override → format default.
  // Callers using a grayscale layer should pass options.bandCount = 1.
  const bandCount =
    options.bandCount !== undefined
      ? options.bandCount
      : FORMAT_BAND_COUNT[normalizedFormat];

  // Build the ServerUrl using plain string concatenation so that the
  // '${z}', '${y}', '${x}' segments are emitted as literal text in the XML
  // and are never interpreted by JavaScript's template-literal engine.
  const serverUrl =
    baseUrl +
    "/" +
    layerName +
    "/" +
    String(date) +
    "/" +
    resolution +
    "/${z}/${y}/${x}." +
    normalizedFormat;

  // --- Assemble GDAL_WMS XML ---
  const lines = [
    "<GDAL_WMS>",
    '  <Service name="TMS">',
    "    <ServerUrl>" + serverUrl + "</ServerUrl>",
    "  </Service>",
    "  <DataWindow>",
    "    <UpperLeftX>" + upperLeftX + "</UpperLeftX>",
    "    <UpperLeftY>" + upperLeftY + "</UpperLeftY>",
    "    <LowerRightX>" + lowerRightX + "</LowerRightX>",
    "    <LowerRightY>" + lowerRightY + "</LowerRightY>",
    "    <TileCountX>" + tileCountX + "</TileCountX>",
    "    <TileCountY>" + tileCountY + "</TileCountY>",
    "    <TileLevel>" + tileLevel + "</TileLevel>",
    "    <YOrigin>" + yOrigin + "</YOrigin>",
    "  </DataWindow>",
    "  <Projection>" + projection + "</Projection>",
    "  <BlockSizeX>" + blockSizeX + "</BlockSizeX>",
    "  <BlockSizeY>" + blockSizeY + "</BlockSizeY>",
    "  <BandsCount>" + bandCount + "</BandsCount>",
    "  <MaxConnections>" + maxConnections + "</MaxConnections>",
    dataValues !== null
      ? '  <DataValues NoData="' +
        dataValues.noData +
        '" Min="' +
        dataValues.min +
        '" Max="' +
        dataValues.max +
        '"/>'
      : null,
    "  <ZeroBlockHttpCodes>" + zeroBlockCodes + "</ZeroBlockHttpCodes>",
    "</GDAL_WMS>",
  ].filter((line) => line !== null);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Layer config builder
// ---------------------------------------------------------------------------

/**
 * Wraps a GDAL_WMS XML string into an OpenSpace layer definition object.
 *
 * The returned plain object is suitable as the third argument to:
 *   `openspace.globebrowsing.addLayer(globeIdentifier, layerGroup, config)`
 *
 * OpenSpace reads `FilePath` to locate the GDAL dataset; passing the XML string
 * directly (rather than a file on disk) is supported by OpenSpace's inline
 * GDAL XML dataset feature.
 *
 * @param {string} layerName
 *   Identifier used for both `Identifier` and `Name` unless overrides supply them.
 * @param {string} xmlString
 *   GDAL_WMS XML string (e.g. from {@link createTileServerGdalXml}).
 * @param {object} [overrides={}]
 *   Any additional OpenSpace layer properties to merge in, for example:
 *   `{ Description: "Sea surface temperature", Enabled: true }`.
 *   An override for `Identifier` is allowed if you need a different identifier
 *   than the layer name.
 * @returns {{ Identifier: string, Name: string, FilePath: string } & object}
 * @throws {Error} If required arguments are invalid.
 */
export function buildOpenSpaceLayerConfig(
  layerName,
  xmlString,
  overrides = {},
) {
  if (!layerName || typeof layerName !== "string" || layerName.trim() === "") {
    throw new Error(
      "buildOpenSpaceLayerConfig: layerName must be a non-empty string",
    );
  }
  if (!xmlString || typeof xmlString !== "string" || xmlString.trim() === "") {
    throw new Error(
      "buildOpenSpaceLayerConfig: xmlString must be a non-empty string",
    );
  }

  const base = {
    Identifier: layerName,
    Name: layerName,
    FilePath: xmlString,
  };

  // Merge overrides last so callers can extend with Description, Enabled, etc.
  return Object.assign({}, base, overrides);
}

// ---------------------------------------------------------------------------
// Temporal layer helper
// ---------------------------------------------------------------------------

/**
 * Builds a complete OpenSpace layer config whose tile URL supports a date token
 * that OpenSpace resolves at runtime (e.g. for temporal scrubbing).
 *
 * Pass a static date string like `"2026-03-27"` for a fixed snapshot, or a
 * literal token string like `"${OpenSpaceTimeId}"` for a temporal layer.
 * In both cases the value is treated as an opaque string — JavaScript does NOT
 * evaluate dollar-brace sequences here.
 *
 * @param {string} layerName
 * @param {string} dateOrToken
 *   Fixed date (e.g. "2026-03-27") or a temporal token (e.g. "${OpenSpaceTimeId}").
 * @param {string} resolution
 * @param {string} format
 * @param {object} [options={}]
 *   Forwarded to {@link createTileServerGdalXml}.
 * @param {object} [layerOverrides={}]
 *   Forwarded to {@link buildOpenSpaceLayerConfig}.
 * @returns {{ Identifier: string, Name: string, FilePath: string } & object}
 */
export function createTemporalHostedLayerConfig(
  layerName,
  dateOrToken,
  resolution,
  format,
  options = {},
  layerOverrides = {},
) {
  // dateOrToken is passed as a plain JS string. If it contains "${OpenSpaceTimeId}"
  // that literal text ends up verbatim in the ServerUrl inside the XML, where
  // OpenSpace's temporal tile provider processes it at render time.
  const xmlString = createTileServerGdalXml(
    layerName,
    dateOrToken,
    resolution,
    format,
    options,
  );

  return buildOpenSpaceLayerConfig(layerName, xmlString, layerOverrides);
}

// ---------------------------------------------------------------------------
// OpenSpace API adapter
// ---------------------------------------------------------------------------

/**
 * Default adapter that calls the OpenSpace WebSocket API via the library()
 * proxy from openspace-api.js.
 *
 * Expected API shape (from openspace-api.js `library()` result):
 *   openspace.globebrowsing.addLayer(globeIdentifier, layerGroup, layerConfig)
 *
 * @param {object} apiObj        - Connected OpenSpace API instance.
 * @param {string} globeIdentifier
 * @param {string} layerGroup
 * @param {object} layerConfig
 * @returns {Promise<any>}
 */
async function _defaultAdapter(
  apiObj,
  globeIdentifier,
  layerGroup,
  layerConfig,
) {
  // `library()` performs an async round-trip to discover Lua function signatures,
  // then returns a JS proxy object mirroring the Lua namespace tree.
  const openspace = await apiObj.library();
  return openspace.globebrowsing.addLayer(
    globeIdentifier,
    layerGroup,
    layerConfig,
  );
}

/**
 * Builds a GDAL_WMS XML string, wraps it in an OpenSpace layer config, and
 * submits that config to OpenSpace through the provided API object.
 *
 * Adapter pattern
 * ---------------
 * If your API object has a different shape than the OpenSpace WebSocket client
 * (e.g. a mock, a REST wrapper, or a direct Lua bridge), pass a custom
 * `adapterCallback` in params:
 *
 *   adapterCallback(apiObj, globeIdentifier, layerGroup, layerConfig) → Promise<any>
 *
 * This lets you swap the transport without changing the build logic.
 *
 * @param {object} openspaceApiObject
 *   A connected OpenSpace API object (created via `window.openspaceApi(host, port)`).
 * @param {object} params
 * @param {string}    params.layerName
 * @param {string}    params.date
 *   Date string or placeholder token — passed to createTileServerGdalXml.
 * @param {string}    params.resolution
 * @param {string}    params.format
 * @param {string}    [params.globeIdentifier="Earth"]
 * @param {string}    [params.layerGroup="ColorLayers"]
 * @param {object}    [params.options={}]
 *   Forwarded to createTileServerGdalXml (baseUrl, projection, etc.).
 * @param {object}    [params.layerOverrides={}]
 *   Merged onto the layer config (Description, Enabled, etc.).
 * @param {Function}  [params.adapterCallback]
 *   Custom API adapter; defaults to the OpenSpace WebSocket library() proxy.
 * @returns {Promise<{
 *   success: boolean,
 *   layerConfig: object|null,
 *   result: any,
 *   error?: Error
 * }>}
 */
export async function addHostedLayerToOpenSpace(openspaceApiObject, params) {
  const {
    layerName,
    date,
    resolution,
    format,
    globeIdentifier = "Earth",
    layerGroup = "ColorLayers",
    options = {},
    layerOverrides = {},
    adapterCallback = _defaultAdapter,
  } = params;

  // --- Phase 1: build the layer config (synchronous, can fail on bad input) ---
  let layerConfig;
  try {
    const xmlString = createTileServerGdalXml(
      layerName,
      date,
      resolution,
      format,
      options,
    );
    layerConfig = buildOpenSpaceLayerConfig(
      layerName,
      xmlString,
      layerOverrides,
    );
  } catch (buildErr) {
    return { success: false, layerConfig: null, result: null, error: buildErr };
  }

  // --- Phase 2: submit via the API adapter ---
  try {
    const result = await adapterCallback(
      openspaceApiObject,
      globeIdentifier,
      layerGroup,
      layerConfig,
    );
    return { success: true, layerConfig, result };
  } catch (apiErr) {
    return { success: false, layerConfig, result: null, error: apiErr };
  }
}

// ---------------------------------------------------------------------------
// Usage examples (illustrative — not executed on import)
// ---------------------------------------------------------------------------
//
// --- Example 1: Static layer (single fixed date) ---
//
//   import { addHostedLayerToOpenSpace } from './hosted-layer.js';
//
//   const api = window.openspaceApi('localhost', 4682);
//   api.onConnect(async () => {
//     const result = await addHostedLayerToOpenSpace(api, {
//       layerName:  'sea-surface-temperature',
//       date:       '2026-03-27',
//       resolution: '1km',
//       format:     'png',
//       options: { baseUrl: 'https://tiles.example.com' },
//       layerOverrides: { Description: 'Daily SST composite', Enabled: true },
//     });
//     if (!result.success) console.error('Layer add failed:', result.error);
//   });
//   api.connect();
//
//
// --- Example 2: Temporal layer (date resolved by OpenSpace at render time) ---
//
//   import { createTemporalHostedLayerConfig } from './hosted-layer.js';
//
//   // '${OpenSpaceTimeId}' is a plain JS string; it is NOT a template literal.
//   const temporalConfig = createTemporalHostedLayerConfig(
//     'precipitation',
//     '${OpenSpaceTimeId}',   // ← literal string value, preserved verbatim in XML
//     '500m',
//     'png',
//     { baseUrl: 'https://tiles.example.com' },
//     { Description: 'Precipitation (temporal)', Enabled: true },
//   );
//   // temporalConfig.FilePath will contain ".../${OpenSpaceTimeId}/500m/${z}/..." literally.
//   // Pass temporalConfig to openspace.globebrowsing.addLayer(globe, group, temporalConfig).
//
//
// --- Example 3: Dashboard form submission ---
//
//   document.getElementById('add-layer-form').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const data = new FormData(e.target);
//     const result = await addHostedLayerToOpenSpace(window._openspaceApi, {
//       layerName:  data.get('layerName'),
//       date:       data.get('date'),
//       resolution: data.get('resolution'),
//       format:     data.get('format'),
//       options:  { baseUrl: data.get('tileServerBase') || undefined },
//     });
//     updateStatusBanner(result.success ? 'Layer added.' : result.error.message);
//   });
