import React from "react";

const formatDuration = (start, end) => {
  if (!start) return "N/A";
  const startTime = new Date(start);
  const endTime = end ? new Date(end) : new Date();
  const diff = endTime - startTime;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
};

const BNOCReport = ({ incident }) => {
  if (!incident) return null;

  const startTime = incident.started || incident.opened_at;
  const endTime = incident.resolved_at || null;
  const duration = formatDuration(startTime, endTime);

  const affectedServices =
    incident.impacted_services?.map(s => s.service_name).join(", ") || "N/A";

  const device = incident.cmdb_ci?.display_value || "N/A";
  const ip = incident.affected_ci?.[0]?.ip_adress || "N/A";
  const market = incident.primary_market?.name || "N/A";

  const status = incident.resolved_at ? "Resolved" : "Ongoing";

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-5xl mx-auto space-y-8">

      <h2 className="text-3xl font-semibold text-gray-800 text-center">
        BNOC Outage Documentation
      </h2>

      {/* Summary */}
      <Section title="Outage Summary">
        {incident.short_description}
      </Section>

      {/* Timeline */}
      <Section title="Timeline">
        <Info label="Start Time" value={startTime} />
        <Info label="End Time" value={endTime || "Ongoing"} />
        <Info label="Duration" value={duration} />
      </Section>

      {/* Affected */}
      <Section title="Affected Services / Customers">
        <Info label="Service" value={affectedServices} />
        <Info label="Region" value={market} />
        <Info label="Device" value={device} />
        <Info label="IP" value={ip} />
      </Section>

      {/* Impact */}
      <Section title="Impact">
        Service Condition: {incident.service_condition} | 
        Severity: {incident.severity} | 
        Scope: {incident.scope}
      </Section>

      {/* Root Cause */}
      <Section title="Root Cause">
        {incident.close_notes || "Under Investigation"}
      </Section>

      {/* Resolution */}
      <Section title="Resolution">
        {incident.solution_code || incident.close_notes || "Pending"}
      </Section>

      {/* Status */}
      <Section title="Status">
        <span className={`px-4 py-1 rounded-full text-sm font-medium 
          ${status === "Resolved" 
            ? "bg-green-100 text-green-700" 
            : "bg-yellow-100 text-yellow-700"}`}>
          {status}
        </span>
      </Section>

      {/* Footer */}
      <div className="pt-6 border-t text-sm text-gray-500 flex justify-between">
        <span>IOP Engineer: {incident.opened_by?.display_value}</span>
        <span>Incident #: {incident.number}</span>
      </div>

    </div>
  );
};

const Section = ({ title, children }) => (
  <div>
    <h3 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-3">
      {title}
    </h3>
    <div className="space-y-2 text-gray-600">
      {children}
    </div>
  </div>
);

const Info = ({ label, value }) => (
  <div>
    <span className="font-medium text-gray-800">{label}: </span>
    <span>{value}</span>
  </div>
);

export default BNOCReport;