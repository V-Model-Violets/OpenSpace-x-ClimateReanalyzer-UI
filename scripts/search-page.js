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

// Maximum zoom level supported by the tile server pyramid
const MAX_ZOOM = 6;
// Number of tiles in X direction at maximum zoom
const BASE_TILES_X = 42;
// Number of tiles in Y direction at maximum zoom
const BASE_TILES_Y = 21;

// Current tile navigation state
let zoom = 0; // Active zoom level (0 = most zoomed out, MAX_ZOOM = most zoomed in)
let x = 0; // Active tile column index
let y = 0; // Active tile row index
let baseUrl = null; // Base URL of the currently loaded tile server
let openspace = null; // OpenSpace Lua library object (populated after API connects)
let openspaceApi = null; // OpenSpace WebSocket API instance

// Identifier used when adding/replacing the globe overlay layer in OpenSpace
const LAYER_ID = "EarthOverlay";
// Change this to a local directory containing earth.tif for testing.
// Openspace does not seem to like relative filepaths.
const FILE_PATH = "earth.tif";

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
 * Returns the maximum valid tile X index for a given zoom level.
 * The tile grid resolution is halved for each step down from MAX_ZOOM.
 *
 * @param {number} zoomLevel
 * @returns {number}
 */
function getMaxXIndex(zoomLevel) {
  const divisor = Math.pow(2, MAX_ZOOM - zoomLevel);
  return Math.ceil(BASE_TILES_X / divisor) - 1;
}

/**
 * Returns the maximum valid tile Y index for a given zoom level.
 *
 * @param {number} zoomLevel
 * @returns {number}
 */
function getMaxYIndex(zoomLevel) {
  const divisor = Math.pow(2, MAX_ZOOM - zoomLevel);
  return Math.ceil(BASE_TILES_Y / divisor) - 1;
}

/**
 * Constructs the URL for the tile at the current zoom, x, and y coordinates.
 * Returns null if no base URL has been configured yet.
 *
 * @returns {string|null}
 */
function getCurrentImageUrl() {
  if (!baseUrl) return null;
  return `${baseUrl}/${zoom}/${y}/${x}.jpg`;
}

/**
 * Refreshes the tile map viewer UI to reflect the current zoom, x, and y state.
 * Updates the displayed tile image, coordinate readouts, and the enabled/disabled
 * state of all navigation buttons.
 */
function updateMapDisplay() {
  const imageUrl = getCurrentImageUrl();
  if (imageUrl) {
    document.getElementById("mapImage").src = imageUrl;
    document.getElementById("currentUrl").textContent = imageUrl;
  }

  // Update coordinates display
  document.getElementById("zoomLevel").textContent = zoom;
  document.getElementById("xCoord").textContent = x;
  document.getElementById("yCoord").textContent = y;
  document.getElementById("maxX").textContent = getMaxXIndex(zoom);
  document.getElementById("maxY").textContent = getMaxYIndex(zoom);

  // Update button states
  document.getElementById("zoomOutBtn").disabled = zoom === 0;
  document.getElementById("zoomInBtn").disabled = zoom === MAX_ZOOM;
  document.getElementById("xDecBtn").disabled = x === 0;
  document.getElementById("xIncBtn").disabled = x === getMaxXIndex(zoom);
  document.getElementById("yDecBtn").disabled = y === 0;
  document.getElementById("yIncBtn").disabled = y === getMaxYIndex(zoom);
}

/**
 * Handles the date submission from the calendar picker.
 * Resets the tile view to the default local tile server and zoom level,
 * opens the map modal, and (if connected) pushes the selected date's time
 * and tile layer to the OpenSpace application.
 */
function submitDate() {
  const selectedDate = datePicker ? datePicker.getValue() : null;

  // Require a date to be chosen before proceeding
  if (!selectedDate) {
    alert("Please select a date first.");
    return;
  }

  // Point to the local tile server and start at the lowest zoom level
  baseUrl = "http://localhost:54139/tiles/Tif/Bmng/tile";
  zoom = 0;
  x = 0;
  y = 0;

  // Open the tile map viewer modal
  openModal();

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
 * Loads a pre-defined ("suggested") map at a specific tile URL and coordinates,
 * then opens the tile viewer modal. Called by suggested-map buttons in the UI.
 *
 * @param {string} url - Base URL of the tile server to load.
 * @param {number} zoomLevel - Initial zoom level to display.
 * @param {number} xCoord - Initial tile X index.
 * @param {number} yCoord - Initial tile Y index.
 */
function loadSuggestedMap(url, zoomLevel, xCoord, yCoord) {
  baseUrl = url;
  zoom = zoomLevel;
  x = xCoord;
  y = yCoord;

  openModal();
}

// Shows the tile map viewer modal and refreshes the displayed tile and controls
function openModal() {
  document.getElementById("mapModal").classList.add("show");
  updateMapDisplay();
}

// Hides the tile map viewer modal
function closeModal() {
  document.getElementById("mapModal").classList.remove("show");
}

// Zoom in one level, clamping x/y indices to remain within the new valid range
function zoomIn() {
  if (zoom < MAX_ZOOM) {
    zoom++;
    x = Math.min(x, getMaxXIndex(zoom));
    y = Math.min(y, getMaxYIndex(zoom));
    updateMapDisplay();
  }
}

// Zoom out one level, clamping x/y indices to remain within the new valid range
function zoomOut() {
  if (zoom > 0) {
    zoom--;
    x = Math.min(x, getMaxXIndex(zoom));
    y = Math.min(y, getMaxYIndex(zoom));
    updateMapDisplay();
  }
}

// Move the tile view one step in the positive X direction (east)
function xIncrement() {
  if (x < getMaxXIndex(zoom)) {
    x++;
    updateMapDisplay();
  }
}

// Move the tile view one step in the negative X direction (west)
function xDecrement() {
  if (x > 0) {
    x--;
    updateMapDisplay();
  }
}

// Move the tile view one step in the positive Y direction (south)
function yIncrement() {
  if (y < getMaxYIndex(zoom)) {
    y++;
    updateMapDisplay();
  }
}

// Move the tile view one step in the negative Y direction (north)
function yDecrement() {
  if (y > 0) {
    y--;
    updateMapDisplay();
  }
}

// Close modal when clicking outside of it
window.onclick = function (event) {
  const modal = document.getElementById("mapModal");
  if (event.target === modal) {
    closeModal();
  }
};

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

  // Step 2: Add the tile imagery as a globe overlay layer in OpenSpace
  try {
    // Lua script that registers the layer in Earth's Overlays group
    const lua = `
      openspace.globebrowsing.addLayer("Earth", "Overlays", {
      Identifier = "${LAYER_ID}",
      Name = "Flat Earth",
      FilePath = "${FILE_PATH}",
      BlendMode = "Color",
      Enabled = true,})`;

    await openspaceApi.executeLuaScript(lua, false);
  } catch (e) {
    console.warn("Failed to display flat earth layer in OpenSpace:", e);
  }
}
