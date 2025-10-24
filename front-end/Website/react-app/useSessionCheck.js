import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Custom React hook that checks for a valid session token.
 * Handles session expiration and redirection automatically.
 * @returns {Object} { userData, loading, sessionError }
 */
export const useSessionCheck = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    // No token present → trigger error and redirect
    if (!token) {
      setSessionError(true);
      setTimeout(() => navigate("/login"), 5000);
      setLoading(false);
      return;
    }

    // Verify token with backend
    fetch("/api/verifyToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.valid) {
          sessionStorage.removeItem("token");
          setSessionError(true);
          setTimeout(() => navigate("/login"), 5000);
        } else {
          setUserData(data.user);
        }
      })
      .catch(() => {
        setSessionError(true);
        setTimeout(() => navigate("/login"), 5000);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return { userData, loading, sessionError };
};
