import { Routes, Route } from "react-router-dom";
import App from "./App";
import DailyTemperatureSearchPage from "./pages/DailyTemperatureSearchPage";
import PrecipitationSearchPage from "./pages/PrecipitationSearchPage";
import SeaSurfaceTemperatureSearchPage from "./pages/SeaSurfaceTemperatureSearchPage";
import IceSnowCoverageSearchPage from "./pages/IceSnowCoverageSearchPage";
import JetstreamSearchPage from "./pages/JetstreamSearchPage";

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
      <Route path="/" element={<JetstreamSearchPage />} />
      <Route path="/jetstream" element={<JetstreamSearchPage />} />
    </Routes>
  );
}

export default Router;
