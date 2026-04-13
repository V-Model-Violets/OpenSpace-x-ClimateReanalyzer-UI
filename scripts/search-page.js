// Search Page JavaScript

// Initialize date picker on page load
let datePicker;

window.addEventListener("DOMContentLoaded", function () {
  datePicker = createCalendarPicker("dateInput", {
    minYear: 1900,
    maxYear: new Date().getFullYear() + 1,
  });
  // Initialize OpenSpace connection after page loads
  initializeOpenSpaceConnection();
});

let openspace = null; // OpenSpace Lua library object (populated after API connects)
let openspaceApi = null; // OpenSpace WebSocket API instance

// Identifier used when adding/replacing the globe overlay layer in OpenSpace
const LAYER_ID = "EarthOverlay";

/**
 * Maps page filenames (without .html) to their ClimateReanalyzer layer type.
 * Valid types: mslp | prcp | sst | sst_anom | t2 | t2anom | ws10 | ws500
 */
const PAGE_TYPE_MAP = {
  "daily-temperature": "t2",
  precipitation: "prcp",
  "sea-surface-temperature": "sst",
  jetstream: "ws500",
  "ice-snow-coverage": "mslp",
};

/**
 * Returns the ClimateReanalyzer layer type for the current page,
 * derived from the HTML filename in window.location.pathname.
 *
 * @returns {string}
 */
function getPageLayerType() {
  const filename = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "");
  return PAGE_TYPE_MAP[filename] || "t2";
}

/**
 * Builds a GDAL_WMS XML string for the ClimateReanalyzer TMS tile server.
 * The ${z}, ${y}, ${x} tokens are left as literal text so GDAL resolves
 * them at render time — they are NOT JavaScript template expressions.
 *
 * @param {string} type - Layer type, e.g. "t2", "prcp", "sst".
 * @param {string} date - Date in YYYYMMDD format, e.g. "20120315".
 * @returns {string}
 */
function buildGdalWmsXml(type, date) {
  const serverUrl =
    "http://mco2.acg.maine.edu/capstone/daily/" +
    type +
    "/" +
    date +
    "/tile/${z}/${y}/${x}";
  return [
    "<GDAL_WMS>",
    '  <Service name="TMS">',
    "    <ServerUrl>" + serverUrl + "</ServerUrl>",
    "  </Service>",
    "  <DataWindow>",
    "    <UpperLeftX>-180.0</UpperLeftX>",
    "    <UpperLeftY>90.0</UpperLeftY>",
    "    <LowerRightX>180.0</LowerRightX>",
    "    <LowerRightY>-90.0</LowerRightY>",
    "    <SizeX>4000</SizeX>",
    "    <SizeY>2000</SizeY>",
    "    <TileLevel>3</TileLevel>",
    "    <YOrigin>top</YOrigin>",
    "  </DataWindow>",
    "  <Projection>EPSG:4326</Projection>",
    "  <BlockSizeX>512</BlockSizeX>",
    "  <BlockSizeY>512</BlockSizeY>",
    "  <BandsCount>3</BandsCount>",
    "  <MaxConnections>10</MaxConnections>",
    "</GDAL_WMS>",
  ].join("\n");
}

// Initialize Openspace Connection
function initializeOpenSpaceConnection() {
  // Check if openspaceApi is available
  if (typeof window.openspaceApi === "undefined") {
    console.warn(
      "OpenSpace API not loaded. Make sure openspace-api.js is included.",
    );
    document.getElementById("connection-status").innerHTML =
      "OpenSpace API not loaded. Please check script includes.";
    return;
  }

  // Try to connect with default localhost
  connectToOpenSpace();
}

