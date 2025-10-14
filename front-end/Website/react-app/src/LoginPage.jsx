import { useState, useEffect } from "react";
import bg from './assets/BG.png';
import { FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import Alert from '@mui/material/Alert';
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("error"); // For MUI Alert
  const [submitted, setSubmitted] = useState(false); // Track if form was submitted
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Auto-hide alert after 5 seconds
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

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

    // Merge with existing errors (for other fields, if any)
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
      // Clear email error on typing after submission
      if (submitted && errors.email) {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
    }
    if (name === "password") {
      setPassword(value);
      // Clear password error on typing after submission
      if (submitted && errors.password) {
        setErrors((prev) => ({ ...prev, password: "" }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark as submitted and run full validation
    setSubmitted(true);

    if (!validateForm()) {
      setAlertMessage("Please fix the errors below");
      setAlertSeverity("error");
      return;
    }

    // Clear any previous alerts
    setAlertMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success: Clear form, errors, and submitted state
        sessionStorage.setItem("token", data.token);
        setEmail("");
        setPassword("");
        setErrors({});
        setSubmitted(false);
        const role = data.user.role;
        if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/taratrabaho");
        }
      } else {
        // Server error: Use specific message if available (e.g., for invalid password)
        const errorMsg = data.message || "Invalid email or password";
        setAlertMessage(errorMsg);
        setAlertSeverity("error");
        // Highlight fields on server error (assume email/password invalid)
        setErrors({ email: "Invalid credentials", password: "Invalid credentials" });
      }

    } catch (error) {
      console.error("Login error:", error);
      setAlertMessage("Server error. Try again later.");
      setAlertSeverity("error");
    }
  };

  return (
    <div
      className="flex flex-col-reverse lg:flex-row bg-cover min-h-screen lg:items-center pt-12 pb-35 lg:pt-10 lg:pb-10"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Alert if login fails */}
      {alertMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg">
          <Alert severity={alertSeverity} onClose={() => setAlertMessage("")}>
            {alertMessage}
          </Alert>
        </div>
      )}

      <div className="flex w-full lg:w-2/3 items-center justify-center p-7">
        <div className="w-full max-w-md rounded-4xl bg-[#FFE660] p-8 shadow-lg">
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
                className={`mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 bg-[#BAE8E8] ${
                  submitted && errors.password
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-[#272343] focus:border-blue-500 focus:ring-blue-500"
                }`}
                placeholder="Enter your password"
                aria-invalid={submitted && !!errors.password}
                aria-describedby={submitted && errors.password ? "password-error" : undefined}
              />

              {/* Eye toggle button (inside relative container) */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9.5 text-gray-600 hover:text-gray-800 focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? (
                  // Eye Off icon
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
                  // Eye Open icon
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
              className="block px-6 mx-auto rounded-md bg-[#2C275C] py-2 font-semibold text-white transition hover:bg-[#1b163e] cursor-pointer"
            >
              Trabaho Na!
            </button>
          </form>

          {/* Extra Links */}
          <p className="mt-6 mb-1 text-center text-sm">
            <a href="/Signup" className="text-[#272343] font-bold underline hover:underline">
              Don’t have an account? Sign up
            </a>
          </p>
          <p className="text-center text-sm">
            <a href="/Forget" className="text-[#272343] font-bold underline hover:underline">
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
            <a
              href="https://www.facebook.com/login"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 hover:shadow-lg transition transform duration-200 cursor-pointer"
            >
              <FaFacebookF /> Facebook
            </a>
            <a
              href="https://accounts.google.com/signin"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-white text-gray-800 border hover:bg-gray-100 hover:scale-105 hover:shadow-lg transition transform duration-200 cursor-pointer"
            >
              <FcGoogle /> Gmail
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
