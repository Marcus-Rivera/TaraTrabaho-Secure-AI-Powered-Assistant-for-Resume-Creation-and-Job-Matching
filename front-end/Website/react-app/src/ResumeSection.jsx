import React, { useState, useEffect } from "react";
import DescriptionIcon from "@mui/icons-material/Description";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import { useSessionCheck } from "../useSessionCheck";
import SessionExpiredModal from "../SessionExpiredModal";
import { Alert } from "@mui/material";

const ResumeSection = () => {
  const { userData, loading, sessionError } = useSessionCheck();
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewResume, setPreviewResume] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { resumeId, filename }

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  // Fetch resumes from database
  useEffect(() => {
    const fetchResumes = async () => {
      if (!userData?.email) return;

      try {
        setIsLoading(true);
        
        // First, get user_id from profile
        const profileResponse = await fetch(`/api/profile/${userData.email}`);
        const userProfile = await profileResponse.json();
        
        if (!userProfile || !userProfile.user_id) {
          throw new Error("Could not retrieve user ID");
        }

        // Then fetch resumes using user_id
        const resumeResponse = await fetch(`/api/resume/user/${userProfile.user_id}`);
        const resumeData = await resumeResponse.json();

        if (resumeResponse.ok) {
          setResumes(resumeData);
        } else {
          throw new Error(resumeData.error || "Failed to fetch resumes");
        }
      } catch (err) {
        console.error("Error fetching resumes:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumes();
  }, [userData]);

  // Filter resumes based on search term
  const filteredResumes = resumes.filter((resume) =>
    resume.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMenu = (index) => {
    setOpenMenu(openMenu === index ? null : index);
  };

  const handlePreview = async (resumeId, filename) => {
    try {
      setPreviewLoading(true);
      const response = await fetch(`/api/resume/download/${resumeId}`);
      
      if (!response.ok) {
        throw new Error("Failed to load resume preview");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      setPreviewResume({ url, filename });
      setOpenMenu(null);
    } catch (err) {
      console.error("Error loading preview:", err);
      alert("Failed to load resume preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewResume?.url) {
      window.URL.revokeObjectURL(previewResume.url);
    }
    setPreviewResume(null);
  };

  const handleDownload = async (resumeId, filename) => {
    try {
      const response = await fetch(`/api/resume/download/${resumeId}`);
      
      if (!response.ok) {
        throw new Error("Failed to download resume");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setOpenMenu(null);
    } catch (err) {
      console.error("Error downloading resume:", err);
      alert("Failed to download resume");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const response = await fetch(`/api/resume/${deleteConfirm.resumeId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        // Remove deleted resume from state
        setResumes(resumes.filter(resume => resume.resume_id !== deleteConfirm.resumeId));
        setOpenMenu(null);
        setDeleteConfirm(null);
        
        // Show success alert
        setSuccessMsg("Resume deleted successfully!");
        setShowSuccessAlert(true);
        setTimeout(() => setShowSuccessAlert(false), 3000);
      } else {
        throw new Error(data.error || "Failed to delete resume");
      }
    } catch (err) {
      console.error("Error deleting resume:", err);
      setError("Failed to delete resume");
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Loading state
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h2>Loading resumes...</h2>
      </div>
    );
  }

  // Session error
  if (sessionError) return <SessionExpiredModal />;

  // User not logged in
  if (!userData) return null;

  

  return (
    <div className="flex-1 p-5 pt-10">
      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Alert severity="success">{successMsg}</Alert>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-[#272343]">Resumes</h2>
          <p className="text-[#272343]/77 text-sm">
            {resumes.length > 0 
              ? `You have ${resumes.length} resume${resumes.length > 1 ? 's' : ''} available!`
              : "No resumes yet. Create one in the Career Bot!"}
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center border border-black px-1 lg:px-3 py-2 rounded">
          <input
            type="text"
            placeholder="Search"
            className="outline-none text-sm flex-1 pr-2 font-bold text-[#272343]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SearchIcon className="text-gray-700 flex-shrink-0" />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Resume List */}
      <div className="flex flex-col gap-4">
        {filteredResumes.length > 0 ? (
          filteredResumes.map((resume, index) => (
            <div
              key={resume.resume_id}
              className="flex justify-between items-center bg-[#E6F6F6] border rounded px-4 py-3 relative transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <DescriptionIcon className="text-black" />
                <span className="font-semibold text-sm md:text-lg text-[#272343]">
                  {resume.filename}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {formatDate(resume.created_at)}
                </span>

                {/* Triple dot menu */}
                <button onClick={() => toggleMenu(index)}>
                  <MoreVertIcon className="text-gray-700 cursor-pointer" />
                </button>

                {/* Dropdown Menu */}
                {openMenu === index && (
                  <div className="absolute right-4 top-12 bg-white shadow-lg border rounded w-32 z-10">
                    <button 
                      onClick={() => handlePreview(resume.resume_id, resume.filename)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-gray-100 cursor-pointer"
                    >
                      <VisibilityIcon fontSize="small" />
                      Preview
                    </button>
                    <button 
                      onClick={() => handleDownload(resume.resume_id, resume.filename)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-green-500 hover:bg-gray-100 cursor-pointer"
                    >
                      <DownloadIcon fontSize="small" />
                      Download
                    </button>
                    <button 
                      onClick={() => {
                        setDeleteConfirm({ 
                          resumeId: resume.resume_id, 
                          filename: resume.filename 
                        });
                        setOpenMenu(null);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">
            {searchTerm ? "No resumes found matching your search." : "No resumes found. Create one in the Career Bot section!"}
          </p>
        )}
      </div>

      {/* Preview Modal */}
      {previewResume && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b bg-[#272343]">
              <h3 className="text-lg font-semibold text-white truncate pr-4">
                {previewResume.filename}
              </h3>
              <button
                onClick={closePreview}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={previewResume.url}
                className="w-full h-full"
                title="Resume Preview"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={closePreview}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={() => handleDownload(
                  resumes.find(r => r.filename === previewResume.filename)?.resume_id,
                  previewResume.filename
                )}
                className="px-4 py-2 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-1"
              >
                <DownloadIcon fontSize="small" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Loading Indicator */}
      {previewLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <p className="text-gray-700">Loading preview...</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            {/* Warning Icon */}
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-6 h-6 text-red-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
              Delete Resume?
            </h3>

            {/* Message */}
            <p className="text-center text-gray-600 mb-2">
              Are you sure you want to delete
            </p>
            <p className="text-center font-semibold text-gray-900 mb-4 break-words px-2">
              "{deleteConfirm.filename}"
            </p>
            <p className="text-center text-sm text-red-600 mb-6">
              This action cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeSection;