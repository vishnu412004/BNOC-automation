import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Dashboard from "./Pages/Dashboard";
import DeviceAnalysis from "./Pages/DeviceAnalysis";
import ProtectedRoute from "./Components/ProtectedRoute";
import IncidentTimeline from "./Pages/IncidentTimeline";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/device-analysis/:deviceSysId"
          element={
            <ProtectedRoute>
              <DeviceAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/incident-timeline/:incidentNumber"
          element={
            <ProtectedRoute>
              <IncidentTimeline />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
