import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "./assets/BG.png";
import { Alert } from "@mui/material";

// Terms Modal Component
const TermsModal = ({ isOpen, onClose, form, setForm }) => {
  if (!isOpen) return null;

  const handleAgreeChange = (e) => {
    setForm((prev) => ({ ...prev, agree: e.target.checked }));
  };

  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#FFE660] rounded-lg shadow-lg p-6 w-[90%] max-w-3xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#272343] text-xl cursor-pointer hover:scale-110 transition-transform"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center text-[#272343]">
          Terms and Conditions
        </h2>

        <div className="bg-white border rounded-md p-4 max-h-[300px] overflow-y-auto text-sm text-gray-800">
          <p>
            By using TaraTrabaho: Secure AI-Powered Assistant for Resume Creation
            and Job Matching, you agree to our Terms and Conditions. Users must
            provide accurate information and are responsible for keeping their
            account details secure. TaraTrabaho offers free and premium services,
            including AI-powered resume creation, job matching, and application
            features, but does not guarantee employment results. All personal data
            is protected through encryption, password hashing, and OTP
            authentication, and will only be shared with employers when you apply
            to their postings. Users must not submit false information, engage in
            fraudulent activities, or misuse the platform. TaraTrabaho is not
            liable for employer hiring decisions or service interruptions, and use
            of the platform is at your own risk. Premium features may require
            payment, and refunds follow our stated policies. We reserve the right
            to suspend or terminate accounts that violate these terms. By
            continuing to use the platform, you accept any updates to these Terms
            and Conditions. For assistance or questions, you may reach us through
            our Support page or official contact email.
          </p>
        </div>

        {/* Checkbox + Agree */}
        <div className="flex items-center mt-4 gap-2">
          <input
            type="checkbox"
            checked={form.agree}
            onChange={handleAgreeChange}
            className="w-4 h-4 cursor-pointer"
          />
          <label className="text-sm">I Agree</label>
        </div>
      </div>
    </div>
  );
};

const SignupPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    birthday: "",
    gender: "Female",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState("error");
  const [termsOpen, setTermsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to get max date (16 years ago from today)
  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field) => {
    let error = "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    switch (field) {
      case "firstname":
        if (!form.firstname.trim()) error = "Firstname is required";
        break;
      case "lastname":
        if (!form.lastname.trim()) error = "Lastname is required";
        break;
      case "birthday":
        if (!form.birthday) error = "Birthday is required";
        else if (new Date(form.birthday) > new Date(getMaxDate())) {
          error = "You must be at least 16 years old";
        }
        break;
      case "email":
        if (!form.email.trim()) error = "Email is required";
        else if (!emailRegex.test(form.email)) error = "Enter a valid email";
        break;
      case "username":
        if (!form.username.trim()) error = "Username is required";
        break;
      case "password":
        if (!form.password) error = "Password is required";
        else if (form.password.length < 6) error = "Password must be at least 6 characters";
        break;
      case "confirmPassword":
        if (!form.confirmPassword) error = "Please confirm your password";
        else if (form.password !== form.confirmPassword) error = "Passwords do not match";
        break;
      case "agree":
        if (!form.agree) error = "You must accept Terms of Use";
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  };

  const validateForm = () => {
    const fields = ["firstname", "lastname", "birthday", "email", "username", "password", "confirmPassword", "agree"];
    let isValid = true;

    fields.forEach((field) => {
      const fieldValid = validateField(field);
      if (!fieldValid) {
        isValid = false;
        setTouched((prev) => ({ ...prev, [field]: true }));
      }
    });

    return isValid;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsLoading(true);
      
      try {
        const response = await fetch("http://localhost:5000/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const result = await response.json();

        if (result.status === "pending") {
          setAlertType("success");
          setAlertMsg("Signup successful! Please verify your email.");
          setShowAlert(true);

          setTimeout(() => {
            navigate("/otp", { state: { email: result.email } });
          }, 1500);
        } else {
          setAlertType("error");
          setAlertMsg(result.message);
          setShowAlert(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(error);
        setAlertType("error");
        setAlertMsg("Error connecting to server");
        setShowAlert(true);
        setIsLoading(false);
      }
    }
  };

  const getInputClassName = (fieldName, baseClass) => {
    const hasError = touched[fieldName] && errors[fieldName];
    return `${baseClass} ${hasError ? 'border-red-500 border-2' : 'border-gray-400'}`;
  };

  return (
    <div
      className="flex flex-col lg:flex-row bg-cover min-h-screen lg:items-center pt-5 pb-5 lg:pb-5"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Alert */}
      {showAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Alert severity={alertType}>{alertMsg}</Alert>
        </div>
      )}

      {/* Welcome Section */}
      <div className="flex w-full lg:w-2/3 items-center justify-center p-3 mx-auto">
        <div className="flex w-full lg:w-1/2 justify-center items-center">
          <div className="text-[#272343] p-2">
            <h3 className="text-3xl font-inter font-bold">Welcome To</h3>
            <h1 className="text-5xl lg:text-7xl text-center font-inter font-bold mt-10 mb-2 italic text-[#272343] animate-bounce">
              Tara
              <span className="text-yellow-400 drop-shadow-[2px_2px_0px_black] italic">
                Trabaho!
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* Signup Form */}
      <div className="flex w-full lg:w-2/3 items-center justify-center p-5">
        <div className="w-full max-w-2xl rounded-3xl bg-[#FFE660] p-8 shadow-lg relative">
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

          <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">
            Create Account
          </h2>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Firstname & Lastname */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Firstname {touched.firstname && errors.firstname && <span className="text-red-500 text-xs">* {errors.firstname}</span>}
                </label>
                <input
                  type="text"
                  name="firstname"
                  value={form.firstname}
                  onChange={handleChange}
                  onBlur={() => handleBlur("firstname")}
                  placeholder="Firstname"
                  className={getInputClassName("firstname", "w-full rounded-md p-2 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#272343]")}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Lastname {touched.lastname && errors.lastname && <span className="text-red-500 text-xs">* {errors.lastname}</span>}
                </label>
                <input
                  type="text"
                  name="lastname"
                  value={form.lastname}
                  onChange={handleChange}
                  onBlur={() => handleBlur("lastname")}
                  placeholder="Lastname"
                  className={getInputClassName("lastname", "w-full rounded-md p-2 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#272343]")}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Birthday & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Birthday {touched.birthday && errors.birthday && <span className="text-red-500 text-xs">* {errors.birthday}</span>}
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={form.birthday}
                  onChange={handleChange}
                  onBlur={() => handleBlur("birthday")}
                  max={getMaxDate()}
                  className={getInputClassName("birthday", "w-full rounded-md p-2 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#272343]")}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Gender (Optional)</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-400 p-2 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#272343]"
                  disabled={isLoading}
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            {/* Username & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Username {touched.username && errors.username && <span className="text-red-500 text-xs">* {errors.username}</span>}
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  onBlur={() => handleBlur("username")}
                  placeholder="Username"
                  className={getInputClassName("username", "w-full rounded-md p-2 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#272343]")}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email {touched.email && errors.email && <span className="text-red-500 text-xs">* {errors.email}</span>}
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur("email")}
                  placeholder="Email"
                  className={getInputClassName("email", "w-full rounded-md p-2 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#272343]")}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone (Optional)</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone number"
                className="w-full rounded-md border border-gray-400 p-2 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#272343]"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Password {touched.password && errors.password && <span className="text-red-500 text-xs">* {errors.password}</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur("password")}
                  placeholder="Password (min. 6 characters)"
                  className={getInputClassName("password", "w-full rounded-md p-2 pr-10 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#272343]")}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 focus:outline-none"
                  tabIndex="-1"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Confirm Password {touched.confirmPassword && errors.confirmPassword && <span className="text-red-500 text-xs">* {errors.confirmPassword}</span>}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleBlur("confirmPassword")}
                  placeholder="Confirm Password"
                  className={getInputClassName("confirmPassword", "w-full rounded-md p-2 pr-10 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#272343]")}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 focus:outline-none"
                  tabIndex="-1"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className={`p-3 rounded-md ${touched.agree && errors.agree ? 'bg-red-50 border-2 border-red-500' : ''}`}>
              <div className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="agree"
                  checked={form.agree}
                  onChange={handleChange}
                  onBlur={() => handleBlur("agree")}
                  className="mt-1 w-4 h-4 cursor-pointer"
                  disabled={isLoading}
                />
                <p>
                  By clicking <span className="font-bold">"Sign Up"</span> I agree
                  that I have read and accept the{" "}
                  <button
                    type="button"
                    onClick={() => setTermsOpen(true)}
                    className="text-blue-600 underline hover:text-blue-800"
                    disabled={isLoading}
                  >
                    Terms of Use
                  </button>
                  {touched.agree && errors.agree && <span className="text-red-500 text-xs"> * {errors.agree}</span>}
                </p>
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full rounded-md py-3 font-semibold text-white transition-all ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                  : 'bg-[#2C275C] hover:bg-[#1b163e] hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                'Sign Up'
              )}
            </button>

            {/* Login link */}
            <p className="mt-4 text-center text-sm text-gray-700">
              Already have an Account?{" "}
              <a 
                href="/login" 
                className={`text-blue-600 underline hover:text-blue-800 font-semibold ${
                  isLoading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Login
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Terms Modal */}
      <TermsModal 
        isOpen={termsOpen} 
        onClose={() => setTermsOpen(false)} 
        form={form} 
        setForm={setForm} 
      />
    </div>
  );
};

export default SignupPage;