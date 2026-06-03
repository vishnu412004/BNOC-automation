import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import appAssets from "../Config/appAssets";
import API_BASE_URL from "../Config/apiConfig";

function Dashboard() {
  const navigate = useNavigate();

  const [incidentNumber, setIncidentNumber] = useState("");
  const [incidentData, setIncidentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [visible, setVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [openSection, setOpenSection] = useState("");

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
      const savedRecent = localStorage.getItem("recentIncidents");

      if (savedRecent) {
        setRecentIncidents(JSON.parse(savedRecent));
      }

      if (savedIncident) {
        setIncidentData(JSON.parse(savedIncident));
        setVisible(true);
      }
    } catch {
      localStorage.removeItem("token");
      navigate("/");
    }
  }, [navigate]);

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

  const isPresent = (value) => safe(value) !== "No data available";

  const addReportField = (lines, label, value) => {
    if (isPresent(value)) {
      lines.push(`${label}: ${safe(value)}`);
    }
  };

  const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatMinutes = (totalMinutes) => {
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    return days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
  };

  const getEngineerWorkTime = (incident) => {
    const start =
      parseDate(incident.assigned_date) ||
      parseDate(incident.triaged) ||
      parseDate(incident.started);
    const end =
      parseDate(incident.resolved_at) ||
      parseDate(incident.closed_at) ||
      new Date();

    if (!start || !end) return "No work time data";

    const diff = end - start;
    if (Number.isNaN(diff) || diff < 0) return "No work time data";

    return formatMinutes(Math.floor(diff / 60000));
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

  const cleanDescription = (description) => {
    if (!description) return "No data available";

    // Labels to hide (user-facing fields we don't want)
    const hiddenLabels = [
      "reported issue",
      "customer trouble ticket",
      "fqdn",
      "ip",
      "ipv6",
      "access hours",
      "lcon/access codes",
    ];

    // Technical sections to remove entirely
    const technicalSections = [
      "alarm correlation",
      "summary",
      "additional information",
    ];

    // Technical key=value fields to remove
    const technicalFields = [
      "bpomaccountid",
      "bpomcustomername",
      "bpomsiteaddress",
      "bpomsysid",
      "cooldownsoaktime",
      "division",
      "eventstarttime",
      "groupby",
      "routertype",
      "updatetime",
      "entitytype",
      "indicator",
      "alarm state",
      "service offering",
      "reporting organization",
      "pe:",
      "role:",
      "impairable",
      "ci:",
    ];

    const lines = description.split("\n").map((line) => line.trim());
    let inTechnicalSection = false;
    
    const cleaned = lines
      .filter((line) => {
        const normalized = line.toLowerCase();

        // Skip empty lines that aren't meaningful
        if (!line) return false;

        // Check if entering a technical section
        if (technicalSections.some((section) => normalized.startsWith(section))) {
          inTechnicalSection = true;
          return false;
        }

        // Skip lines that are part of technical sections (indented or field definitions)
        if (
          inTechnicalSection &&
          (line.startsWith(" ") || line.startsWith("\t") || line.includes("="))
        ) {
          return false;
        }

        // Exit technical section mode when we hit a new section or empty line
        if (inTechnicalSection && (line === "" || /^[A-Z\s]+:?$/.test(line))) {
          inTechnicalSection = false;
        }

        // Skip individual technical fields
        if (
          technicalFields.some((field) => normalized.startsWith(field))
        ) {
          return false;
        }

        // Skip hidden user-facing labels
        if (
          hiddenLabels.some((label) => normalized.startsWith(`${label}:`))
        ) {
          return false;
        }

        return true;
      })
      .join("\n")
      .trim();

    return cleaned || "No data available";
  };

  const updateRecentIncidents = (number) => {
    const nextRecent = [
      number,
      ...recentIncidents.filter((item) => item !== number),
    ].slice(0, 5);

    setRecentIncidents(nextRecent);
    localStorage.setItem("recentIncidents", JSON.stringify(nextRecent));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("lastIncident");
    navigate("/");
  };

  const handleClear = () => {
    setIncidentData(null);
    setIncidentNumber("");
    setError("");
    setVisible(false);
    setOpenSection("");
    localStorage.removeItem("lastIncident");
  };

  const handleFetch = async (e, overrideNumber) => {
    e?.preventDefault();

    const normalizedIncident = (overrideNumber || incidentNumber)
      .trim()
      .toUpperCase();

    if (!normalizedIncident) return;

    setIncidentNumber(normalizedIncident);
    setLoading(true);
    setIncidentData(null);
    setError("");
    setVisible(false);
    setOpenSection("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/incident/${normalizedIncident}`,
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
      updateRecentIncidents(data.incident?.number || normalizedIncident);
      setTimeout(() => setVisible(true), 120);
      setLoading(false);
    } catch {
      setError("Server error");
      setLoading(false);
    }
  };

  const buildReportBody = () => {
    if (!incidentData) return "";

    const sections = [];

    const summary = ["BNOC OUTAGE NOTIFICATION"];
    addReportField(summary, "Incident", incidentData.number);
    addReportField(summary, "Summary", incidentData.short_description);
    sections.push(summary.join("\n"));

    const timing = [];
    addReportField(timing, "Start Time", incidentData.started);
    addReportField(timing, "End Time", incidentData.resolved_at);
    addReportField(timing, "Duration", getEngineerWorkTime(incidentData));
    if (timing.length) sections.push(`TIMING\n${timing.join("\n")}`);

    const impact = [];
    addReportField(impact, "Impact", incidentData.service_affect);
    addReportField(impact, "Severity", incidentData.severity);
    addReportField(impact, "Priority", incidentData.priority);
    addReportField(impact, "Scope", incidentData.scope);
    addReportField(impact, "Market", incidentData.primary_market);
    addReportField(impact, "Business Service", incidentData.business_service);
    addReportField(impact, "Symptom", incidentData.symptom);
    addReportField(impact, "Category", incidentData.category);
    addReportField(impact, "Subcategory", incidentData.subcategory);
    addReportField(impact, "Contact Type", incidentData.contact_type);
    if (impact.length) sections.push(`IMPACT DETAILS\n${impact.join("\n")}`);

    const device = [];
    addReportField(device, "Device", incidentData.affected_ci?.[0]?.ci_item);
    addReportField(device, "Vendor", incidentData.affected_ci?.[0]?.vendor);
    addReportField(device, "IP", incidentData.affected_ci?.[0]?.ip_adress);
    addReportField(device, "FQDN", incidentData.affected_ci?.[0]?.fqdn);
    addReportField(device, "UNI", incidentData.affected_ci?.[0]?.uni);
    addReportField(device, "Device Type", incidentData.affected_ci?.[0]?.device_type);
    addReportField(device, "Location", incidentData.affected_ci?.[0]?.location);
    addReportField(device, "Customer", incidentData.affected_ci?.[0]?.customer_name);
    addReportField(device, "Site", incidentData.affected_ci?.[0]?.site_name);
    addReportField(device, "Outage Number", incidentData.outages?.[0]?.number);
    addReportField(device, "Outage Type", incidentData.outages?.[0]?.type);
    addReportField(device, "Outage Begin", incidentData.outages?.[0]?.begin);
    addReportField(device, "Outage End", incidentData.outages?.[0]?.end);
    addReportField(device, "Bridge URL", incidentData.incident_alert?.URL);
    if (device.length) sections.push(`DEVICE / NETWORK DETAILS\n${device.join("\n")}`);

    const resolution = [];
    addReportField(resolution, "Root Cause", getRootCause(incidentData));
    addReportField(resolution, "Resolution", getResolution(incidentData));
    addReportField(resolution, "Engineer", incidentData.assigned_to);
    if (resolution.length) sections.push(`RESOLUTION\n${resolution.join("\n")}`);

    return sections.join("\n\n");
  };

  const handleCopyReport = async () => {
    const reportBody = buildReportBody();
    if (!reportBody) return;

    try {
      await navigator.clipboard.writeText(reportBody);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setError("Unable to copy report");
    }
  };

  const handleSendMail = () => {
    if (!incidentData) return;

    const subject = `[SEV${safe(
      incidentData.severity,
    )}] ${safe(incidentData.primary_market)} - BNOC Outage - ${
      incidentData.number
    }`;

    window.location.href = `mailto:gest_bnoc@comcast.com?cc=Srihari_C@comcast.com&subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(buildReportBody())}`;
  };

  const status = incidentData ? getStatus(incidentData) : "";
  const deviceSysId = incidentData?.affected_ci?.[0]?.sys_id;

  return (
    <div
      className="min-h-screen bg-fixed bg-cover bg-center"
      style={{ backgroundImage: `url(${appAssets.logo})` }}
    >
      <div className="min-h-screen bg-gradient-to-br from-black/75 via-slate-900/70 to-blue-950/75">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="animate-fadeIn">
              <p className="text-xs uppercase tracking-[0.24em] text-blue-200">
                BNOC Automation
              </p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                Welcome, {firstName}
              </h1>
              <p className="mt-1 text-sm text-white/75">
                Fetch an incident, review impact, and prepare outage updates.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
              >
                Clear
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </header>

          <section className="mb-6 rounded-xl bg-white/95 p-6 shadow-2xl backdrop-blur animate-fadeIn">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Fetch Incident
            </h2>

            <form onSubmit={handleFetch} className="flex flex-col gap-4 sm:flex-row">
              <input
                type="text"
                placeholder="Enter Incident Number"
                value={incidentNumber}
                onChange={(e) => setIncidentNumber(e.target.value.toUpperCase())}
                className="h-12 flex-1 rounded-lg border border-slate-300 px-4 text-base text-slate-900 outline-none transition duration-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-8 text-base font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loading && (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {loading ? "Fetching..." : "Fetch"}
              </button>
            </form>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {recentIncidents.map((item) => (
                  <button
                    key={item}
                    onClick={(e) => handleFetch(e, item)}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-100"
                  >
                    {item}
                  </button>
                ))}
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 animate-fadeIn">
                  {error}
                </p>
              )}
            </div>
          </section>

          {loading && !incidentData && <LoadingCard />}

          {incidentData && (
            <main
              className={`space-y-6 transition-all duration-700 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <section className="rounded-xl bg-white p-6 shadow-2xl">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <StatusBadge status={status} />
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        SEV {safe(incidentData.severity)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        PRI {safe(incidentData.priority)}
                      </span>
                    </div>

                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                      {safe(incidentData.number)}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      {safe(incidentData.short_description)}
                    </h2>
                    {cleanDescription(incidentData.description) && cleanDescription(incidentData.description) !== "No data available" && (
                      <p className="mt-3 max-w-5xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {cleanDescription(incidentData.description)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <MetricCard
                    icon="🕒"
                    label="Start Time"
                    value={safe(incidentData.started)}
                    tone="blue"
                  />
                  <MetricCard
                    icon="🏁"
                    label="End Time"
                    value={incidentData.resolved_at || "Ongoing"}
                    tone="purple"
                  />
                  <MetricCard
                    icon="⏱"
                    label="Duration"
                    value={getEngineerWorkTime(incidentData)}
                    tone="amber"
                  />
                  <MetricCard
                    icon="📡"
                    label="Status"
                    value={status}
                    tone={status === "Resolved" ? "green" : "red"}
                  />
                  <MetricCard
                    icon="👨‍💻"
                    label="Engineer"
                    value={safe(incidentData.assigned_to).split("(")[0]}
                    tone="indigo"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <SimplePanel
                  title="Impact Details"
                  color="blue"
                  open={openSection === "impact"}
                  onToggle={() =>
                    setOpenSection(openSection === "impact" ? "" : "impact")
                  }
                >
                  <Detail label="Impact" value={safe(incidentData.service_affect)} />
                  <Detail label="Scope" value={safe(incidentData.scope)} />
                  <Detail label="Business Service" value={safe(incidentData.business_service)} />
                  <Detail label="Symptom" value={safe(incidentData.symptom)} />
                  <Detail label="Category" value={safe(incidentData.category)} />
                  <Detail label="Subcategory" value={safe(incidentData.subcategory)} />
                  <Detail label="Contact Type" value={safe(incidentData.contact_type)} />
                  <Detail label="Service Condition" value={safe(incidentData.service_condition)} />
                  <Detail label="Root Cause" value={getRootCause(incidentData)} />
                </SimplePanel>

                <SimplePanel
                  title="Device Details"
                  color="indigo"
                  open={openSection === "device"}
                  onToggle={() =>
                    setOpenSection(openSection === "device" ? "" : "device")
                  }
                >
                  <Detail label="Device" value={safe(incidentData.affected_ci?.[0]?.ci_item)} />
                  <Detail label="FQDN" value={safe(incidentData.affected_ci?.[0]?.fqdn)} />
                  <Detail label="IP" value={safe(incidentData.affected_ci?.[0]?.ip_adress)} />
                  <Detail label="UNI" value={safe(incidentData.affected_ci?.[0]?.uni)} />
                  <Detail label="Device Type" value={safe(incidentData.affected_ci?.[0]?.device_type)} />
                  <Detail label="CLLI" value={safe(incidentData.affected_ci?.[0]?.u_clli_code)} />
                  <Detail label="GL Code" value={safe(incidentData.affected_ci?.[0]?.u_gl_code)} />
                  <Detail label="Customer" value={safe(incidentData.affected_ci?.[0]?.customer_name)} />
                  <Detail label="Site" value={safe(incidentData.affected_ci?.[0]?.site_name)} />
                  <Detail label="Market" value={safe(incidentData.affected_ci?.[0]?.comcast_market)} />
                </SimplePanel>

                <SimplePanel
                  title="Services & Bridge"
                  color="emerald"
                  open={openSection === "services"}
                  onToggle={() =>
                    setOpenSection(openSection === "services" ? "" : "services")
                  }
                >
                  <Detail
                    label="Service"
                    value={
                      incidentData.impacted_services?.length
                        ? incidentData.impacted_services
                            .map((service) => safe(service.service_name))
                            .join(", ")
                        : "No data available"
                    }
                  />
                  <Detail label="Outage Number" value={safe(incidentData.outages?.[0]?.number)} />
                  <Detail label="Outage Type" value={safe(incidentData.outages?.[0]?.type)} />
                  <Detail label="Outage Begin" value={safe(incidentData.outages?.[0]?.begin)} />
                  <Detail label="Outage End" value={safe(incidentData.outages?.[0]?.end)} />
                  <Detail label="Bridge Number" value={safe(incidentData.incident_alert?.number)} />
                  <Detail
                    label="Bridge URL"
                    value={
                      incidentData.incident_alert?.URL ? (
                        <a
                          href={incidentData.incident_alert.URL}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-blue-700 underline"
                        >
                          {incidentData.incident_alert.URL}
                        </a>
                      ) : (
                        "No data available"
                      )
                    }
                  />
                </SimplePanel>

                <SimplePanel
                  title="Assignment Details"
                  color="purple"
                  open={openSection === "assignment"}
                  onToggle={() =>
                    setOpenSection(
                      openSection === "assignment" ? "" : "assignment",
                    )
                  }
                >
                  <Detail label="Assigned To" value={safe(incidentData.assigned_to)} />
                  <Detail label="Assignment Group" value={safe(incidentData.assignment_group)} />
                  <Detail label="Incident Manager Group" value={safe(incidentData.inc_manager_group)} />
                  <Detail label="Caller" value={safe(incidentData.caller_id)} />
                  <Detail label="Opened By" value={safe(incidentData.opened_by)} />
                  <Detail label="Resolved By" value={safe(incidentData.resolved_by)} />
                </SimplePanel>

                <SimplePanel
                  title="Resolution"
                  color="green"
                  open={openSection === "resolution"}
                  onToggle={() =>
                    setOpenSection(
                      openSection === "resolution" ? "" : "resolution",
                    )
                  }
                >
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={() => navigate(`/incident-timeline/${incidentData.number}`)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      View Incident Timeline →
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-base leading-7 text-slate-700">
                    {getResolution(incidentData)}
                  </p>
                  <div className="mt-4 space-y-3">
                    <Detail label="Close Code" value={safe(incidentData.close_code)} />
                    <Detail label="Cause Code" value={safe(incidentData.cause_code)} />
                    <Detail label="Solution Code" value={safe(incidentData.solution_code)} />
                  </div>
                </SimplePanel>
              </section>

              <section className="rounded-xl bg-white p-6 shadow-2xl">
                <h3 className="mb-4 text-xl font-bold text-slate-900">
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-3">
                  <ActionButton onClick={handleCopyReport}>
                    {copySuccess ? "Report Copied" : "Copy Report"}
                  </ActionButton>
                  <ActionButton onClick={handleSendMail} tone="green">
                    Send Outage Mail
                  </ActionButton>
                  <ActionButton
                    disabled={!deviceSysId}
                    onClick={() => navigate(`/device-analysis/${deviceSysId}`)}
                    tone="indigo"
                  >
                    Analyze Device
                  </ActionButton>
                </div>
              </section>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-2xl bg-white/95 p-8 shadow-2xl animate-fadeIn">
      <div className="flex items-center gap-4">
        <span className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-700 animate-spin" />
        <div>
          <p className="font-bold text-slate-900">Fetching incident details</p>
          <p className="text-sm text-slate-500">
            Getting ticket, device, service, and outage information.
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-10/12 animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-7/12 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Resolved: "bg-green-100 text-green-800",
    Open: "bg-red-100 text-red-800",
    Monitoring: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        colors[status] || colors.Monitoring
      }`}
    >
      {status}
    </span>
  );
}

