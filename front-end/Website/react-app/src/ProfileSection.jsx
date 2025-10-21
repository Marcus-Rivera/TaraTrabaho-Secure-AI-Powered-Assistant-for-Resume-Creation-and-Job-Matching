import React, { useState, useEffect, useRef } from "react";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { Alert } from "@mui/material";
import SkillsSection from "./SkillsSections";
import SessionExpiredModal from "../SessionExpiredModal";
import { useSessionCheck } from "../useSessionCheck";  

const ProfileSection = () => {
  const { userData, loading, sessionError } = useSessionCheck();
  const [isEditing, setIsEditing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState("success");

  const fileInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    gender: "",
    birthday: "",
    address: "",
    phone: "",
    bio: "",
    certification: "",
    seniorHigh: "",
    undergraduate: "",
    postgraduate: "",
  });

  const [originalData, setOriginalData] = useState({});

  // ✅ Define loadProfilePicture BEFORE useEffect
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

  // Load user profile from backend
  useEffect(() => {
    if (userData?.email) {
      fetch(`http://localhost:5000/api/profile/${userData.email}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setFormData({
              firstname: data.firstname || "",
              lastname: data.lastname || "",
              gender: data.gender || "",
              birthday: data.birthday || "",
              address: data.address || "",
              phone: data.phone || "",
              bio: data.bio || "",
              certification: data.certification || "",
              seniorHigh: data.seniorHigh || "",
              undergraduate: data.undergraduate || "",
              postgraduate: data.postgraduate || "",
            });
            setOriginalData(data);
            
            // ✅ Load profile picture here too
            if (data.user_id) {
              loadProfilePicture(data.user_id);
            }
          }
        })
        .catch((err) => console.error("Error loading profile:", err));
    }
  }, [userData]);

  // Image upload function
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAlertType("error");
      setAlertMsg("Please upload an image file");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAlertType("error");
      setAlertMsg("Image size must be less than 5MB");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    setUploading(true);

    // Get user_id from backend
    try {
      const userRes = await fetch(`http://localhost:5000/api/profile/${userData.email}`);
      const userProfile = await userRes.json();
      
      if (!userProfile.user_id) {
        throw new Error("User ID not found");
      }

      const formDataToSend = new FormData();
      formDataToSend.append('profilePicture', file);
      formDataToSend.append('userId', userProfile.user_id);

      const response = await fetch('http://localhost:5000/api/profile-picture/upload', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        // Update profile picture display
        const imageUrl = URL.createObjectURL(file);
        setProfileImage(imageUrl);
        
        // ✅ DISPATCH EVENT TO UPDATE SIDEBAR
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', { 
          detail: { userId: userProfile.user_id } 
        }));
        
        setAlertType("success");
        setAlertMsg("Profile picture updated successfully!");
      } else {
        setAlertType("error");
        setAlertMsg("Failed to upload profile picture");
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setAlertType("error");
      setAlertMsg("Error uploading profile picture");
    } finally {
      setUploading(false);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/profile/${userData.email}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const result = await res.json();
      if (res.ok) {
        setAlertType("success");
        setAlertMsg("Profile updated successfully!");
        const updatedUser = {
        ...formData,
        email: userData.email,
        };
        sessionStorage.setItem("userData", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("userDataUpdated"));
        setOriginalData(formData);
        setIsEditing(false);
      } else {
        setAlertType("error");
        setAlertMsg(result.message || "Update failed");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setAlertType("error");
      setAlertMsg("Error saving profile");
    } finally {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  // ✅ Loading and error checks AFTER all functions are defined
  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen text-[#272343]">
        <h2>Loading profile...</h2>
      </main>
    );
  }

  if (sessionError) return <SessionExpiredModal />;

  if (!userData) return null;

  const inputClassName = isEditing
    ? "w-full border border-gray-300 px-3 py-2 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FBDA23] transition-all"
    : "w-full border border-gray-300 px-3 py-2 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed";

  const textareaClassName = isEditing
    ? "w-full border border-gray-300 px-3 py-2 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FBDA23] transition-all resize-none"
    : "w-full border border-gray-300 px-3 py-2 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed resize-none";

  return (
    <main className="flex-1 lg:p-8 bg-white overflow-y-auto">
      {/* Alert */}
      {showAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Alert severity={alertType}>{alertMsg}</Alert>
        </div>
      )}

      <h1 className="text-2xl font-bold text-center text-[#272343] mb-6">
        PROFILE
      </h1>

      <div className="bg-[rgba(251,218,35,0.39)] rounded-[40px] p-8 flex flex-col md:flex-row gap-8">
        {/* Left Profile Info */}
        <div className="flex flex-col items-center w-full md:w-1/3">
          {/* ✅ Updated Profile Picture Section */}
          <div className="relative group">
            <div className="w-40 h-40 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <PersonIcon className="text-gray-500" style={{ fontSize: 80 }} />
              )}
            </div>
            
            {/* Upload Button Overlay */}
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <PhotoCameraIcon sx={{ color: 'white', fontSize: '2.5rem' }} />
            </div>
            
            {/* Upload Indicator */}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
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
          </div>

          <h2 className="mt-4 text-xl text-[#272343] font-bold">
            {formData.firstname && formData.lastname
              ? `${formData.firstname} ${formData.lastname}`
              : userData?.name || "Your Name"}
          </h2>
          <p className="text-sm text-[#272343] font-semibold">
            {userData?.email || "your.email@example.com"}
          </p>

          {/* Skills Section */}
          <SkillsSection userId={userData?.id || userData?.user_id} />
        </div>

        {/* Right Form */}
        <div className="flex-1">
          {isEditing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <EditIcon className="text-blue-600" />
              <span className="text-sm text-blue-700 font-semibold">
                Editing Mode - Make your changes and click Save
              </span>
            </div>
          )}

          <h3 className="font-bold italic text-lg text-[#272343]">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-[#272343]">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Firstname:
              </label>
              <input
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter your firstname"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Lastname:
              </label>
              <input
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter your lastname"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Gender:</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={!isEditing}
                className={inputClassName}
              >
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Birthday:
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                disabled={!isEditing}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Address:
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter your address"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Phone #:</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g., +63 912 345 6789"
                className={inputClassName}
              />
            </div>
          </div>

          {/* Bio & Certification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-[#272343]">
            <div>
              <h3 className="font-bold italic mb-1">BIO</h3>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Tell us about yourself..."
                className={`${textareaClassName} h-24`}
              />
            </div>
            <div>
              <h3 className="font-bold italic mb-1">Certification</h3>
              <textarea
                name="certification"
                value={formData.certification}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="List your certifications..."
                className={`${textareaClassName} h-24`}
              />
            </div>
          </div>

          {/* Degree */}
          <h3 className="font-bold italic mt-6 mb-1">Degree</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Senior HighSchool:
              </label>
              <input
                type="text"
                name="seniorHigh"
                value={formData.seniorHigh}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="School name"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                UnderGraduate:
              </label>
              <input
                type="text"
                name="undergraduate"
                value={formData.undergraduate}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Degree & University"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                PostGraduate:
              </label>
              <input
                type="text"
                name="postgraduate"
                value={formData.postgraduate}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Degree & University"
                className={inputClassName}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-6">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all hover:scale-105 font-semibold cursor-pointer"
                >
                  <SaveIcon />
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all hover:scale-105 font-semibold cursor-pointer"
                >
                  <CancelIcon />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-6 py-2 bg-[#272343] text-white rounded-xl hover:bg-[#1b163e] transition-all hover:scale-105 font-semibold cursor-pointer"
              >
                <EditIcon />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProfileSection;
