import { useState } from "react";
import "./SearchPage.css";

const MAX_ZOOM = 6;
const BASE_TILES_X = 42;
const BASE_TILES_Y = 21;

function DailyTemperatureSearchPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);

  const [zoom, setZoom] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const getMaxXIndex = (zoomLevel: number) => {
    const divisor = Math.pow(2, MAX_ZOOM - zoomLevel);
    return Math.ceil(BASE_TILES_X / divisor) - 1;
  };

  const getMaxYIndex = (zoomLevel: number) => {
    const divisor = Math.pow(2, MAX_ZOOM - zoomLevel);
    return Math.ceil(BASE_TILES_Y / divisor) - 1;
  };

  const handleSubmit = () => {
    const url = "http://localhost:54139/tiles/Tif/Bmng/tile";
    setBaseUrl(url);
    setZoom(0);
    setX(0);
    setY(0);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleZoomIn = () => {
    setZoom((prev) => {
      const next = Math.min(prev + 1, MAX_ZOOM);
      setX((prevX) => Math.min(prevX, getMaxXIndex(next)));
      setY((prevY) => Math.min(prevY, getMaxYIndex(next)));
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 1, 0);
      setX((prevX) => Math.min(prevX, getMaxXIndex(next)));
      setY((prevY) => Math.min(prevY, getMaxYIndex(next)));
      return next;
    });
  };

  const handleXIncrement = () => {
    setX((prev) => Math.min(prev + 1, getMaxXIndex(zoom)));
  };

  const handleXDecrement = () => {
    setX((prev) => Math.max(prev - 1, 0));
  };

  const handleYIncrement = () => {
    setY((prev) => Math.min(prev + 1, getMaxYIndex(zoom)));
  };

  const handleYDecrement = () => {
    setY((prev) => Math.max(prev - 1, 0));
  };

  const getCurrentImageUrl = () => {
    if (!baseUrl) return null;
    return `${baseUrl}/${zoom}/${y}/${x}.jpg`;
  };

  return (
    <>
      <h1
        style={{
          color: "white",
          fontFamily: "Inria Serif",
          fontSize: "35px",
          fontWeight: "lighter",
        }}
      >
        Daily Temperature
      </h1>

      <h2
        style={{
          color: "white",
          fontFamily: "Inria Serif",
          fontSize: "20px",
          fontWeight: "lighter",
          marginTop: "-20px",
          marginBottom: "20px",
        }}
      >
        Maps that show a daily temperature overlay on the OpenSpace globe.
      </h2>

      <div className="search">
        <div className="date-selection">
          <label htmlFor="start">Please select a date:</label>
          <input
            type="date"
            id="start"
            name="date"
            min="1900-01-01"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <div className="buttons">
            <button type="button" onClick={handleSubmit}>
              Submit
            </button>
          </div>
        </div>
      </div>

      <div className="line-1"></div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "50px",
        }}
      >
        <h2
          style={{
            color: "white",
            fontFamily: "Inria Serif",
            fontSize: "20px",
            fontWeight: "lighter",
            margin: "0",
          }}
        >
          Suggested Maps
        </h2>
      </div>

      {/* Suggested Map 1 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "15px",
        }}
      >
        <h2
          style={{
            color: "white",
            fontFamily: "Inria Serif",
            fontSize: "20px",
            fontWeight: "lighter",
            margin: "0",
          }}
        >
          Hottest Average World Temp:
        </h2>

        <div className="buttons">
          <button
            type="button"
            onClick={() => {
              setBaseUrl("http://localhost:54139/tiles/Test-CR/Bmng/tile");
              setZoom(1);
              setX(0);
              setY(0);
              setIsModalOpen(true);
            }}
          >
            July 22, 2024
          </button>
        </div>
      </div>

      {/* Suggested Map 2 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "15px",
        }}
      >
        <h2
          style={{
            color: "white",
            fontFamily: "Inria Serif",
            fontSize: "20px",
            fontWeight: "lighter",
            margin: "0",
          }}
        >
          Day with Coldest Recorded Surface Temp:
        </h2>

        <div className="buttons">
          <button
            type="button"
            onClick={() => {
              setBaseUrl("http://localhost:54139/tiles/Test-CR/Bmng/tile");
              setZoom(0);
              setX(0);
              setY(0);
              setIsModalOpen(true);
            }}
          >
            July 21, 1983
          </button>
        </div>
      </div>

      {isModalOpen && baseUrl && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>
              ✕
            </button>

            <img
              src={getCurrentImageUrl() || ""}
              alt="Daily temperature map"
              style={{
                maxWidth: "100%",
                maxHeight: "45vh",
                borderRadius: "8px",
                objectFit: "contain",
              }}
            />
            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                borderRadius: "8px",
                color: "white",
                fontFamily: "Inria Serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ marginBottom: "15px", textAlign: "center" }}>
                <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                  Zoom Level: {zoom} (Max: {MAX_ZOOM})
                </div>

                <button
                  onClick={handleZoomOut}
                  disabled={zoom === 0}
                  className="nav-button"
                >
                  Zoom Out (-)
                </button>

                <button
                  onClick={handleZoomIn}
                  disabled={zoom === MAX_ZOOM}
                  className="nav-button"
                >
                  Zoom In (+)
                </button>
              </div>

              <div style={{ marginBottom: "15px", textAlign: "center" }}>
                <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                  X Coordinate: {x} (Max: {getMaxXIndex(zoom)})
                </div>

                <button
                  onClick={handleXDecrement}
                  disabled={x === 0}
                  className="nav-button"
                >
                  ← X-
                </button>

                <button
                  onClick={handleXIncrement}
                  disabled={x === getMaxXIndex(zoom)}
                  className="nav-button"
                >
                  X+ →
                </button>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                  Y Coordinate: {y} (Max: {getMaxYIndex(zoom)})
                </div>

                <button
                  onClick={handleYDecrement}
                  disabled={y === 0}
                  className="nav-button"
                >
                  ↑ Y-
                </button>

                <button
                  onClick={handleYIncrement}
                  disabled={y === getMaxYIndex(zoom)}
                  className="nav-button"
                >
                  Y+ ↓
                </button>
              </div>

              <div
                style={{
                  marginTop: "15px",
                  padding: "10px",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  fontSize: "12px",
                  wordBreak: "break-all",
                  width: "100%",
                  textAlign: "center",
                }}
              >
                {getCurrentImageUrl()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DailyTemperatureSearchPage;
