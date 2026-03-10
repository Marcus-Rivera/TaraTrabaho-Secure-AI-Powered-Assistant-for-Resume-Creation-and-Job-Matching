import React, { useState, useEffect, useRef } from "react";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import BadgeIcon from "@mui/icons-material/Badge";
import SchoolIcon from "@mui/icons-material/School";
import { Alert } from "@mui/material";
import SkillsSection from "./SkillsSections";
import SessionExpiredModal from "../SessionExpiredModal";
import { useSessionCheck } from "../useSessionCheck";
import { API_BASE } from "./config/api";

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

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 16);
  const maxDateString = maxDate.toISOString().split("T")[0];

  const [originalData, setOriginalData] = useState({});

  const loadProfilePicture = (userId) => {
    const cachedImage = sessionStorage.getItem(`profileImage_${userId}`);
    if (cachedImage && cachedImage.startsWith("data:image")) {
      setProfileImage(cachedImage);
      return;
    }

    fetch(`${API_BASE}/api/profile-picture/${userId}`)
      .then((res) => {
        if (res.ok) return res.blob();
        throw new Error("Profile picture not found");
      })
      .then((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result;
            setProfileImage(base64data);
            sessionStorage.setItem(`profileImage_${userId}`, base64data);
          };
          reader.readAsDataURL(blob);
        }
      })
      .catch((err) => {
        console.error("Error loading profile picture:", err);
        sessionStorage.removeItem(`profileImage_${userId}`);
      });
  };

  useEffect(() => {
    if (userData?.email) {
      fetch(`${API_BASE}/api/profile/${userData.email}`)
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
            if (data.user_id) loadProfilePicture(data.user_id);
          }
        })
        .catch((err) => console.error("Error loading profile:", err));
    }
  }, [userData]);

  const validateBirthday = (birthday) => {
    if (!birthday) return "Birthday is required";
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age < 16) return "You must be at least 16 years old";
    if (birthDate > today) return "Birthday cannot be in the future";
    return "";
  };

  const validatePhone = (phone) => {
    if (!phone || !phone.trim()) return "";
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const phoneRegex = /^(09\d{9}|(\+639)\d{9})$/;
    if (!phoneRegex.test(cleanPhone)) return "Invalid Philippine phone number";
    return "";
  };

  const validateName = (name, fieldName) => {
    if (!name || !name.trim()) return `${fieldName} is required`;
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(name)) return `${fieldName} can only contain letters`;
    return "";
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAlertType("error");
      setAlertMsg("Please upload an image file");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAlertType("error");
      setAlertMsg("Image size must be less than 5MB");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    setUploading(true);

    try {
      const userRes = await fetch(`${API_BASE}/api/profile/${userData.email}`);
      const userProfile = await userRes.json();

      if (!userProfile.user_id) throw new Error("User ID not found");

      const formDataToSend = new FormData();
      formDataToSend.append("profilePicture", file);
      formDataToSend.append("userId", userProfile.user_id);

      const response = await fetch(`${API_BASE}/api/profile-picture/upload`, {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          setProfileImage(base64data);
          sessionStorage.setItem(`profileImage_${userProfile.user_id}`, base64data);
          window.dispatchEvent(new CustomEvent("profilePictureUpdated", { detail: { userId: userProfile.user_id } }));
          setAlertType("success");
          setAlertMsg("Profile picture updated successfully");
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 3000);
        };
        reader.readAsDataURL(file);
      } else {
        setAlertType("error");
        setAlertMsg("Failed to upload profile picture");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setAlertType("error");
      setAlertMsg("Error uploading profile picture");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "phone" ? String(value) : value }));
  };

  const handleEdit = () => setIsEditing(true);

  const handleSave = async () => {
    const errors = [
      validateName(formData.firstname, "First name"),
      validateName(formData.lastname, "Last name"),
      validateBirthday(formData.birthday),
      validatePhone(formData.phone),
    ].filter(Boolean);

    if (errors.length > 0) {
      setAlertType("error");
      setAlertMsg(errors[0]);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/profile/${userData.email}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok) {
        setAlertType("success");
        setAlertMsg("Profile updated successfully");
        const updatedUser = { ...formData, email: userData.email };
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

  if (loading) {
    return (
      <main className="flex-1 p-4 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-10 bg-slate-200 rounded-lg w-48 mx-auto mb-8"></div>
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center md:w-1/3">
                <div className="w-44 h-44 bg-slate-200 rounded-full"></div>
                <div className="h-6 bg-slate-200 rounded w-32 mt-4"></div>
                <div className="h-4 bg-slate-200 rounded w-40 mt-2"></div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-200 rounded-lg"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (sessionError) return <SessionExpiredModal />;
  if (!userData) return null;

  const inputBase = "w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-slate-700 text-sm";
  const inputClassName = isEditing
    ? `${inputBase} border-slate-200 bg-white hover:border-amber-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 focus:outline-none`
    : `${inputBase} border-transparent bg-slate-100 cursor-not-allowed`;

  const textareaClassName = isEditing
    ? `${inputBase} border-slate-200 bg-white hover:border-amber-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 focus:outline-none resize-none`
    : `${inputBase} border-transparent bg-slate-100 cursor-not-allowed resize-none`;

  return (
    <main className="flex-1 p-4 lg:p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen overflow-y-auto">
      {showAlert && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
          <Alert
            severity={alertType}
            sx={{
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
              fontWeight: 500,
            }}
          >
            {alertMsg}
          </Alert>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">My Profile</h1>
          <p className="text-slate-500 mt-2">Manage your personal information and preferences</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
          {isEditing && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-amber-700">
                  You are currently editing your profile
                </span>
              </div>
            </div>
          )}

          <div className="p-6 lg:p-10">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Left Column - Profile Card */}
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                  {/* Header Background */}
                  <div className="h-24 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
                  </div>

                  {/* Profile Picture */}
                  <div className="relative -mt-16 flex justify-center">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full bg-white p-1 shadow-xl">
                        <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                          {profileImage ? (
                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <PersonIcon sx={{ fontSize: 56, color: "#cbd5e1" }} />
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-1 right-1 w-9 h-9 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 border-2 border-white"
                        aria-label="Upload profile picture"
                      >
                        <PhotoCameraIcon sx={{ fontSize: 18, color: "#ffffff" }} />
                      </button>

                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-32 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"></div>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Name and Email */}
                  <div className="text-center px-6 pt-4 pb-5">
                    <h2 className="text-xl font-bold text-slate-800">
                      {formData.firstname
                        ? `${formData.firstname} ${formData.lastname}`.trim()
                        : userData?.name || "Your Name"}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">{userData?.email || "email@example.com"}</p>
                  </div>

                  {/* Skills Section */}
                  <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Skills</h4>
                    <SkillsSection userId={userData?.id || userData?.user_id} />
                  </div>
                </div>
              </div>

              {/* Right Column - Form */}
              <div className="flex-1 space-y-8">
                {/* Basic Information */}
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <BadgeIcon sx={{ color: "#f59e0b" }} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Basic Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">First Name</label>
                      <input
                        type="text"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="Enter your first name"
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Last Name</label>
                      <input
                        type="text"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="Enter your last name"
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Gender</label>
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
                      <label className="block text-sm font-medium text-slate-600 mb-2">Birthday</label>
                      <input
                        type="date"
                        name="birthday"
                        value={formData.birthday}
                        max={maxDateString}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Address</label>
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
                      <label className="block text-sm font-medium text-slate-600 mb-2">Phone Number</label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        maxLength="13"
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="09123456789"
                        className={inputClassName}
                      />
                    </div>
                  </div>
                </section>

                {/* Bio & Certification */}
                <section>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Bio</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className={textareaClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Certifications</label>
                      <textarea
                        name="certification"
                        value={formData.certification}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="List your certifications..."
                        rows={4}
                        className={textareaClassName}
                      />
                    </div>
                  </div>
                </section>

                {/* Education */}
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <SchoolIcon sx={{ color: "#3b82f6" }} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Education</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Senior High School</label>
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
                      <label className="block text-sm font-medium text-slate-600 mb-2">Undergraduate</label>
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
                      <label className="block text-sm font-medium text-slate-600 mb-2">Postgraduate</label>
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
                </section>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <SaveIcon sx={{ fontSize: 20 }} />
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-200"
                      >
                        <CancelIcon sx={{ fontSize: 20 }} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEdit}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-semibold rounded-xl shadow-lg shadow-slate-300 hover:shadow-xl hover:shadow-slate-400 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <EditIcon sx={{ fontSize: 20 }} />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProfileSection;