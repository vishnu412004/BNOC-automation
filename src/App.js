import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Dashboard from "./Pages/Dashboard";
import DeviceAnalysis from "./Pages/DeviceAnalysis";
import ProtectedRoute from "./Components/ProtectedRoute";
import IncidentTimeline from "./Pages/IncidentTimeline";
import AIAssistant from "./Pages/AIAssistant";

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

        {/* NEW ROUTE - ADDED ONLY */}
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
        <Route
          path="/ai-assistant/:incidentNumber"
          element={
            <ProtectedRoute>
              <AIAssistant />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
