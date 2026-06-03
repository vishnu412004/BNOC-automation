require("dotenv").config();
const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;
const requiredEnvVars = [
  "ALLOWED_USERS",
  "TEAM_PASSWORD",
  "JWT_SECRET",
  "SAT_URL",
  "SAT_SCOPE",
  "SAT_CLIENT_ID",
  "SAT_CLIENT_SECRET",
  "INCIDENT_API_URL",
];

app.use(cors());
app.use(express.json());

app.get("/myAppHealth", (req, res) => {
  res.send("OK");
});

app.get("/", (req, res) => {
  res.send("BNOC Automation Backend Running");
});

/* ============================================================
   OPTIONAL ENV CHECK
============================================================ */
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length) {
  console.warn(
    `Warning: Missing environment variables: ${missingEnvVars.join(", ")}`,
  );
}

/* ============================================================
   AUTHENTICATION - LOGIN
============================================================ */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  if (
    !process.env.ALLOWED_USERS ||
    !process.env.TEAM_PASSWORD ||
    !process.env.JWT_SECRET
  ) {
    return res.status(500).json({
      message: "Authentication is not configured",
    });
  }

  const allowedUsers = process.env.ALLOWED_USERS.split(",").map((e) =>
    e.trim().toLowerCase(),
  );

  if (!allowedUsers.includes(email.toLowerCase())) {
    return res.status(403).json({
      message: "You are not authorized to access this tool.",
    });
  }

  if (password !== process.env.TEAM_PASSWORD) {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  res.json({ token });
});

/* ============================================================
   JWT MIDDLEWARE
============================================================ */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

/* ============================================================
   SAT TOKEN CACHE
============================================================ */
let cachedSatToken = null;
let satTokenExpiry = null;

async function getAccessToken() {
  if (cachedSatToken && satTokenExpiry > Date.now()) {
    return cachedSatToken;
  }

  try {
    const response = await axios.post(
      process.env.SAT_URL,
      `grant_type=client_credentials&scope=${process.env.SAT_SCOPE}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Client-Id": process.env.SAT_CLIENT_ID,
          "X-Client-Secret": process.env.SAT_CLIENT_SECRET,
        },
        timeout: 10000,
      }
    );

    cachedSatToken = response.data.access_token;
    satTokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

    console.log("✅ SAT token refreshed");

    return cachedSatToken;
  } catch (error) {
    console.error("❌ SAT FULL ERROR:", error.response?.data);
    throw error;
  }
}

/* ============================================================
   FETCH INCIDENT
============================================================ */
app.get("/api/incident/:number", authenticateToken, async (req, res) => {
  try {
    const incidentNumber = req.params.number;
    const token = await getAccessToken();

    const apiResponse = await axios.get(process.env.INCIDENT_API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      params: {
        sysparm_query: `number=${incidentNumber}`,
        sysparm_limit: 1,
      },
      timeout: 10000,
    });

    const incidents = apiResponse.data?.data?.incident_ticket || [];

    if (!incidents.length) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.json({
      success: true,
      incident: incidents[0],
    });
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        error: "ServiceNow request timed out",
      });
    }

    console.error("❌ Incident Fetch Error:", error.message);

    res.status(500).json({
      error: "Failed to fetch incident",
      details: error.message,
    });
  }
});

/* ============================================================
   DEVICE HISTORY (30 / 90 / 180 / 365 / ALL)
============================================================ */
app.get(
  "/api/device-history/:deviceSysId/:days",
  authenticateToken,
  async (req, res) => {
    try {
      const deviceSysId = req.params.deviceSysId;
      const daysParam = req.params.days;

      const token = await getAccessToken();

      let queryFilter;

      if (daysParam === "all") {
        queryFilter = `cmdb_ci=${deviceSysId}^ORDERBYDESCopened_at`;
      } else {
        const days = parseInt(daysParam) || 30;
        queryFilter = `cmdb_ci=${deviceSysId}^opened_at>=javascript:gs.daysAgoStart(${days})^ORDERBYDESCopened_at`;
      }

      const apiResponse = await axios.get(process.env.INCIDENT_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        params: {
          sysparm_query: queryFilter,
          sysparm_limit: 500, // increased limit
        },
        timeout: 10000,
      });

      const incidents = apiResponse.data?.data?.incident_ticket || [];

      /* ===== RESOLUTION COUNT ===== */
      const resolvedCount = incidents.filter((i) =>
        Boolean(i.resolved_at),
      ).length;
      const openCount = incidents.length - resolvedCount;

      /* ===== MTTR ===== */
      const durations = incidents
        .filter((i) => i.resolved_at)
        .map((i) => {
          const start = new Date(i.started || i.opened_at);
          const end = new Date(i.resolved_at);
          return (end - start) / 60000;
        });

      const avgMinutes = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      const hours = Math.floor(avgMinutes / 60);
      const minutes = avgMinutes % 60;
      const avgMTTR = `${hours}h ${minutes}m`;

      /* ===== ISSUE DETECTION ===== */
      const issueMap = {};

      incidents.forEach((i) => {
        const desc = (i.short_description || "").toLowerCase();
        let key = null;

        if (desc.includes("crc")) key = "CRC Errors";
        else if (desc.includes("frame")) key = "Frame Loss";
        else if (desc.includes("simplex")) key = "Simplex / One Way Traffic";
        else if (desc.includes("link down")) key = "Link Down";
        else if (desc.includes("bgp")) key = "BGP Issue";
        else if (desc.includes("latency")) key = "Latency";
        else if (desc.includes("packet")) key = "Packet Loss";
        else if (desc.includes("uni")) key = "UNI Issue";
        else if (desc.includes("power")) key = "Power Failure";

        if (!key) key = "Unclassified";

        issueMap[key] = (issueMap[key] || 0) + 1;
      });

      const mostCommonIssue =
        Object.entries(issueMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      const firstOccurrence = incidents.length
        ? incidents[incidents.length - 1].opened_at
        : null;

      const lastOccurrence = incidents.length ? incidents[0].opened_at : null;

      res.json({
        success: true,
        total: incidents.length,
        open: openCount,
        resolved: resolvedCount,
        avgMinutes,
        avgMTTR,
        mostCommonIssue,
        firstOccurrence,
        lastOccurrence,
        incidents,
      });
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        return res.status(504).json({
          error: "Device history request timed out",
        });
      }

      console.error("❌ Device History Error:", error.message);

      res.status(500).json({
        error: "Failed to fetch device history",
        details: error.message,
      });
    }
  },
);

/* ============================================================
   STATIC FILES & SPA ROUTING
============================================================ */
const path = require("path");

// Serve static files from React build
app.use(express.static(path.join(__dirname, "../build")));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// ✅ Catch-all (VERY IMPORTANT - LAST)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../build/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