function MetricCard({ icon, label, value, tone }) {
  // Don't render if value is "No data available"
  if (value === "No data available") {
    return null;
  }

  const tones = {
    blue: "border-blue-500 bg-blue-50 text-blue-700",
    purple: "border-purple-500 bg-purple-50 text-purple-700",
    amber: "border-amber-500 bg-amber-50 text-amber-700",
    green: "border-green-500 bg-green-50 text-green-700",
    red: "border-red-500 bg-red-50 text-red-700",
    indigo: "border-indigo-500 bg-indigo-50 text-indigo-700",
  };

  return (
    <div
      className={`group flex min-h-[112px] items-center gap-4 rounded-xl border-l-4 bg-white p-4 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
        tones[tone] || tones.blue
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm transition duration-300 group-hover:scale-110">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 line-clamp-2 break-words text-base font-bold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function SimplePanel({ title, children, color, open, onToggle }) {
  const colors = {
    blue: "border-blue-500",
    indigo: "border-indigo-500",
    emerald: "border-emerald-500",
    green: "border-green-500",
    purple: "border-purple-500",
  };

  return (
    <section
      className={`rounded-xl border-l-4 bg-white p-5 shadow-xl transition duration-500 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] ${
        colors[color]
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-700 transition duration-300 ${
            open ? "rotate-45 bg-blue-100 text-blue-700" : ""
          }`}
        >
          +
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ${
          open ? "mt-4 max-h-[900px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-3 animate-fadeIn">{children}</div>
      </div>
    </section>
  );
}

function Detail({ label, value }) {
  // Don't render if value is "No data available"
  if (value === "No data available") {
    return null;
  }

  return (
    <div className="grid gap-1 rounded-lg bg-slate-50 p-3 sm:grid-cols-[150px_1fr]">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="min-w-0 break-words text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, tone = "slate", disabled }) {
  const tones = {
    slate: "bg-slate-800 hover:bg-slate-950 disabled:bg-slate-300",
    green: "bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300",
    indigo: "bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-300",
    purple: "bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300",
    pink: "bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export default Dashboard;
