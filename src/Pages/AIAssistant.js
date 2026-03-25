import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import appAssets from "../Config/appAssets";
import API_BASE_URL from "../Config/apiConfig";

function AIAssistant() {
  const { incidentNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const incidentData = location.state?.incidentData;

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  /* Auto Scroll */

  useEffect(() => {
    const container = chatContainerRef.current;

    if (!container) return;

    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }, 150);
  }, [messages, loading]);

  /* Auto Focus Input */

  useEffect(() => {
    inputRef.current?.focus();
  }, [messages]);

  /* Format AI response */

  const formatAIResponse = (text) => {
    if (!text) return "";

    return text
      .replace(/Incident Analysis/gi, "🔎 INCIDENT ANALYSIS")
      .replace(/Incident Overview/gi, "🔎 INCIDENT OVERVIEW")
      .replace(/Root Cause/gi, "⚠ ROOT CAUSE")
      .replace(/Troubleshooting Steps/gi, "🛠 TROUBLESHOOTING")
      .replace(/Networking Concepts/gi, "📘 NETWORK CONCEPTS")
      .replace(/Relevant Commands/gi, "💻 COMMANDS")
      .replace(/Critical Checks/gi, "✅ CRITICAL CHECKS")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "•")
      .replace(/\n{2,}/g, "\n\n");
  };

  /* Ask AI */

  const askAI = async (q) => {
    if (!q.trim()) return;

    const token = localStorage.getItem("token");

    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: q }]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          incident: incidentNumber,
          device: incidentData?.affected_ci?.[0]?.ci_item || "Unknown Device",
          description: incidentData?.short_description,
          severity: incidentData?.severity,
          priority: incidentData?.priority,
          serviceImpact: incidentData?.service_affect,
          resolution: incidentData?.close_notes,
          engineer: incidentData?.assigned_to?.display_value,
          question: q,
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "AI failed to respond." },
      ]);
    }

    setLoading(false);
  };

  /* Clear Chat */

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div
      className="min-h-screen bg-fixed bg-cover bg-center"
      style={{ backgroundImage: `url(${appAssets.logo})` }}
    >
      <div className="min-h-screen bg-black/60">
        <div className="max-w-5xl mx-auto p-10">
          {/* Back Button */}

          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition"
          >
            ← Back to Dashboard
          </button>

          {/* Main Card */}

          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8">
            {/* Header */}

            <div className="flex justify-between items-center mb-2">
              <h1 className="text-3xl font-bold text-blue-800">
                AI Assistant
              </h1>

              <button
                onClick={clearChat}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Clear Chat
              </button>
            </div>

            <p className="text-gray-600 mb-6">Incident: {incidentNumber}</p>

            {/* Suggested Questions */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() =>
                  askAI(
                    "Analyze the incident and explain what is happening simply.",
                  )
                }
                className="bg-blue-600 hover:bg-blue-800 text-white p-3 rounded-lg shadow-md transition transform hover:scale-105"
              >
                Analyze the Incident
              </button>

              <button
                onClick={() =>
                  askAI("What issue is happening here and why does it occur?")
                }
                className="bg-purple-600 hover:bg-purple-800 text-white p-3 rounded-lg shadow-md transition transform hover:scale-105"
              >
                Why did this happen?
              </button>

              <button
                onClick={() =>
                  askAI(
                    "Teach me how to troubleshoot and resolve this type of incident.",
                  )
                }
                className="bg-green-600 hover:bg-green-800 text-white p-3 rounded-lg shadow-md transition transform hover:scale-105"
              >
                Learn how to resolve it
              </button>
            </div>

            {/* Chat Area */}

            <div
              ref={chatContainerRef}
              className="bg-white/80 backdrop-blur-md rounded-xl p-6 h-[420px] overflow-y-auto mb-6 border shadow-inner"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`mb-4 flex animate-fadeIn ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] px-5 py-3 rounded-xl whitespace-pre-line text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-white border shadow-md text-gray-800"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="font-semibold text-indigo-700 mb-2">
                        AI Incident Analysis
                      </div>
                    )}

                    <div className="whitespace-pre-line leading-relaxed">
                      {msg.role === "assistant"
                        ? formatAIResponse(msg.content)
                        : msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <p className="text-gray-500 animate-pulse">AI is thinking...</p>
              )}
            </div>

            {/* Input */}

            <div className="flex gap-3">
              <input
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything about networking..."
                className="flex-1 border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />

              <button
                onClick={() => {
                  askAI(question);
                  setQuestion("");
                }}
                className="bg-indigo-700 hover:bg-indigo-900 text-white px-6 py-3 rounded-lg shadow-md transition"
              >
                Ask AI
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIAssistant;
