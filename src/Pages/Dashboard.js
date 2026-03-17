import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import appAssets from "../Config/appAssets";

function Dashboard() {
  const navigate = useNavigate();

  const [incidentNumber, setIncidentNumber] = useState("");
  const [incidentData, setIncidentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const rawName = decoded.email.split("@")[0];

      const formattedName = rawName
        .split("_")
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join(" ");

      setFirstName(formattedName);
      const savedIncident = localStorage.getItem("lastIncident");

      if (savedIncident) {
        const incident = JSON.parse(savedIncident);
        setIncidentData(incident);
        setVisible(true);
      }
    } catch {
      localStorage.removeItem("token");
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("lastIncident");
    navigate("/");
  };

  const handleFetch = async () => {
    if (!incidentNumber.trim()) return;

    setLoading(true);
    setIncidentData(null);
    setError("");
    setVisible(false);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/incident/${incidentNumber}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Incident not found");
        setLoading(false);
        return;
      }

      setIncidentData(data.incident);
      localStorage.setItem("lastIncident", JSON.stringify(data.incident));
      setTimeout(() => setVisible(true), 100);
      setLoading(false);
    } catch {
      setError("Server error");
      setLoading(false);
    }
  };

  const safe = (value) => {
    if (!value) return "No data available";
    if (typeof value === "string" || typeof value === "number") return value;
    if (typeof value === "object") {
      if (value.display_value) return value.display_value;
      if (value.value) return value.value;
      if (value.name) return value.name;
    }
    return "No data available";
  };

  const calculateDuration = (start, end) => {
    if (!start) return "No data";
    if (!end) return "Ongoing";
    const diff = new Date(end) - new Date(start);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getStatus = (incident) => {
    if (incident.resolved_at) return "Resolved";
    if (incident.state === "-9") return "Open";
    return "Monitoring";
  };

  const getRootCause = (incident) => {
    const cause = safe(incident.cause_code);
    const closeCode = safe(incident.close_code);
    if (cause !== "No data available") return cause;
    if (closeCode !== "No data available") return closeCode;
    return "No root cause documented";
  };

  const getResolution = (incident) => {
    if (incident.close_notes) return incident.close_notes;
    if (incident.resolved_at) return "Resolved (No resolution notes provided)";
    return "Pending";
  };

  const handleSendMail = () => {
    if (!incidentData) return;

    const subject = `[SEV${safe(
      incidentData.severity,
    )}] ${safe(incidentData.primary_market)} - BNOC Outage - ${incidentData.number
      }`;

    const body = `
BNOC OUTAGE NOTIFICATION

OUTAGE SUMMARY
${safe(incidentData.short_description)}

START TIME:
${safe(incidentData.started)}

END TIME:
${incidentData.resolved_at || "Ongoing"}

DURATION:
${calculateDuration(incidentData.started, incidentData.resolved_at)}

IMPACT DETAILS
Impact: ${safe(incidentData.service_affect)}
Severity: ${safe(incidentData.severity)}
Priority: ${safe(incidentData.priority)}
Scope: ${safe(incidentData.scope)}
Market: ${safe(incidentData.primary_market)}

DEVICE / NETWORK DETAILS
Device: ${safe(incidentData.affected_ci?.[0]?.ci_item)}
Vendor: ${safe(incidentData.affected_ci?.[0]?.vendor)}
IP: ${safe(incidentData.affected_ci?.[0]?.ip_adress)}
FQDN: ${safe(incidentData.affected_ci?.[0]?.fqdn)}
Device Type: ${safe(incidentData.affected_ci?.[0]?.device_type)}
Location: ${safe(incidentData.affected_ci?.[0]?.location)}

ROOT CAUSE
${getRootCause(incidentData)}

RESOLUTION
${getResolution(incidentData)}

Engineer:
${safe(incidentData.opened_by)}

Incident #:
${safe(incidentData.number)}
`;

    window.location.href = `mailto:gest_bnoc@comcast.com?cc=Srihari_C@comcast.com&subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div
      className="min-h-screen bg-fixed bg-cover bg-center"
      style={{ backgroundImage: `url(${appAssets.logo})` }}
    >
      <div className="min-h-screen bg-black/60">
        <div className="max-w-7xl mx-auto p-10">
          {/* HEADER (Added Back) */}
          <div className="flex justify-between items-center mb-8 text-white">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {firstName}</h1>
              <p className="text-sm opacity-80">BNOC Automation Dashboard</p>
            </div>

            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-800 px-4 py-2 rounded-md transition shadow-md"
            >
              Logout
            </button>
          </div>

          {/* FETCH */}
          <div className="bg-white shadow-2xl rounded-2xl p-8 mb-8 transition hover:-translate-y-1 hover:shadow-3xl">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Fetch Incident
            </h2>

            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter Incident Number"
                value={incidentNumber}
                onChange={(e) => setIncidentNumber(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-600 outline-none transition"
              />
              <button
                onClick={handleFetch}
                className="bg-blue-700 hover:bg-blue-900 text-white px-6 py-2 rounded-md transition active:scale-95"
              >
                {loading ? "Fetching..." : "Fetch"}
              </button>
            </div>

            {loading && (
              <p className="mt-4 text-blue-600 animate-pulse">Fetching...</p>
            )}
            {error && <p className="mt-4 text-red-600">{error}</p>}
          </div>

          {/* Everything below remains exactly as your original code */}

          {incidentData && (
            <div
              className={`bg-white shadow-2xl rounded-2xl p-10 space-y-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              <div className="border-b pb-6">
                <h2 className="text-3xl font-bold text-blue-800 mb-2">
                  Outage Summary
                </h2>
                <p className="text-lg text-gray-700">
                  {safe(incidentData.short_description)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <MetricCard
                  icon="🕒"
                  label="Start Time"
                  value={safe(incidentData.started)}
                  border="border-blue-500"
                />

                <MetricCard
                  icon="🏁"
                  label="End Time"
                  value={incidentData.resolved_at || "Ongoing"}
                  border="border-purple-500"
                />

                <MetricCard
                  icon="⏱"
                  label="Duration"
                  value={calculateDuration(
                    incidentData.started,
                    incidentData.resolved_at,
                  )}
                  border="border-yellow-500"
                />

                <MetricCard
                  icon="📡"
                  label="Status"
                  value={getStatus(incidentData)}
                  border={
                    getStatus(incidentData) === "Resolved"
                      ? "border-green-500"
                      : "border-red-500"
                  }
                />

                <MetricCard
                  icon="👨‍💻"
                  label="Engineer"
                  value={safe(incidentData.assigned_to).split("(")[0]}
                  border="border-indigo-500"
                />
              </div>

              <Collapsible title="Impact Details" color="red">
                <p>
                  <b>Impact:</b> {safe(incidentData.service_affect)}
                </p>
                <p>
                  <b>Severity:</b> {safe(incidentData.severity)}
                </p>
                <p>
                  <b>Priority:</b> {safe(incidentData.priority)}
                </p>
                <p>
                  <b>Scope:</b> {safe(incidentData.scope)}
                </p>
                <p>
                  <b>Market:</b> {safe(incidentData.primary_market)}
                </p>
              </Collapsible>

              <Collapsible title="Affected Services / Customers" color="orange">
                {incidentData.impacted_services?.length > 0 ? (
                  incidentData.impacted_services.map((s, i) => (
                    <div
                      key={i}
                      className="mb-2 p-2 bg-orange-50 rounded transition hover:scale-[1.02]"
                    >
                      {safe(s.service_name)}
                    </div>
                  ))
                ) : (
                  <p>No impacted services</p>
                )}
              </Collapsible>



              <Collapsible title="Root Cause" color="yellow">
                {getRootCause(incidentData)}
              </Collapsible>

              <Collapsible title="Resolution" color="green">
                {getResolution(incidentData)}
              </Collapsible>

              <Collapsible title="Device / Network Details" color="indigo">
                <p>
                  <b>Device:</b> {safe(incidentData.affected_ci?.[0]?.ci_item)}
                </p>
                <p>
                  <b>Vendor:</b> {safe(incidentData.affected_ci?.[0]?.vendor)}
                </p>
                <p>
                  <b>IP:</b> {safe(incidentData.affected_ci?.[0]?.ip_adress)}
                </p>
                <p>
                  <b>FQDN:</b> {safe(incidentData.affected_ci?.[0]?.fqdn)}
                </p>
                <p>
                  <b>Device Type:</b>{" "}
                  {safe(incidentData.affected_ci?.[0]?.device_type)}
                </p>
                <p>
                  <b>Location:</b>{" "}
                  {safe(incidentData.affected_ci?.[0]?.location)}
                </p>
              </Collapsible>

              <div className="pt-6 flex gap-4">
                <button
                  onClick={handleSendMail}
                  className="bg-green-700 hover:bg-green-900 text-white px-6 py-2 rounded-md transition active:scale-95 hover:shadow-lg"
                >
                  SEND OUTAGE MAIL
                </button>

                <button
                  onClick={() =>
                    navigate(
                      `/device-analysis/${incidentData.affected_ci?.[0]?.sys_id}`,
                    )
                  }
                  className="bg-indigo-700 hover:bg-indigo-900 text-white px-6 py-2 rounded-md transition active:scale-95 hover:shadow-lg"
                >
                  ANALYZE DEVICE HISTORY
                </button>
                <button
                  onClick={() =>
                    navigate(`/incident-timeline/${incidentData.number}`)
                  }
                  className="bg-purple-700 hover:bg-purple-900 text-white px-6 py-2 rounded-md transition active:scale-95 hover:shadow-lg"
                >
                  VIEW INCIDENT TIMELINE
                </button>
                <button
                  onClick={() =>
                    navigate(`/ai-assistant/${incidentData.number}`, {
                      state: { incidentData },
                    })
                  }
                  className="bg-pink-500 hover:bg-pink-900 text-white px-6 py-2 rounded-md transition"
                >
                  AI ASSITANT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Collapsible({ title, children, color }) {
  const [open, setOpen] = useState(false);

  const colors = {
    red: "border-red-500 bg-red-50",
    orange: "border-orange-500 bg-orange-50",
    purple: "border-purple-500 bg-purple-50",
    yellow: "border-yellow-500 bg-yellow-50",
    green: "border-green-500 bg-green-50",
    indigo: "border-indigo-500 bg-indigo-50",
  };

  return (
    <div
      className={`border-l-4 p-4 rounded-lg shadow transition-all duration-300 hover:shadow-lg ${colors[color]}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left font-semibold text-lg flex justify-between items-center"
      >
        {title}
        <span
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          +
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ${open ? "max-h-[1000px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}
      >
        {children}
      </div>
    </div>
  );
}
function MetricCard({ icon, label, value, border }) {
  return (
    <div
      className={`bg-white border-l-4 ${border} rounded-xl shadow p-5 flex items-center gap-4 hover:shadow-xl transition`}
    >
      <div className="text-3xl">{icon}</div>

      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
export default Dashboard;
