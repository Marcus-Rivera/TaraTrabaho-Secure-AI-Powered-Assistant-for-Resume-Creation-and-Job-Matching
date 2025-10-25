import { useState, useEffect } from "react";
import bg from "./assets/BG.png";
import Alert from "@mui/material/Alert";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../config/api";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("info");
  const [isLoading, setIsLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setAlertSeverity("error");
        setAlertMessage("Invalid reset link. No token provided.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/verify-reset-token/${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
        } else {
          setAlertSeverity("error");
          setAlertMessage(data.message || "Invalid or expired reset link.");
          setTimeout(() => navigate("/forget-password"), 3000);
        }
      } catch (error) {
        console.error("Token verification error:", error);
        setAlertSeverity("error");
        setAlertMessage("Failed to verify reset link. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

  const validateForm = () => {
    let newErrors = {};

    if (!password) {
      newErrors.password = "New password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please re-enter your password";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setAlertSeverity("error");
      setAlertMessage("Please correct the errors before proceeding");
      return;
    }

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlertSeverity("success");
        setAlertMessage("Your password has been reset successfully! Redirecting to login...");
        setPassword("");
        setConfirmPassword("");
        setErrors({});
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setAlertSeverity("error");
        setAlertMessage(data.message || "Invalid or expired reset link.");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setAlertSeverity("error");
      setAlertMessage("Server error. Please try again later.");
    }
  };

  // Show loading state while verifying token
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-cover"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <p className="text-xl text-[#272343]">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Don't show form if token is invalid
  if (!tokenValid) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-cover"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <Alert severity="error">{alertMessage}</Alert>
          <button
            onClick={() => navigate("/forget-password")}
            className="mt-4 px-6 rounded-md bg-[#2C275C] py-2 font-semibold text-white transition hover:bg-[#1b163e] cursor-pointer"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col-reverse lg:flex-row bg-cover min-h-screen lg:items-center pt-12 pb-35 lg:pt-10 lg:pb-10"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Alert */}
      {alertMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg">
          <Alert severity={alertSeverity} onClose={() => setAlertMessage("")}>
            {alertMessage}
          </Alert>
        </div>
      )}

      {/* Left Form */}
      <div className="flex w-full lg:w-2/3 items-center justify-center p-7">
        <div className="w-full max-w-md rounded-4xl bg-[#FFE660] p-8 shadow-lg">
          <h2 className="mb-6 text-center text-4xl font-bold text-[#272343]">Reset Password</h2>
          <p className="text-center text-sm text-gray-600 mb-6">
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-md font-bold text-gray-600">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 w-full rounded-lg border-[#272343] border p-2 bg-[#BAE8E8] focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-red-500 focus:ring-red-200"
                    : "focus:border-blue-500 focus:ring-blue-200"
                }`}
                placeholder="Enter new password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-md font-bold text-gray-600">Re-enter Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`mt-1 w-full rounded-lg border-[#272343] border p-2 bg-[#BAE8E8] focus:outline-none focus:ring-2 ${
                  errors.confirmPassword
                    ? "border-red-500 focus:ring-red-200"
                    : "focus:border-blue-500 focus:ring-blue-200"
                }`}
                placeholder="Re-enter new password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="block px-6 mx-auto rounded-md bg-[#2C275C] py-2 font-semibold text-white transition hover:bg-[#1b163e] cursor-pointer"
            >
              Reset Password
            </button>
          </form>

          {/* Back to Login */}
          <p className="mt-6 text-center text-sm">
            <a href="/login" className="text-[#272343] font-bold underline hover:underline">
              Back to Login
            </a>
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex w-full lg:w-1/2 justify-center lg:justify-end p-8 lg:items-center">
        <div className="text-center lg:text-right text-[#272343] p-2">
          <h3 className="text-3xl">Set Your New Password</h3>
          <h1 className="text-5xl lg:text-7xl font-inter font-bold mt-5 mb-4 italic text-[#272343] animate-bounce">
            Tara
            <span className="text-yellow-400 drop-shadow-[2px_2px_0px_black] italic">
              Trabaho!
            </span>
          </h1>
          <p className="text-lg mb-4">
            Make sure your new password is strong and secure.
          </p>
        </div>
      </div>
    </div>
  );
}