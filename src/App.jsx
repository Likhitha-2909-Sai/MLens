import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import Dataset from "./pages/Dataset";
import Experiments from "./pages/Experiments";
import ModelArena from "./pages/ModelArena";
import Compare from "./pages/Compare";
import Insights from "./pages/Insights";

import { DatasetProvider } from "./context/DatasetContext";

function App() {
  return (
    <BrowserRouter>
      <DatasetProvider>
        <Routes>
          <Route element={<DashboardLayout />}>

            <Route path="/" element={<Dashboard />} />

            <Route
              path="/dataset"
              element={<Dataset />}
            />

            <Route
              path="/experiments"
              element={<Experiments />}
            />

            <Route
              path="/model-arena"
              element={<ModelArena />}
            />

            <Route
              path="/compare"
              element={<Compare />}
            />

            <Route
              path="/insights"
              element={<Insights />}
            />

          </Route>
        </Routes>
      </DatasetProvider>
    </BrowserRouter>
  );
}

export default App;