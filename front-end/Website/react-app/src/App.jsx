import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./LoginPage";
import Home from "./Home";
import HomeAdmin from "./HomeAdmin";
import "./index.css";
import LandingPage from "./LandingPage";
import SignupPage from "./SignupPage";
import OtpPage from "./OtpPage";
import AboutUsPage from "./AboutUsPage";
import ManageUser from "./ManageUser";
import JobListing from "./JobListing";
import Faqs from "./Faqs";
import Report from "./Report";
import NotFound404 from './NotFound404';

// Import your sections
import ProfileSection from "./ProfileSection";
import DashboardSection from "./DashboardSection";
import CareerBotSection from "./CareerBotSection";
import ResumeSection from "./ResumeSection";
import JobListingsSection from "./JobListingsSection";

import ForgetPasswordPage from './ForgetPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/otp" element={<OtpPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/faqs" element={<Faqs />} />
        <Route path="/forget" element={<ForgetPasswordPage />} />
        <Route path="/report" element={<Report />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />


        {/* User Dashboard (TaraTrabaho) */}
        <Route path="/taratrabaho" element={<Home />}>
          {/* Default redirect */}
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfileSection />} />
          <Route path="dashboard" element={<DashboardSection />} />
          <Route path="careerbot" element={<CareerBotSection />} />
          <Route path="resumes" element={<ResumeSection />} />
          <Route path="jobs" element={<JobListingsSection />} />
        </Route>

        {/* Admin Dashboard */}
        <Route path="/admin" element={<HomeAdmin />}>
          {/* Default redirect to manage-users */}
          <Route index element={<Navigate to="manage-users" replace />} />
          <Route path="manage-users" element={<ManageUser />} />
          <Route path="job-listing" element={<JobListing />} />
          <Route path="report" element={<Report />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    </Router>
  );
}

export default App;
