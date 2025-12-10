import { useState } from "react";
import "./SearchPage.css";
import { ModernDatePicker } from "../components/MapDatePicker";

function IceSnowCoverageSearchPage() {
  const [selectedDate, setSelectedDate] = useState("");
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
        Ice and Snow Coverage
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
        Maps that show an Ice and Snow Coverage overlay on the OpenSpace globe.
      </h2>
      <div className="search">
        <div className="modern-date-selection">
          <ModernDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            label="Please select a date:"
            placeholder="Choose a date for ice and snow data"
            minDate="1900-01-01"
          />
          <div className="buttons" style={{ fontFamily: "Inria Serif" }}>
            <button>Submit</button>
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
          flexDirection: "column",
          alignItems: "center",
          marginTop: "25px",
        }}
      >
        <h2
          style={{
            color: "white",
            fontFamily: "Inria Serif",
            fontSize: "20px",
            fontWeight: "lighter",
            margin: "0 0 15px 0",
          }}
        >
          Highest Average Ice and Snow Coverage:
        </h2>
        <button className="suggested-map-button">July 22, 2024</button>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "25px",
        }}
      >
        <h2
          style={{
            color: "white",
            fontFamily: "Inria Serif",
            fontSize: "20px",
            fontWeight: "lighter",
            margin: "0 0 15px 0",
          }}
        >
          Day with Lowest Recorded Ice and Snow Coverage:
        </h2>
        <button className="suggested-map-button">July 21, 1983</button>
      </div>
    </>
  );
}

export default IceSnowCoverageSearchPage;
