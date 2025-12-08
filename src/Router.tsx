import { Routes, Route } from "react-router-dom";
import App from "./App";
import DailyTemperatureSearchPage from "./pages/DailyTemperatureSearchPage";
import PrecipitationSearchPage from "./pages/PrecipitationSearchPage";
import SeaSurfaceTemperatureSearchPage from "./pages/SeaSurfaceTemperatureSearchPage";
import IceSnowCoverageSearchPage from "./pages/IceSnowCoverageSearchPage";

function Router() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/daily-temperature"
        element={<DailyTemperatureSearchPage />}
      />
      <Route path="/precipitation" element={<PrecipitationSearchPage />} />
      <Route
        path="/sea-surface-temperature"
        element={<SeaSurfaceTemperatureSearchPage />}
      />
      <Route
        path="/ice-snow-coverage"
        element={<IceSnowCoverageSearchPage />}
      />
    </Routes>
  );
}

export default Router;
