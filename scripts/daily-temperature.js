// Daily Temperature Search Page JavaScript

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

const MAX_ZOOM = 6;
const BASE_TILES_X = 42;
const BASE_TILES_Y = 21;

let zoom = 0;
let x = 0;
let y = 0;
let baseUrl = null;
let openspace = null;
let openspaceApi = null;

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

function goBack() {
  window.location.href = "../index.html";
}

function getMaxXIndex(zoomLevel) {
  const divisor = Math.pow(2, MAX_ZOOM - zoomLevel);
  return Math.ceil(BASE_TILES_X / divisor) - 1;
}

function getMaxYIndex(zoomLevel) {
  const divisor = Math.pow(2, MAX_ZOOM - zoomLevel);
  return Math.ceil(BASE_TILES_Y / divisor) - 1;
}

function getCurrentImageUrl() {
  if (!baseUrl) return null;
  return `${baseUrl}/${zoom}/${y}/${x}.jpg`;
}

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

function submitDate() {
  const selectedDate = datePicker ? datePicker.getValue() : null;

  if (!selectedDate) {
    alert("Please select a date first.");
    return;
  }

  // Use default URL for date submission
  baseUrl = "http://localhost:54139/tiles/Tif/Bmng/tile";
  zoom = 0;
  x = 0;
  y = 0;

  openModal();

  // Update OpenSpace globe display and time if connected
  if (openspaceApi) {
    try {
      updateOpenSpaceForDate(selectedDate);
    } catch (e) {
      console.warn("Failed to update OpenSpace for selected date:", e);
    }
  }
}

function loadSuggestedMap(url, zoomLevel, xCoord, yCoord) {
  baseUrl = url;
  zoom = zoomLevel;
  x = xCoord;
  y = yCoord;

  openModal();
}

function openModal() {
  document.getElementById("mapModal").classList.add("show");
  updateMapDisplay();
}

function closeModal() {
  document.getElementById("mapModal").classList.remove("show");
}

function zoomIn() {
  if (zoom < MAX_ZOOM) {
    zoom++;
    x = Math.min(x, getMaxXIndex(zoom));
    y = Math.min(y, getMaxYIndex(zoom));
    updateMapDisplay();
  }
}

function zoomOut() {
  if (zoom > 0) {
    zoom--;
    x = Math.min(x, getMaxXIndex(zoom));
    y = Math.min(y, getMaxYIndex(zoom));
    updateMapDisplay();
  }
}

function xIncrement() {
  if (x < getMaxXIndex(zoom)) {
    x++;
    updateMapDisplay();
  }
}

function xDecrement() {
  if (x > 0) {
    x--;
    updateMapDisplay();
  }
}

function yIncrement() {
  if (y < getMaxYIndex(zoom)) {
    y++;
    updateMapDisplay();
  }
}

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

async function updateOpenSpaceForDate(selectedDate) {
  if (!selectedDate || !openspaceApi) return;

  const parts = selectedDate.split("-");
  if (parts.length !== 3) return;

  const [yearStr, monthStr, dayStr] = parts;
  if (!yearStr || !monthStr || !dayStr) return;

  const isoTime = `${yearStr.padStart(4, "0")}-${monthStr.padStart(
    2,
    "0",
  )}-${dayStr.padStart(2, "0")}T12:00:00`;

  try {
    await openspaceApi.executeLuaScript(
      `openspace.time.setTime("${isoTime}")`,
      false,
    );
  } catch (e) {
    console.warn("Failed to set OpenSpace time:", e);
  }

  try {
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
