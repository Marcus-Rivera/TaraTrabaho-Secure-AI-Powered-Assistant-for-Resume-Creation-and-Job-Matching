import { useState, useEffect } from "react";
import bg from './assets/BG.png';
import { FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import Alert from '@mui/material/Alert';
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { API_BASE } from "./config/api";

//Google Client ID
const GOOGLE_CLIENT_ID = "951421250117-tsbuglbst1a4oktfvhd6ht6j4komoue0.apps.googleusercontent.com";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("error");
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-hide alert after duration (longer for suspension messages)
  useEffect(() => {
    if (alertMessage) {
      const duration = isSuspended ? 10000 : 5000;
      const timer = setTimeout(() => {
        setAlertMessage("");
        setIsSuspended(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [alertMessage, isSuspended]);

  const validateField = (fieldName, value) => {
    let fieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (fieldName === "email") {
      if (!value.trim()) {
        fieldErrors.email = "Email is required";
      } else if (!emailRegex.test(value)) {
        fieldErrors.email = "Enter a valid email address";
      }
    }

    if (fieldName === "password") {
      if (!value) {
        fieldErrors.password = "Password is required";
      } else if (value.length < 6) {
        fieldErrors.password = "Password must be at least 6 characters";
      }
    }

    setErrors((prevErrors) => ({ ...prevErrors, ...fieldErrors }));
    return Object.keys(fieldErrors).length === 0;
  };

  const validateForm = () => {
    const emailValid = validateField("email", email);
    const passwordValid = validateField("password", password);
    return emailValid && passwordValid;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "email") {
      setEmail(value);
      if (submitted && errors.email) {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
    }
    if (name === "password") {
      setPassword(value);
      if (submitted && errors.password) {
        setErrors((prev) => ({ ...prev, password: "" }));
      }
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  setSubmitted(true);

  if (!validateForm()) {
    setAlertMessage("Please fix the errors below");
    setAlertSeverity("error");
    setIsSuspended(false);
    return;
  }

  setAlertMessage("");
  setIsLoading(true);

  try {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    // ✅ FIX: Handle rate limit (429) before parsing JSON
    if (response.status === 429) {
      setAlertMessage("Too many login attempts. Please try again in 15 minutes.");
      setAlertSeverity("warning");
      setIsSuspended(false);
      setIsLoading(false);
      return;
    }

    const data = await response.json();

    if (data.status === "suspended") {
      setAlertMessage(data.message);
      setAlertSeverity("warning");
      setIsSuspended(true);
      setErrors({});
      setIsLoading(false);
      return;
    }

    if (response.ok && data.success) {
      sessionStorage.setItem("token", data.token);
      window.dispatchEvent(new Event('tokenUpdated'));
      setEmail("");
      setPassword("");
      setErrors({});
      setSubmitted(false);
      setIsSuspended(false);
      
      const role = data.user.role;
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/taratrabaho");
      }
    } else {
      const errorMsg = data.message || "Invalid email or password";
      setAlertMessage(errorMsg);
      setAlertSeverity("error");
      setIsSuspended(false);
      setErrors({ email: "Invalid credentials", password: "Invalid credentials" });
      setIsLoading(false);
    }

  } catch (error) {
    console.error("Login error:", error);
    setAlertMessage("Server error. Try again later.");
    setAlertSeverity("error");
    setIsSuspended(false);
    setIsLoading(false);
  }
};

  // Handle Google Login Success
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setIsLoading(true);
      //console.log("🔐 Google login initiated...");

      // Decode JWT token from Google
      const decoded = jwtDecode(credentialResponse.credential);
      console.log("📧 Google user info:", decoded);

      // Send to backend
      const response = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: decoded.email,
          firstname: decoded.given_name,
          lastname: decoded.family_name,
          googleId: decoded.sub,
          picture: decoded.picture,
          email_verified: decoded.email_verified
        })
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem("token", data.token);
        window.dispatchEvent(new Event('tokenUpdated'));
        console.log("✅ Google login successful!");
        
        const role = data.user.role;
        if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/taratrabaho");
        }
      } else {
        setAlertMessage(data.message || "Google login failed");
        setAlertSeverity("error");
        setIsLoading(false);
      }

    } catch (error) {
      console.error("❌ Google login error:", error);
      setAlertMessage("Failed to login with Google. Please try again.");
      setAlertSeverity("error");
      setIsLoading(false);
    }
  };

  // Handle Google Login Error
  const handleGoogleError = () => {
    console.error("❌ Google login failed");
    setAlertMessage("Google login failed. Please try again.");
    setAlertSeverity("error");
  };

  return (
    <div
      className="flex flex-col-reverse lg:flex-row bg-cover min-h-screen lg:items-center pt-12 pb-35 lg:pt-10 lg:pb-10"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Alert if login fails or account suspended */}
      {alertMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <Alert 
            severity={alertSeverity} 
            onClose={() => {
              setAlertMessage("");
              setIsSuspended(false);
            }}
            sx={isSuspended ? { 
              fontSize: '0.95rem',
              '& .MuiAlert-message': { width: '100%' }
            } : {}}
          >
            {alertMessage}
          </Alert>
        </div>
      )}

      <div className="flex w-full lg:w-2/3 items-center justify-center p-7">
        <div className="w-full max-w-md rounded-4xl bg-[#FFE660] p-8 shadow-lg relative">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors group"
            type="button"
            disabled={isLoading}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="font-semibold">Back</span>
          </button>

          <h2 className="mb-6 text-center text-4xl font-bold text-gray-800">Login</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label 
                htmlFor="email"
                className="block text-md font-bold font-inter text-gray-600"
              >
                Email{submitted && errors.email ? <span className="text-red-500 ml-1">*</span> : ''}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={handleInputChange}
                disabled={isLoading}
                className={`mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 bg-[#BAE8E8] ${
                  submitted && errors.email
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-[#272343] focus:border-blue-500 focus:ring-blue-500"
                }`}
                placeholder="Enter your email"
                aria-invalid={submitted && !!errors.email}
                aria-describedby={submitted && errors.email ? "email-error" : undefined}
              />
              {submitted && errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="relative">
              <label
                htmlFor="password"
                className="block text-md font-bold text-gray-600"
              >
                Password
                {submitted && errors.password ? (
                  <span className="text-red-500 ml-1">*</span>
                ) : (
                  ""
                )}
              </label>

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handleInputChange}
                disabled={isLoading}
                className={`mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 bg-[#BAE8E8] ${
                  submitted && errors.password
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-[#272343] focus:border-blue-500 focus:ring-blue-500"
                }`}
                placeholder="Enter your password"
                aria-invalid={submitted && !!errors.password}
                aria-describedby={submitted && errors.password ? "password-error" : undefined}
              />

              {/* Eye toggle button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-9.5 text-gray-600 hover:text-gray-800 focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
              </button>

              {/* Error message */}
              {submitted && errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={`block w-full px-6 rounded-md py-2 font-semibold text-white transition ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#2C275C] hover:bg-[#1b163e] cursor-pointer'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </div>
              ) : (
                'Trabaho Na!'
              )}
            </button>
          </form>

          {/* Extra Links */}
          <p className="mt-6 mb-1 text-center text-sm">
            <a 
              href="/Signup" 
              className={`text-[#272343] font-bold underline hover:underline ${
                isLoading ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              Don't have an account? Sign up
            </a>
          </p>
          <p className="text-center text-sm">
            <a 
              href="/Forget" 
              className={`text-[#272343] font-bold underline hover:underline ${
                isLoading ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              Forget Password?
            </a>
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex w-full lg:w-1/2 justify-center lg:justify-end p-8 lg:items-center">
        <div className="text-center lg:text-right text-[#272343] p-2">
          <h3 className="text-3xl">Welcome Back to</h3>
          <h1 className="text-5xl lg:text-7xl font-inter font-bold mt-5 mb-4 italic text-[#272343] animate-bounce">
            Tara
            <span className="text-yellow-400 drop-shadow-[2px_2px_0px_black] italic">
              Trabaho!
            </span>
          </h1>
          <p className="text-lg mb-4">Sign in to access your dashboard and start your journey with us.</p>
          <h4 className="font-bold">Login With</h4>

          {/* Social Buttons */}
          <div className="flex justify-center lg:justify-end gap-4 mt-4">
            
            {/* Google Login Button - Using GoogleLogin Component */}
            <div className="flex items-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="200"
                logo_alignment="left"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap with GoogleOAuthProvider
export default function LoginPage() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}