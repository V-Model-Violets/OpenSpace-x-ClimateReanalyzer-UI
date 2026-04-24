// Search Page JavaScript

// Set to true locally to enable debug mode (shows tile preview and logs WMS XML)
const DEBUG_MODE = true;

// Initialize date picker on page load
let datePicker;

//initialize layer drop down selector on page load
let layerDropdownOpen = false;

//initialize layer selected
let selectedLayerId = null;

window.addEventListener("DOMContentLoaded", function () {
  datePicker = createCalendarPicker("dateInput", {
    minYear: 1900,
    maxYear: new Date().getFullYear() + 1,
  });
  // Initialize OpenSpace connection after page loads
  initializeOpenSpaceConnection();
  // Populate layer select dropdown
  populateLayerSelect();
});

let openspace = null; // OpenSpace Lua library object (populated after API connects)
let openspaceApi = null; // OpenSpace WebSocket API instance

/**
 * Maps page filenames (without .html) to their ClimateReanalyzer layer type.
 * Valid types: mslp | prcp | sst | sst_anom | t2 | t2anom | ws10 | ws500
 */
const PAGE_TYPE_MAP = {
  temperature: "t2",
  "temperature-anomaly": "t2anom",
  precipitation: "prcp",
  "sea-surface-temperature": "sst",
  "sea-level-pressure": "mslp",
  jetstream: "ws500",
  wind: "ws10",
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
 * Session storage management for tracking which layers have been created in OpenSpace
 * and their enabled/disabled state. This allows the UI to reflect the current
 * state of layers across page reloads.
 */
function getSessionLayerIds() {
  try {
    return JSON.parse(
      sessionStorage.getItem("openspaceCreatedLayerIds") || "[]",
    );
  } catch (e) {
    console.warn("Failed to parse session layer IDs:", e);
    return [];
  }
}

function saveSessionLayerId(layerId) {
  const layerIds = getSessionLayerIds();
  if (!layerIds.includes(layerId)) {
    layerIds.push(layerId);
    sessionStorage.setItem(
      "openspaceCreatedLayerIds",
      JSON.stringify(layerIds),
    );
  }
}

function getSessionLayerEnabled(layerId) {
  try {
    const enabledMap = JSON.parse(
      sessionStorage.getItem("openspaceLayerEnabled") || "{}",
    );
    return enabledMap[layerId] !== false; // Default to true if not set
  } catch (e) {
    return true;
  }
}

function setSessionLayerEnabled(layerId, enabled) {
  try {
    const enabledMap = JSON.parse(
      sessionStorage.getItem("openspaceLayerEnabled") || "{}",
    );
    enabledMap[layerId] = enabled;
    sessionStorage.setItem("openspaceLayerEnabled", JSON.stringify(enabledMap));
  } catch (e) {
    // Ignore
  }
}
/**
 * Populates the layer selection dropdown with layers that have been created in OpenSpace
 * and stored in sessionStorage. This allows users to toggle the visibility of previously
 * added layers across page reloads.
 */
function populateLayerSelect() {
  const container = document.getElementById("layerSelectContainer");
  if (!container) return;

  layerDropdownOpen = false
  container.innerHTML = ""; 
  const layerIds = getSessionLayerIds();

  container.innerHTML = `
    <div id="layerDropdownSelected" style="
      padding: 8px;
      background: rgba(255,255,255,0.1);
      border: 1px solid #555;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
    ">
      Select Layer ▼
    </div>
    <div id="layerDropdownOptions" style="
      display: none;
      margin-top: 4px;
      border: 1px solid #555;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.95);
      max-height: 200px;
      overflow-y: auto;
      position: absolute;
      z-index: 99999;
      width: 250px;
    ">
    </div>
  `;

  const optionsDiv = document.getElementById("layerDropdownOptions");

  layerIds.forEach((layerId) => {
    const opt = document.createElement("div");
    opt.textContent = layerId;
    opt.style.padding = "8px";
    opt.style.cursor = "pointer";
    opt.style.borderBottom = "1px solid rgba(255,255,255,0.1)";

    opt.onmouseenter = () => {
      opt.style.background = "rgba(255,255,255,0.1)";
    };
    opt.onmouseleave = () => {
      opt.style.background = "transparent";
    };

    opt.onclick = () => {
      selectLayer(layerId);
      toggleDropdown(false);
    };

    optionsDiv.appendChild(opt);
  });

  document.getElementById("layerDropdownSelected").onclick = () => {
    toggleDropdown(!layerDropdownOpen);
  };
}

// Helper function for populateLayersSelect
function toggleDropdown(forceState) {
  const options = document.getElementById("layerDropdownOptions");
  if (!options) return;

  layerDropdownOpen =
    typeof forceState === "boolean" ? forceState : !layerDropdownOpen;

  options.style.display = layerDropdownOpen ? "block" : "none";
}

function setDropdownLabel(text) {
  const label = document.getElementById("layerDropdownSelected");
  if (label) {
    label.textContent = `${text} ▼`;

      container.innerHTML = `
    <div id="layerDropdownSelected" style="
      padding: 8px;
      background: rgba(255,255,255,0.1);
      border: 1px solid #555;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
    ">
      ${text} ▼
    </div>
  `;
  }
}

function selectLayer(layerId) {
  selectedLayerId = layerId;
  console.log("Selected layer:", layerId);

  setDropdownLabel(layerId);

  // Optional UI update elsewhere
  const label = document.getElementById("selectedLayerLabel");
  if (label) {
    label.textContent = layerId;
  }
}

async function toggleLayer() {
  if (!openspaceApi) return;

  const layerId = selectedLayerId;

  if (!layerId) {
    alert("Please select a layer first.");
    return;
  }

  try {
    const isEnabled = getSessionLayerEnabled(layerId);
    const newEnabled = !isEnabled;

    const setEnabledScript = `
      openspace.setPropertyValue(
        "Scene.Earth.Renderable.Layers.ColorLayers.${layerId}.Enabled",
        ${newEnabled}
      )
    `;

    await openspaceApi.executeLuaScript(setEnabledScript, false);

    setSessionLayerEnabled(layerId, newEnabled);

    console.log(
      `Layer ${layerId} toggled to ${newEnabled ? "enabled" : "disabled"}`
    );
  } catch (e) {
    console.warn("Failed to toggle layer:", e);
    alert("Failed to toggle layer. It may not exist.");
  }
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
    "  <BandsCount>4</BandsCount>",
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
 * Probes tile 0/0/0 first; shows an error popup if the date has no data,
 * then updates OpenSpace if connected.
 */
async function submitDate() {
  const selectedDate = datePicker ? datePicker.getValue() : null;

  // Require a date to be chosen before proceeding
  if (!selectedDate) {
    alert("Please select a date first.");
    return;
  }

  // Convert YYYY-MM-DD → YYYYMMDD to match the tile server URL format
  const dateStr = selectedDate.replace(/-/g, "");
  const layerType = getPageLayerType();

  // Probe tile 0/0/0 to confirm data exists for this date.
  // Using an Image avoids any CORS restrictions on a HEAD/GET fetch.
  const tileUrl =
    "http://mco2.acg.maine.edu/capstone/daily/" +
    layerType +
    "/" +
    dateStr +
    "/tile/0/0/0";

  const tileExists = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = tileUrl;
  });

  if (!tileExists) {
    alert(
      "No map data available for " +
        selectedDate +
        ".\nThe tile server returned no image for this date.",
    );
    return;
  }

  // Update OpenSpace globe display and simulation time if connected
  if (openspaceApi) {
    try {
      updateOpenSpaceForDate(selectedDate, dateStr);
    } catch (e) {
      console.warn("Failed to update OpenSpace for selected date:", e);
    }
  }

  // Debug mode: log WMS XML and show tile image preview
  if (DEBUG_MODE) {
    const layerType = getPageLayerType();
    const dateStr = "20120315";
    const wmsXml = buildGdalWmsXml(layerType, dateStr);
    console.log(
      "[Debug] WMS XML for " + layerType + " / " + dateStr + ":\n" + wmsXml,
    );
    showDebugPreview(layerType, dateStr);
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
/**
 * Renders a single full-globe tile (z/y/x = 0/0/0) inside the page for debugging.
 *
 * @param {string} layerType - e.g. "t2", "ws10".
 * @param {string} dateStr   - Date in YYYYMMDD format.
 */
function showDebugPreview(layerType, dateStr) {
  const baseUrl =
    "http://mco2.acg.maine.edu/capstone/daily/" +
    layerType +
    "/" +
    dateStr +
    "/tile";

  // z=0, y=0, x=0 — single tile covering the full globe
  const tilesHtml =
    '<img src="' +
    baseUrl +
    '/0/0/0" alt="tile 0,0,0" style="width:100%;display:block;" />';

  let preview = document.getElementById("debug-preview");
  if (!preview) {
    preview = document.createElement("div");
    preview.id = "debug-preview";
    preview.style.cssText =
      "margin: 20px auto; max-width: 800px; padding: 15px;" +
      " background: rgba(0,0,0,0.4); border-radius: 8px;" +
      " border: 1px solid rgba(255,255,255,0.2); color: #fff;";
    const container = document.querySelector(".page-container");
    if (container) container.appendChild(preview);
  }

  preview.innerHTML =
    '<p style="font-family:monospace;font-size:13px;color:#51cf66;margin:0 0 8px 0;">' +
    "Debug Preview \u2014 " +
    layerType +
    " / " +
    dateStr +
    "</p>" +
    tilesHtml;
}

async function updateOpenSpaceForDate(selectedDate, dateStr) {
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
    const gdalXml = buildGdalWmsXml(layerType, dateStr);
    const layerId = layerType + "_" + dateStr; // Unique ID for this layer instance

    // Collapse the XML to a single line, then escape every double-quote so
    // that Lua does not interpret them as the end of the FilePath string value.
    const xmlOneLine = gdalXml.replace(/\n\s*/g, " ").replace(/"/g, '\\"');

    const lua =
      `openspace.globebrowsing.addLayer("Earth", "ColorLayers", {` +
      ` Identifier = "${layerId}",` +
      ` Name = "Climate Reanalyzer Tiles",` +
      ` FilePath = "${xmlOneLine}",` +
      ` Enabled = true` +
      ` })`;

    await openspaceApi.executeLuaScript(lua, false);
    saveSessionLayerId(layerId);
    setSessionLayerEnabled(layerId, true);
    populateLayerSelect();
  } catch (e) {
    console.warn("Failed to display tile layer in OpenSpace:", e);
  }
}
