import React, { useState, useEffect } from "react";
import { Drawer, IconButton, Avatar, Chip } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import CloseIcon from "@mui/icons-material/Close";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import SessionExpiredModal from "../SessionExpiredModal";
import { useSessionCheck } from "../useSessionCheck";
import { useRef } from "react";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PersonIcon from "@mui/icons-material/Person";

const SidebarContent = ({ onClose, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionError } = useSessionCheck();
  
  const [userData, setUserData] = useState(null);

  const fileInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Load user info from token and fetch full data with pfp
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const email = decoded.email;
      if (email) {
        fetch(`http://localhost:5000/api/profile/${email}`)
          .then((res) => res.json())
          .then((data) => {
            if (data) {
              setUserData(data);
              // Load profile picture
              if (data.user_id) {
                loadProfilePicture(data.user_id);
              }
            }
          })
          .catch((err) => console.error("Error loading profile:", err));
      }
    } catch (error) {
      console.error("Invalid token:", error);
    }
  }, []);


  useEffect(() => {
    const storedUser = sessionStorage.getItem("userData");
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }

    // ✅ Listen for user data updates
    const handleUserUpdate = () => {
      const updated = sessionStorage.getItem("userData");
      if (updated) setUserData(JSON.parse(updated));
    };

    // ✅ Listen for profile picture updates
    const handleProfilePictureUpdate = (event) => {
      const userId = event.detail?.userId || userData?.user_id;
      if (userId) {
        console.log('🔄 Reloading profile picture in sidebar...');
        loadProfilePicture(userId);
      }
    };

    window.addEventListener("userDataUpdated", handleUserUpdate);
    window.addEventListener("profilePictureUpdated", handleProfilePictureUpdate);
    
    return () => {
      window.removeEventListener("userDataUpdated", handleUserUpdate);
      window.removeEventListener("profilePictureUpdated", handleProfilePictureUpdate);
    };
  }, [userData?.user_id]); // Add dependency to re-attach listener when user changes

  // load profile picture
  const loadProfilePicture = (userId) => {
  fetch(`http://localhost:5000/api/profile-picture/${userId}`)
    .then((res) => {
      if (res.ok) {
        return res.blob();
      }
      return null;
    })
    .then((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setProfileImage(imageUrl);
      }
    })
    .catch((err) => console.error("Error loading profile picture:", err));
  };

  // Image upload function
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('profilePicture', file);
    formData.append('userId', userData.user_id);

    try {
      const response = await fetch('http://localhost:5000/api/profile-picture/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Update profile picture display
        const imageUrl = URL.createObjectURL(file);
        setProfileImage(imageUrl);
      } else {
        alert('Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Error uploading profile picture');
    } finally {
      setUploading(false);
    }
  };

  // Determine active item based on current route
  const getActive = () => {
    const path = location.pathname;
    if (path.includes('/profile')) return 'profile';
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/careerbot')) return 'careerbot';
    if (path.includes('/resumes')) return 'resumes';
    if (path.includes('/resumes')) return 'resumes';
    if (path.includes('/jobs')) return 'jobs';
    return 'profile';
  };
  
  const active = getActive();

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem('careerbot_messages');
    localStorage.removeItem('careerbot_resume');
    localStorage.removeItem('careerbot_step');
    localStorage.removeItem('careerbot_chatId');
    navigate('/login');
  };

  const NavLink = ({ to, icon, label, itemKey, badge }) => (
    <Link
      to={to}
      onClick={onClose}
      className={`group flex items-center justify-between px-4 py-3 mt-2 first:mt-0 rounded-xl transition-all duration-200 ${
        active === itemKey
          ? "bg-gradient-to-r from-[#FBDA23] to-[#FFE55C] text-[#272343] font-bold shadow-md scale-[1.02]"
          : "text-[#272343] hover:bg-[#FBDA23]/20 hover:translate-x-1"
      }`}
    >
      <div className="flex items-center">
        <div className={`transition-transform duration-200 ${active === itemKey ? 'scale-110' : 'group-hover:scale-110'}`}>
          {icon}
        </div>
        <span className="mx-3 font-semibold text-sm">{label}</span>
      </div>
      {badge && (
        <Chip 
          label={badge} 
          size="small" 
          className="h-5 text-xs"
          sx={{ 
            backgroundColor: active === itemKey ? '#272343' : '#FBDA23',
            color: active === itemKey ? '#FBDA23' : '#272343',
            fontWeight: 'bold'
          }}
        />
      )}
    </Link>
  );

  if (sessionError) return <SessionExpiredModal  />;

  return (
    <div className="flex flex-col w-64 h-full bg-gradient-to-b from-[#BAE8E8] via-[#C8E9E9] to-[#D0EBEB] shadow-xl">
      {/* Header with close button for mobile */}
      {isMobile && (
        <div className="flex justify-end p-4">
          <IconButton onClick={onClose} size="small" className="text-[#272343]">
            <CloseIcon />
          </IconButton>
        </div>
      )}

      {/* Logo/Brand */}
      <div className="px-4 pt-6 pb-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-md">
          <h2 className="text-2xl font-bold text-[#272343] text-center">
            TaraTrabaho
          </h2>
          <p className="text-xs text-center text-[#272343]/70 mt-1">Career Platform</p>
        </div>
      </div>

      {/* Profile */}
      <div className="flex flex-col items-center px-4 pb-6">
        <div className="relative group">
          <Avatar
            src={profileImage}
            alt="User avatar"
            sx={{ 
              width: 100, 
              height: 100,
              border: '4px solid white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          />

          {!profileImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-300 rounded-full">
              <PersonIcon style={{ fontSize: '3.5rem', color: '#9CA3AF' }} />
            </div>
          )}
          
          {/* Upload Button Overlay */}
          {/* <div 
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <PhotoCameraIcon sx={{ color: 'white', fontSize: '2rem' }} />
          </div> */}
          
          {/* Upload Indicator */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
    
    {/* Hidden File Input */}
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleImageUpload}
      className="hidden"
    />
    
    <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
  </div>
  
  <h4 className="mt-3 text-lg font-bold text-[#272343]">
    {userData
      ? `${userData.firstname || ""} ${userData.lastname || ""}`
      : "Your Name"}
  </h4>
  <Chip 
    label="Premium Member" 
    size="small" 
    className="mt-2"
    sx={{ 
      backgroundColor: '#272343',
      color: '#FBDA23',
      fontWeight: 'bold',
      fontSize: '0.7rem'
    }}
  />
</div>

      {/* Navigation */}
      <div className="flex flex-col justify-between flex-1 px-4 pb-6 overflow-y-auto">
        <nav>
          <NavLink
            to="/taratrabaho/profile"
            itemKey="profile"
            label="Profile Setup"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinejoin="round" d="M4 18a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                  <circle cx="12" cy="7" r="3" />
                </g>
              </svg>
            }
          />

          <NavLink
            to="/taratrabaho/dashboard"
            itemKey="dashboard"
            label="Dashboard"
            badge=""
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.557 2.75H4.682A1.93 1.93 0 0 0 2.75 4.682v3.875a1.94 1.94 0 0 0 1.932 1.942h3.875a1.94 1.94 0 0 0 1.942-1.942V4.682A1.94 1.94 0 0 0 8.557 2.75m10.761 0h-3.875a1.94 1.94 0 0 0-1.942 1.932v3.875a1.943 1.943 0 0 0 1.942 1.942h3.875a1.94 1.94 0 0 0 1.932-1.942V4.682a1.93 1.93 0 0 0-1.932-1.932m0 10.75h-3.875a1.94 1.94 0 0 0-1.942 1.933v3.875a1.94 1.94 0 0 0 1.942 1.942h3.875a1.94 1.94 0 0 0 1.932-1.942v-3.875a1.93 1.93 0 0 0-1.932-1.932M8.557 13.5H4.682a1.943 1.943 0 0 0-1.932 1.943v3.875a1.93 1.93 0 0 0 1.932 1.932h3.875a1.94 1.94 0 0 0 1.942-1.932v-3.875a1.94 1.94 0 0 0-1.942-1.942" />
              </svg>
            }
          />

          <NavLink
            to="/taratrabaho/careerbot"
            itemKey="careerbot"
            label="Career Bot"
            badge="AI"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
                  <path d="M8.86 13.735c.58-.61 1.15-1.191 1.681-1.651c.405.109.822.17 1.24.18a.29.29 0 0 0 .311-.27a.28.28 0 0 0-.27-.3c-2.251-.21-3.302-1.602-3.332-3.062c.31.164.65.266 1 .3q.246.037.49 0q.25-.034.481-.13a2.4 2.4 0 0 0 1-.69s0-.08.06-.12q.188.12.391.21c.345.161.708.282 1.08.36c.71.132 1.437.149 2.152.05a3 3 0 0 1-2.461 3.292a.33.33 0 0 0-.29.36a.34.34 0 0 0 .37.29a3.8 3.8 0 0 0 1.39-.42q.52.558.93 1.2c.16.24.311.48.461.73s.28.501.41.761q.234.448.41.92c.21.361.721.431.931-.2c-.08-.66-.18-.54-.38-1.12a6 6 0 0 0-.41-.91a4.2 4.2 0 0 0-.58-.821a6.3 6.3 0 0 0-1.171-1a4.27 4.27 0 0 0 1.28-3.503a4 4 0 0 0-4.002-4.002A4.32 4.32 0 0 0 7.54 8.291a3.68 3.68 0 0 0 2.23 3.532c-.584.343-1.137.738-1.65 1.181a6.3 6.3 0 0 0-1.18 1.361a2.72 2.72 0 0 0-.481 1.59c0 .471.58.731.66.351c.08-.69.29-.75.71-1.33q.482-.65 1.031-1.241m3.172-8.395a2.9 2.9 0 0 1 3.002 2.501a7 7 0 0 1-1.801-.31a6.6 6.6 0 0 1-1.671-.81a5.6 5.6 0 0 1-1.16-1.001a4.2 4.2 0 0 1 1.63-.38m-2.291.74c.28.566.671 1.07 1.15 1.481l.05.05a1.6 1.6 0 0 1-.41.12q-.245.015-.49 0l-.49.07a5.3 5.3 0 0 1-1 .17a3.1 3.1 0 0 1 1.19-1.89" />
                  <path d="M15.724 17.677a.29.29 0 0 0 0-.31c-.24-.39-.8.14-1.43.29q-.846.193-1.712.25a11.1 11.1 0 0 1-4.362-.49a7.4 7.4 0 0 1-2.001-.95a7.5 7.5 0 0 1-1.591-1.382a7.58 7.58 0 0 1-1.21-7.394A9.3 9.3 0 0 1 8.46 1.998a11.7 11.7 0 0 1 2.281-.71a7.5 7.5 0 0 1 2.292-.16c2.097.288 4 1.383 5.303 3.051a9.45 9.45 0 0 1 2.06 5.893a11 11 0 0 1-.31 2.462a6.3 6.3 0 0 1-1 2.231a13 13 0 0 1-1.48 1.441a9 9 0 0 0-1.281.84a.34.34 0 0 0 .36.49a9.8 9.8 0 0 0 3.002-2.34c.55-.73.94-1.57 1.14-2.462a11.3 11.3 0 0 0 .39-2.652a10.2 10.2 0 0 0-2.14-6.493A9 9 0 0 0 13.202.057a8.6 8.6 0 0 0-2.672.11a13 13 0 0 0-2.5.77a10.3 10.3 0 0 0-5.633 6.434a8.44 8.44 0 0 0 1.63 8.285a10.2 10.2 0 0 0 4.003 2.491a14.1 14.1 0 0 0 4.663.4a12.4 12.4 0 0 0 1.8-.3q.637-.24 1.231-.57" />
                  <path d="M22.038 21.089a3 3 0 0 0-.66-1.331c-.41-.49-.951-.88-1.411-1.33s-.74-.761-1.121-1.121a2.5 2.5 0 0 0-.36-.29a.35.35 0 0 0-.58.37q.24.189.43.43c.35.38.68.8 1 1.18s.89.861 1.261 1.351c.204.27.338.587.39.92a1.4 1.4 0 0 1-.86 1.372a1.58 1.58 0 0 1-1.671.08a3 3 0 0 1-.57-.58a10.5 10.5 0 0 1-.721-1.241c-.36-.68-.72-1.361-1-2.072c-.15-.34-.11-.23-.25-.58s-.661 0-.551.26c.15.47.12.49.29.95c.23.621.48 1.232.75 1.842q.293.724.681 1.4c.205.336.465.634.77.881a2.63 2.63 0 0 0 2.852 0a2.43 2.43 0 0 0 1.33-2.491m-9.745-7.594a.28.28 0 0 0-.168-.278a.3.3 0 0 0-.112-.023a.29.29 0 0 0-.274.17a.3.3 0 0 0-.026.11c-.09.36-.2.7-.26 1.081a3 3 0 0 0 0 .92c.05.37.13.721.21 1.081a.33.33 0 1 0 .66 0c0-.36.13-.7.17-1.06a4 4 0 0 0 0-.46q.015-.226 0-.45c-.03-.391-.13-.731-.2-1.091" />
                </g>
              </svg>
            }
          />

          <NavLink
            to="/taratrabaho/resumes"
            itemKey="resumes"
            label="Resumes"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 4.5A1.25 1.25 0 1 0 8 2a1.25 1.25 0 0 0 0 2.5" />
                <path fill="currentColor" d="M8 4.5c.597 0 1.13.382 1.32.949l.087.26a.22.22 0 0 1-.21.291h-2.39a.222.222 0 0 1-.21-.291l.087-.26a1.39 1.39 0 0 1 1.32-.949zm-3 4a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m.5 1.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z" />
                <path fill="currentColor" fillRule="evenodd" d="M2.33 1.64c-.327.642-.327 1.48-.327 3.16v6.4c0 1.68 0 2.52.327 3.16a3.02 3.02 0 0 0 1.31 1.31c.642.327 1.48.327 3.16.327h2.4c1.68 0 2.52 0 3.16-.327a3 3 0 0 0 1.31-1.31c.327-.642.327-1.48.327-3.16V4.8c0-1.68 0-2.52-.327-3.16A3 3 0 0 0 12.36.33C11.718.003 10.88.003 9.2.003H6.8c-1.68 0-2.52 0-3.16.327a3.02 3.02 0 0 0-1.31 1.31m6.87-.638H6.8c-.857 0-1.44 0-1.89.038c-.438.035-.663.1-.819.18a2 2 0 0 0-.874.874c-.08.156-.145.38-.18.819c-.037.45-.038 1.03-.038 1.89v6.4c0 .857.001 1.44.038 1.89c.036.438.101.663.18.819c.192.376.498.682.874.874c.156.08.381.145.819.18c.45.036 1.03.037 1.89.037h2.4c.857 0 1.44 0 1.89-.037c.438-.036.663-.101.819-.18c.376-.192.682-.498.874-.874c.08-.156.145-.381.18-.82c.037-.45.038-1.03.038-1.89v-6.4c0-.856-.001-1.44-.038-1.89c-.036-.437-.101-.662-.18-.818a2 2 0 0 0-.874-.874c-.156-.08-.381-.145-.819-.18c-.45-.037-1.03-.038-1.89-.038" clipRule="evenodd" />
              </svg>
            }
          />

          <NavLink
            to="/taratrabaho/jobs"
            itemKey="jobs"
            label="Job Listings"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                <path fill="currentColor" d="M10 2h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8c0-1.11.89-2 2-2h4V4c0-1.11.89-2 2-2m4 4V4h-4v2zm-7 9v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2z"/>
              </svg>
            }
          />
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

const Home = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile toggle button */}
      <div className="fixed top-3 left-3 xl:hidden z-50">
        <IconButton 
          onClick={() => setOpen(true)}
          size="small"
          sx={{
            backgroundColor: '#FBDA23',
            padding: '8px',
            '&:hover': {
              backgroundColor: '#FFE55C',
              transform: 'scale(1.05)',
            },
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
          }}
        >
          <MenuIcon sx={{ 
            color: '#272343', 
            fontSize: '1.3rem' 
          }} />
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
        PaperProps={{
          style: { 
            width: "280px", 
            backgroundColor: "transparent",
            boxShadow: 'none',
          },
        }}
      >
        <SidebarContent onClose={() => setOpen(false)} isMobile={true} />
      </Drawer>

      {/* Main Content */}
      <main className="flex-1 pl-5 pr-3 bg-gray-50 overflow-y-auto">
          <Outlet />
      </main>
    </div>
  );
};

export default Home;