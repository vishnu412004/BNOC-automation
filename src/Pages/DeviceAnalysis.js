import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import appAssets from "../Config/appAssets";

function DeviceAnalysis() {
  const { deviceSysId } = useParams();
  const navigate = useNavigate();

  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDeviceHistory = async (selectedDays) => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/device-history/${deviceSysId}/${selectedDays}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceHistory(days);
  }, [deviceSysId, days]);

  const device = data?.incidents?.[0];

  return (
    <div
      className="min-h-screen bg-fixed bg-cover bg-center"
      style={{ backgroundImage: `url(${appAssets.logo})` }}
    >
      <div className="min-h-screen bg-black/60">
        <div className="max-w-7xl mx-auto p-10">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition"
          >
            ← Back to Dashboard
          </button>

          <div className="bg-white shadow-2xl rounded-2xl p-10 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-blue-800">
                Device Intelligence
              </h2>

              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="border px-4 py-2 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
                <option value={180}>Last 180 Days</option>
                <option value={365}>Last 365 Days</option>
                <option value="all">All History</option>
              </select>
            </div>

            {loading ? (
              <p className="text-blue-600 animate-pulse">
                Loading Device Intelligence...
              </p>
            ) : (
              data && (
                <>
                  {/* DEVICE INFO BANNER */}
                  {device && (
                    <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-6 rounded-2xl shadow-lg">
                      <h3 className="text-xl font-semibold mb-4">
                        {device.cmdb_ci?.display_value || "Device"}
                      </h3>

                      <div className="grid grid-cols-4 gap-6 text-sm">
                        <div>
                          <p className="opacity-70">Customer</p>
                          <p className="font-semibold">
                            {device.affected_ci?.[0]?.customer_name || "N/A"}
                          </p>
                        </div>

                        <div>
                          <p className="opacity-70">Market</p>
                          <p className="font-semibold">
                            {device.primary_market?.name || "N/A"}
                          </p>
                        </div>

                        <div>
                          <p className="opacity-70">Device Type</p>
                          <p className="font-semibold">
                            {device.affected_ci?.[0]?.device_type || "N/A"}
                          </p>
                        </div>

                        <div>
                          <p className="opacity-70">FQDN</p>
                          <p className="font-semibold truncate">
                            {device.affected_ci?.[0]?.fqdn || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metrics Section */}
                  <div className="grid grid-cols-4 gap-6">
                    <MetricCard
                      label="Total Incidents"
                      value={data.total}
                      border="border-blue-500"
                    />

                    <MetricCard
                      label="Open"
                      value={data.open}
                      border="border-red-500"
                    />

                    <MetricCard
                      label="Resolved"
                      value={data.resolved}
                      border="border-green-500"
                    />

                    <MetricCard
                      label="Average MTTR"
                      value={data.avgMTTR}
                      border="border-purple-500"
                    />

                    <MetricCard
                      label="Most Common Issue"
                      value={data.mostCommonIssue}
                      border="border-indigo-500"
                    />

                    <MetricCard
                      label="First Occurrence"
                      value={data.firstOccurrence}
                      border="border-gray-400"
                    />

                    <MetricCard
                      label="Last Occurrence"
                      value={data.lastOccurrence}
                      border="border-gray-400"
                    />
                  </div>

                  {/* Incident List */}
                  <div className="mt-10">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                      Incident History
                    </h3>

                    <div className="space-y-4">
                      {data.incidents.map((inc) => (
                        <div
                          key={inc.sys_id}
                          className="border rounded-xl p-5 shadow hover:shadow-lg transition bg-gray-50"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-bold text-blue-700">
                              {inc.number}
                            </p>

                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                inc.resolved_at
                                  ? "bg-green-200 text-green-800"
                                  : "bg-red-200 text-red-800"
                              }`}
                            >
                              {inc.resolved_at ? "Resolved" : "Open"}
                            </span>
                          </div>

                          <p className="text-gray-700 mb-2">
                            {inc.short_description}
                          </p>

                          <p className="text-sm text-gray-500">
                            Opened: {inc.opened_at}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Reusable Metric Card */

function MetricCard({ label, value, border }) {
  return (
    <div
      className={`bg-white border-l-4 ${border} rounded-xl shadow p-6 hover:shadow-xl transition`}
    >
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800">
        {value !== undefined && value !== null ? value : "N/A"}
      </p>
    </div>
  );
}

export default DeviceAnalysis;
