import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import appAssets from "../Config/appAssets";
import API_BASE_URL from "../Config/apiConfig";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Clear fields when page loads
  useEffect(() => {
    setEmail("");
    setPassword("");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message);
        return;
      }

      localStorage.setItem("token", data.token);
      navigate("/dashboard");

    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center relative animate-fadeIn animate-slowZoom flex items-center justify-center"
      style={{ backgroundImage: `url(${appAssets.logo})` }}
    >
      <div className="absolute inset-0 bg-black/50"></div>

      <div className="relative z-10 bg-white/95 rounded-2xl shadow-2xl p-10 w-full max-w-md">

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          BNOC Automation Tool
        </h2>

        <p className="text-center text-gray-500 mb-8">
          Team Access Portal
        </p>

        <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">

          <input
            type="email"
            placeholder="Enter your company email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          />

          <input
            type="password"
            placeholder="Enter Team Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          />

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg font-semibold transition transform hover:scale-105 active:scale-95 duration-200"
          >
            Sign In
          </button>

        </form>

      </div>
    </div>
  );
}

export default Login;
