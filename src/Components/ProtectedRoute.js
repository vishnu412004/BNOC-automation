import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

function ProtectedRoute({ children }) {
  const [isAuthed, setIsAuthed] = useState(null); // null = loading, true = authed, false = not authed

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      setIsAuthed(false);
      return;
    }

    // Token exists, allow access
    setIsAuthed(true);
  }, []);

  // Show loading state while checking auth
  if (isAuthed === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If not authenticated, redirect to login
  if (!isAuthed) {
    return <Navigate to="/" />;
  }

  return children;
}

export default ProtectedRoute;
