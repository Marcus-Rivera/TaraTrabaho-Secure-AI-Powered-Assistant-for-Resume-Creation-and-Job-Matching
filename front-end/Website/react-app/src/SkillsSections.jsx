import React, { useState, useEffect } from "react";
import SessionExpiredModal from "../SessionExpiredModal";
import { useSessionCheck } from "../useSessionCheck";
import { Snackbar, Alert } from "@mui/material"; // ✅ MUI notification

const SkillsSection = ({ userId }) => {
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notif, setNotif] = useState({ open: false, message: "", type: "info" });

  const { userData, sessionError } = useSessionCheck();

  // ✅ FETCH skills when userId is available
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchSkills();
  }, [userId]);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/skills/${userId}`);
      const data = await response.json();

      if (data.success) {
        setSkills(
          data.skills.map((s) => ({
            id: s.skill_id,
            name: s.skill_name,
          }))
        );
        setError(null);
      } else {
        console.error("Failed to load skills:", data.error);
        setSkills([]);
      }
    } catch (err) {
      console.error("Error fetching skills:", err);
      setSkills([]);
      setError("Could not connect to server. You can still add skills.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADD new skill
  const handleAddSkill = async () => {
    if (newSkill.trim() === "") return;

    const isDuplicate = skills.some(
      (s) => s.name.toLowerCase() === newSkill.trim().toLowerCase()
    );

    if (isDuplicate) {
      setNotif({
        open: true,
        message: "This skill already exists!",
        type: "warning",
      });
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          skillName: newSkill.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSkills([
          ...skills,
          { id: data.skill.skill_id, name: data.skill.skill_name },
        ]);
        setNewSkill("");
        setNotif({
          open: true,
          message: "Skill added successfully!",
          type: "success",
        });
      } else {
        setNotif({
          open: true,
          message: data.error || "Failed to add skill",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Error adding skill:", err);
      setNotif({
        open: true,
        message: "Error adding skill",
        type: "error",
      });
    }
  };

  // ✅ REMOVE skill
  const handleRemoveSkill = async (skillToRemove) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/skills/${skillToRemove.id}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (data.success) {
        setSkills(skills.filter((s) => s.id !== skillToRemove.id));
        setNotif({
          open: true,
          message: "Skill removed successfully!",
          type: "info",
        });
      } else {
        setNotif({
          open: true,
          message: data.error || "Failed to remove skill",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Error removing skill:", err);
      setNotif({
        open: true,
        message: "Error removing skill",
        type: "error",
      });
    }
  };

  // ✅ Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddSkill();
    }
  };

  if (loading) {
    return (
      <div className="mt-6 w-full">
        <h3 className="font-bold italic">Skills</h3>
        <div className="flex items-center gap-2 mt-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#272343]"></div>
          <p className="text-sm text-gray-500">Loading skills...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mt-6 w-full">
        <h3 className="font-bold italic">Skills</h3>
        <p className="text-sm text-red-500 mt-2">
          ⚠️ User ID not found. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 w-full">
      <h3 className="font-bold italic">Skills</h3>

      {/* 🔔 Snackbar Notification */}
      <Snackbar
        open={notif.open}
        autoHideDuration={3000}
        onClose={() => setNotif({ ...notif, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setNotif({ ...notif, open: false })}
          severity={notif.type}
          sx={{
            width: "100%",
            fontSize: "0.9rem",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          {notif.message}
        </Alert>
      </Snackbar>

      {/* Error Message */}
      {error && (
        <div className="text-red-500 text-xs mt-1 bg-red-50 px-2 py-1 rounded">
          {error}
        </div>
      )}

      {/* Skills List */}
      <div className="flex flex-wrap gap-2 mt-2">
        {skills.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No skills added yet</p>
        ) : (
          skills.map((skill) => (
            <span
              key={skill.id}
              className="px-3 py-1 bg-white rounded shadow text-sm flex items-center gap-2 hover:shadow-md transition-shadow"
            >
              {skill.name}
              <button
                onClick={() => handleRemoveSkill(skill)}
                className="text-red-500 font-bold hover:text-red-700 hover:scale-110 transition-transform"
                title="Remove skill"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      {/* Add New Skill */}
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter skill (e.g., React, Python)"
          className="border px-2 py-1 text-sm flex-1 rounded focus:outline-none focus:ring-2 focus:ring-[#FBDA23]"
          maxLength={50}
        />
        <button
          onClick={handleAddSkill}
          disabled={!newSkill.trim()}
          className="px-3 py-1 bg-white rounded shadow text-sm font-bold whitespace-nowrap cursor-pointer hover:bg-[#FBDA23] hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-white"
        >
          + Add
        </button>
      </div>

      {skills.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {skills.length} skill{skills.length !== 1 ? "s" : ""} added
        </p>
      )}
    </div>
  );
};

export default SkillsSection;
