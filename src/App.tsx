import { Link } from "react-router-dom";
import "./App.css";
import finalLogo from "./assets/finalLogo.png";
import UmaineLogo from "./assets/university_of_maine_logo-freelogovectors.net_-2706234335.png";

function App() {
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
        Climate Reanalyzer
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
        Various Global Maps Collected by the Climate Reanalyzer at the
        Univeristy of Maine
      </h2>
      <div className="buttons" style={{ fontFamily: "Inria Serif" }}>
        <Link to="/daily-temperature">
          <button>Daily Temperature</button>
        </Link>
        <Link to="/precipitation">
          <button>Precipitation</button>
        </Link>
        <Link to="/sea-surface-temperature">
          <button>Sea Surface Temperature</button>
        </Link>
        <Link to="/jetstream">
          <button>Jetstream</button>
        </Link>
        <Link to="/ice-snow-coverage">
          <button>Ice and Snow Coverage</button>
        </Link>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "15px",
          marginTop: "20px",
        }}
      >
        <img
          src={finalLogo}
          alt="V-Model Violets Logo"
          width="60px"
          height="60px"
        />
        <h2
          style={{
            color: "white",
            fontFamily: "Inria Serif",
            fontSize: "20px",
            fontWeight: "lighter",
            margin: "0",
          }}
        >
          V-Model Violets at UMaine
        </h2>
        <img src={UmaineLogo} alt="UMaine Logo" width="70px" height="50px" />
      </div>
    </>
  );
}

export default App;
