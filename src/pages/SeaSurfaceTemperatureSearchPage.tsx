import { useState } from "react";
import "./SearchPage.css";

function SeaSurfaceTemperatureSearchPage() {
  const [count, setCount] = useState(0);
  return (
    <>
      <h1
        style={{
          color: "white",
          fontFamily: "Inria Serif",
          fontSize: "35px",
          fontWeight: "lighter",
          verticalAlign: "top",
        }}
      >
        Sea Surface Temperature
      </h1>
      <h2
        style={{
          color: "white",
          fontFamily: "Inria Serif",
          fontSize: "20px",
          fontWeight: "lighter",
          marginTop: "-20px",
          marginBottom: "20px",
          lineHeight: "23px",
        }}
      >
        Maps that show a sea surface temperature overlay on the OpenSpace globe.
      </h2>
      <div className="search">
        <div className="date-selection">
          <label htmlFor="start">Please select a date:</label>
          <input type="date" id="start" name="date" min="1900-01-01" />
          <div className="buttons" style={{ fontFamily: "Inria Serif" }}>
            <button onClick={() => setCount((count) => count + 1)}>
              Submit {count}
            </button>
          </div>
        </div>
      </div>
      <div className="line-1"></div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "30px",
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0px",
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
          Hottest Average World Sea Surface Temp:
        </h2>
        <div className="buttons" style={{ fontFamily: "Inria Serif" }}>
          <button onClick={() => setCount((count) => count + 1)}>
            July 22, 2024 {count}
          </button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0px",
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
          Coldest Average World Sea Surface Temp:
        </h2>
        <div className="buttons" style={{ fontFamily: "Inria Serif" }}>
          <button onClick={() => setCount((count) => count + 1)}>
            July 21, 1983 {count}
          </button>
        </div>
      </div>
    </>
  );
}

export default SeaSurfaceTemperatureSearchPage;
