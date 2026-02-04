// Daily Temperature Search Page JavaScript

const MAX_ZOOM = 6;
const BASE_TILES_X = 42;
const BASE_TILES_Y = 21;

let zoom = 0;
let x = 0;
let y = 0;
let baseUrl = null;

function goBack() {
  window.location.href = "index.html";
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
  const dateInput = document.getElementById("dateInput");
  const selectedDate = dateInput.value;

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
