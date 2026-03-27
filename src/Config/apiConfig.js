const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://bnoc-backend.dev.cnap.comcast.net"; // 🔥 change later

export default API_BASE_URL;