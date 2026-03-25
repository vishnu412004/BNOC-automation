import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import appAssets from "../Config/appAssets";
import API_BASE_URL from "../Config/apiConfig";

function IncidentTimeline() {
  const { incidentNumber } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE_URL}/api/incident/${incidentNumber}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await response.json();
        setIncident(data.incident);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchIncident();
  }, [incidentNumber]);

  const timeline = [];

  if (incident?.opened_at) {
    timeline.push({
      label: "Incident Created",
      time: incident.opened_at,
      color: "bg-gray-500",
      icon: "📝",
    });
  }

  if (incident?.started) {
    timeline.push({
      label: "Service Impact Began",
      time: incident.started,
      color: "bg-red-500",
      icon: "⚠️",
    });
  }

  if (incident?.triaged) {
    timeline.push({
      label: "Investigation Started",
      time: incident.triaged,
      color: "bg-blue-500",
      icon: "🔎",
    });
  }

  if (incident?.mitigated_new) {
    timeline.push({
      label: "Service Restored",
      time: incident.mitigated_new,
      color: "bg-green-500",
      icon: "🔧",
    });
  }

  if (incident?.resolved_at) {
    timeline.push({
      label: "Incident Resolved",
      time: incident.resolved_at,
      color: "bg-emerald-600",
      icon: "✅",
    });
  }

  const durationBetween = (start, end) => {
    if (!start || !end) return null;
    const diff = new Date(end) - new Date(start);
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  return (
    <div
      className="min-h-screen bg-fixed bg-cover bg-center"
      style={{ backgroundImage: `url(${appAssets.logo})` }}
    >
      <div className="min-h-screen bg-black/60">
        <div className="max-w-5xl mx-auto p-10">

          <button
            onClick={() => navigate("/dashboard")}
            className="mb-8 bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition"
          >
            ← Back to Dashboard
          </button>

          <div className="bg-white rounded-2xl shadow-2xl p-10">

            <h2 className="text-3xl font-bold text-blue-800 mb-10">
              Incident Lifecycle Timeline
            </h2>

            {loading ? (
              <p className="text-blue-600 animate-pulse">Loading timeline...</p>
            ) : (
              <div className="relative">

                {/* vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600 rounded"></div>

                <div className="space-y-10">

                  {timeline.map((event, index) => {
                    const prev = timeline[index - 1];

                    return (
                      <div key={index} className="relative flex items-start gap-6 group">

                        {/* node */}
                        <div
                          className={`w-12 h-12 flex items-center justify-center text-xl text-white rounded-full shadow-lg ${event.color} group-hover:scale-110 transition`}
                        >
                          {event.icon}
                        </div>

                        {/* card */}
                        <div className="bg-gray-50 rounded-xl p-5 shadow hover:shadow-xl transition w-full">

                          <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800">
                              {event.label}
                            </h3>

                            <span className="text-sm text-gray-500">
                              {event.time}
                            </span>
                          </div>

                          {/* duration chip */}
                          {prev && (
                            <div className="mt-2 text-xs text-indigo-600 font-medium">
                              ⏱ {durationBetween(prev.time, event.time)} since previous event
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncidentTimeline;