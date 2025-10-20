import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import bg from "./assets/BG.png";
import LockIcon from "@mui/icons-material/Lock";

const OtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < otp.length - 1) {
        document.getElementById(`otp-${index + 1}`).focus();
      }
    }
  };

  const sendOtp = async (emailToSend = email) => {
    try {
      const res = await fetch("http://localhost:5000/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToSend }),
      });
      const data = await res.json();
      setMessage(data.message);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Failed to send OTP");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleVerify = async () => {
    if (isVerifying) return;
    
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 4) {
      setMessage("Please enter a 4-digit OTP");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsVerifying(true);
    setMessage("Verifying OTP...");

    try {
      const res = await fetch("http://localhost:5000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: enteredOtp }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage("✅ OTP verified successfully! Auto-login in progress...");
        
        // ✅ Auto-login after successful verification
        const loginRes = await fetch("http://localhost:5000/api/auto-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const loginData = await loginRes.json();

        if (loginData.success) {
          // Store session data
          sessionStorage.setItem("token", loginData.token);
          sessionStorage.setItem("user", JSON.stringify(loginData.user));
          
          setMessage("✅ Login successful! Redirecting...");
          
          // Wait 1.5 seconds so user can see the success message
          setTimeout(() => {
            // Role-based navigation
            const role = loginData.user.role;
            if (role === "admin") {
              navigate("/admin");
            } else {
              navigate("/taratrabaho");
            }
          }, 1500);
          
        } else {
          setMessage("❌ Auto-login failed. Please login manually.");
          setTimeout(() => {
            navigate("/login");
          }, 2000);
        }
      } else {
        setMessage(`❌ ${data.message || "Verification failed"}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Verification failed due to network error");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="w-full max-w-md bg-[#FFE660] p-10 rounded-3xl shadow-lg text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <LockIcon fontSize="large" className="text-[#272343]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[#272343] mb-2">Enter OTP Code</h2>
        <p className="text-gray-700 text-sm mb-4">
          We have sent the code to your email: <strong>{email}</strong>
        </p>

        <div className="flex justify-center gap-3 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              className="w-12 h-14 text-center text-xl font-bold rounded-md border border-gray-400 bg-[#BAE8E8] focus:outline-none focus:ring-2 focus:ring-[#2C275C]"
              disabled={isVerifying}
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className={`w-full bg-[#2C275C] text-white py-2 rounded-md font-semibold transition ${
            isVerifying ? "opacity-50 cursor-not-allowed" : "hover:bg-[#1b163e]"
          }`}
        >
          {isVerifying ? "Verifying..." : "Verify Code"}
        </button>

        <p className="mt-4 text-sm">
          Didn't receive the code?{" "}
          <button 
            onClick={() => sendOtp()} 
            className="text-blue-600 underline"
            disabled={isVerifying}
          >
            Resend Code
          </button>
        </p>

        {message && (
          <div className={`mt-4 p-3 rounded-md text-sm ${
            message.includes("✅") || message.includes("successfully") 
              ? "bg-green-100 text-green-800 border border-green-200" 
              : message.includes("❌") || message.includes("failed")
              ? "bg-red-100 text-red-800 border border-red-200"
              : "bg-blue-100 text-blue-800 border border-blue-200"
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default OtpPage;