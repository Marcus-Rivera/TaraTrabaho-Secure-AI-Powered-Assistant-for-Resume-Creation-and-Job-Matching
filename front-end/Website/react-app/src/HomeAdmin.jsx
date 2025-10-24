import React, { useState, useEffect } from "react";
import { Drawer, IconButton, Avatar, Chip } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSessionCheck } from "../useSessionCheck";
import SessionExpiredModal from "../SessionExpiredModal";

const SidebarContent = ({ onClose, isMobile }) => {
  const { userData, sessionError } = useSessionCheck();
  const [profile, setProfile] = useState(null);
  const [accessError, setAccessError] = useState(false); // ✅ Local flag for admin restriction
  const navigate = useNavigate();

  useEffect(() => {
    if (userData) {
      // ✅ If user is not admin, show modal instead of directly redirecting
      if (userData.role !== "admin") {
        setAccessError(true);
        // setTimeout(() => navigate("/login"), 5000);
        return; // stop here, don’t fetch profile
      }

      // ✅ Only fetch profile for valid admin users
      if (userData.email) {
        fetch(`/api/profile/${userData.email}`)
          .then((res) => res.json())
          .then((data) => setProfile(data))
          .catch((err) => console.error("Error fetching profile:", err));
      }
    }
  }, [userData]);

  // ✅ Handle both session and role errors
  if (sessionError) return <SessionExpiredModal errorType="session" />;
  if (accessError) return <SessionExpiredModal errorType="admin" />;

  if (!userData || !profile) return null;

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: "/admin/manage-users", icon: <PersonIcon />, label: "Manage Users" },
    { path: "/admin/job-listing", icon: <WorkOutlineOutlinedIcon />, label: "Job Listing", badge: "New" },
    { path: "/admin/report", icon: <AssignmentIcon />, label: "Report", badge: "Data" },
  ];

  const handleLogout = () => {
    alert("Admin logging out...");
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="flex flex-col w-64 h-full bg-gradient-to-b from-[#BAE8E8] via-[#C8E9E9] to-[#D0EBEB] shadow-xl">
      {/* Header for mobile */}
      {isMobile && (
        <div className="flex justify-end p-4">
          <IconButton onClick={onClose} size="small" className="text-[#272343]">
            <CloseIcon />
          </IconButton>
        </div>
      )}

      {/* Logo */}
      <div className="px-4 pt-6 pb-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-md">
          <h2 className="text-2xl font-bold text-[#272343] text-center">TaraTrabaho</h2>
          <p className="text-xs text-center text-[#272343]/70 mt-1">Admin Panel</p>
        </div>
      </div>

      {/* Profile info (NO PFP) */}
      <div className="flex flex-col items-center px-4 pb-6">
        <Avatar
          sx={{
            width: 100,
            height: 100,
            bgcolor: "#272343",
            color: "#FBDA23",
            fontWeight: "bold",
            fontSize: "1.5rem",
          }}
        >
          {profile.firstname?.[0]?.toUpperCase() || "A"}
        </Avatar>

        <h4 className="mt-3 text-lg font-bold text-[#272343]">
          {profile.firstname} {profile.lastname}
        </h4>
        <p className="text-xs text-[#272343]/70">{profile.email}</p>
        <Chip
          label="Administrator"
          size="small"
          sx={{
            backgroundColor: "#272343",
            color: "#FBDA23",
            fontWeight: "bold",
            fontSize: "0.7rem",
            mt: 1,
          }}
        />
      </div>

      {/* Navigation */}
      <div className="flex flex-col justify-between flex-1 px-4 pb-6 overflow-y-auto">
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              className={({ isActive: active }) =>
                `group flex items-center justify-between w-full px-4 py-3 mt-2 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-[#FBDA23] to-[#FFE55C] text-[#272343] font-bold shadow-md scale-[1.02]"
                    : "text-[#272343] hover:bg-[#FBDA23]/20 hover:translate-x-1"
                }`
              }
            >
              <div className="flex items-center">
                {item.icon}
                <span className="mx-3 font-semibold text-sm">{item.label}</span>
              </div>
              {item.badge && (
                <Chip
                  label={item.badge}
                  size="small"
                  sx={{
                    backgroundColor: isActive(item.path) ? "#272343" : "#FBDA23",
                    color: isActive(item.path) ? "#FBDA23" : "#272343",
                    fontWeight: "bold",
                  }}
                />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="mt-4">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-[#272343] rounded-xl transition-all duration-200 hover:bg-red-100/80 hover:shadow-md group"
          >
            <LogoutIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
            <span className="mx-3 font-semibold text-sm">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const HomeAdmin = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile toggle button */}
      <div className="fixed top-4 left-4 xl:hidden z-50">
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            backgroundColor: "#FBDA23",
            "&:hover": {
              backgroundColor: "#FFE55C",
            },
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <MenuIcon sx={{ color: "#272343" }} />
        </IconButton>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden xl:flex">
        <SidebarContent onClose={() => {}} isMobile={false} />
      </div>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: "280px",
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          },
        }}
      >
        <SidebarContent onClose={() => setOpen(false)} isMobile={true} />
      </Drawer>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default HomeAdmin;