var connectToOpenSpace = () => {
  var host = document.getElementById("ipaddress")?.value || "localhost";
  var port = 4682;

  if (typeof window.openspaceApi === "undefined") {
    console.error("OpenSpace API not available");
    document.getElementById("connection-status").innerHTML =
      "OpenSpace API not available. Please refresh the page.";
    return;
  }

  var api = window.openspaceApi(host, port);
  openspaceApi = api;

  api.onDisconnect(() => {
    console.log("OpenSpace disconnected");
    document.getElementById("container").style.display = "block";
    var statusDiv = document.getElementById("connection-status");
    statusDiv.innerHTML =
      '<span style="color: #ff6b6b; margin-right: 10px;">Disconnected from OpenSpace</span>' +
      '<input id="ipaddress" type="text" placeholder="Enter IP address" value="' +
      host +
      '" style="padding: 8px; border: 1px solid #555; border-radius: 4px; background: rgba(255, 255, 255, 0.1); color: #fff; margin-right: 10px;" />' +
      '<button onclick="connectToOpenSpace();" class="search-button" style="margin-left: 0;">Reconnect</button>';
    openspace = null;
  });

  api.onConnect(async () => {
    document.getElementById("container").style.display = "block";
    document.getElementById("connection-status").innerHTML =
      '<span style="color: #51cf66;">✓ Connected to OpenSpace at ' +
      host +
      ":" +
      port +
      "</span>";

    try {
      openspace = await api.library();
    } catch (e) {
      console.error("Error initializing OpenSpace:", e);
      document.getElementById("connection-status").innerHTML =
        "Connected but initialization failed: " + e.message;
    }
  });

  // Connect
  api.connect();
};

// Navigate back to the main index page
function goBack() {
  window.location.href = "../index.html";
}

/**
 * Handles the date submission from the calendar picker.
 * If connected to OpenSpace, pushes the selected date's time and tile layer.
 */
function submitDate() {
  const selectedDate = datePicker ? datePicker.getValue() : null;

  // Require a date to be chosen before proceeding
  if (!selectedDate) {
    alert("Please select a date first.");
    return;
  }

  // Update OpenSpace globe display and simulation time if connected
  if (openspaceApi) {
    try {
      updateOpenSpaceForDate(selectedDate);
    } catch (e) {
      console.warn("Failed to update OpenSpace for selected date:", e);
    }
  }
}

/**
 * Synchronises the OpenSpace application with the user-selected date.
 * Performs two independent operations:
 *   1. Sets the in-simulation clock to noon (12:00:00) on the selected day.
 *   2. Adds (or replaces) a globe overlay layer on Earth using the configured
 *      tile file path.
 *
 * Each operation is wrapped in its own try/catch so a failure in one does
 * not prevent the other from running.
 *
 * @param {string} selectedDate - ISO date string in "YYYY-MM-DD" format.
 */
async function updateOpenSpaceForDate(selectedDate) {
  if (!selectedDate || !openspaceApi) return;

  // Split the date string into its year, month, and day components
  const parts = selectedDate.split("-");
  if (parts.length !== 3) return;

  const [yearStr, monthStr, dayStr] = parts;
  if (!yearStr || !monthStr || !dayStr) return;

  // Build a full ISO 8601 datetime at noon on the selected day
  const isoTime = `${yearStr.padStart(4, "0")}-${monthStr.padStart(
    2,
    "0",
  )}-${dayStr.padStart(2, "0")}T12:00:00`;

  // Step 1: Advance the OpenSpace simulation clock to the selected date
  try {
    await openspaceApi.executeLuaScript(
      `openspace.time.setTime("${isoTime}")`,
      false,
    );
  } catch (e) {
    console.warn("Failed to set OpenSpace time:", e);
  }

  // Step 2: Add the tile imagery as a globe overlay layer in OpenSpace.
  // FilePath receives a GDAL_WMS XML string so OpenSpace fetches tiles
  // directly from the ClimateReanalyzer tile server over HTTP.
  try {
    const layerType = getPageLayerType();
    const gdalXml = buildGdalWmsXml(layerType, "20120315");

    // Collapse the XML to a single line, then escape every double-quote so
    // that Lua does not interpret them as the end of the FilePath string value.
    const xmlOneLine = gdalXml.replace(/\n\s*/g, " ").replace(/"/g, '\\"');

    const lua =
      `openspace.globebrowsing.addLayer("Earth", "ColorLayers", {` +
      ` Identifier = "${LAYER_ID}",` +
      ` Name = "Climate Reanalyzer Tiles",` +
      ` FilePath = "${xmlOneLine}",` +
      ` Enabled = true` +
      ` })`;

    await openspaceApi.executeLuaScript(lua, false);
  } catch (e) {
    console.warn("Failed to display tile layer in OpenSpace:", e);
  }
}
