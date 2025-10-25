import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // Add this import at the very top
import { API_BASE } from "./config/api";

const JobListing = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("All Types");
  const [savedJobs, setSavedJobs] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
  const token = sessionStorage.getItem('token');
  if (token) {
    try {
      const decoded = jwtDecode(token);
      setCurrentUserId(decoded.id);
      console.log('✅ Current user ID:', decoded.id);
    } catch (error) {
      console.error('❌ Error decoding token:', error);
    }
  }
}, []);

  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    location: "",
    min_salary: "",
    max_salary: "",
    vacantleft: 1,
    company: "",
    company_email: "",
    type: "Full-time",
    posted: "",
    tags: "",
    remote: 0
  });

  const [editingJob, setEditingJob] = useState({
    job_id: "",
    title: "",
    description: "",
    location: "",
    min_salary: "",
    max_salary: "",
    vacantleft: 1,
    company: "",
    company_email: "",
    type: "Full-time",
    posted: "",
    tags: "",
    remote: 0
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch jobs from backend on component mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/jobs`);
        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }
        const data = await response.json();

        // Format data for frontend consistency
        const formattedJobs = data.map((job) => ({
          job_id: job.job_id,
          title: job.title,
          description: job.description,
          location: job.location,
          min_salary: job.min_salary,
          max_salary: job.max_salary,
          vacantleft: job.vacantleft,
          company: job.company,
          company_email: job.company_email || "",
          type: job.type,
          posted: job.posted,
          tags: job.tags ? job.tags.split(',').map(tag => tag.trim()) : [],
          remote: job.remote,
          isSaved: false
        }));

        setJobs(formattedJobs);
        setFilteredJobs(formattedJobs);
        
        // Load saved jobs from localStorage
        
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to load job listings. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Fetch admin's saved jobs
  useEffect(() => {
    const fetchAdminSavedJobs = async () => {
      if (!currentUserId) {
        console.log('⏳ Waiting for user ID...');
        return;
      }

      if (jobs.length === 0) {
        console.log('⏳ Waiting for jobs to load...');
        return;
      }

      try {
        console.log('🔍 Fetching saved jobs for user:', currentUserId);

        const response = await fetch(`${API_BASE}/api/admin-saved-jobs/${currentUserId}`);
        if (!response.ok) throw new Error('Failed to fetch saved jobs');
        
        const data = await response.json();
        console.log('📦 Saved jobs response:', data);
        
        if (data.success) {
          const savedJobIds = data.savedJobs.map(sj => sj.job_id);
          console.log('✅ Saved job IDs:', savedJobIds);
          setSavedJobs(savedJobIds);
          
          // Update jobs with saved status
          setJobs(prevJobs => prevJobs.map(job => ({
            ...job,
            isSaved: savedJobIds.includes(job.job_id)
          })));

          setFilteredJobs(prevJobs => prevJobs.map(job => ({
            ...job,
            isSaved: savedJobIds.includes(job.job_id)
          })));
        }
      } catch (error) {
        console.error('❌ Error fetching admin saved jobs:', error);
      }
    };

    fetchAdminSavedJobs();
  }, [currentUserId, jobs.length]); // Dependencies: currentUserId and jobs.length

  // Filter jobs based on search, filters, and active tab
  useEffect(() => {
    let filtered = jobs;

    // Tab filter - ONLY filter if we're on the saved tab
    if (activeTab === "saved") {
      filtered = filtered.filter(job => {
        const isSavedInArray = savedJobs.includes(job.job_id);
        const isSavedInJob = job.isSaved === true;
        
        // Debug logging
        if (isSavedInArray || isSavedInJob) {
          console.log('📌 Job is saved:', job.job_id, job.title);
        }
        
        return isSavedInArray || isSavedInJob;
      });
      console.log('🔍 Filtered saved jobs count:', filtered.length);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Location filter
    if (locationFilter) {
      filtered = filtered.filter(job =>
        job.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Job type filter
    if (jobTypeFilter !== "All Types") {
      filtered = filtered.filter(job => job.type === jobTypeFilter);
    }

    setFilteredJobs(filtered);
  }, [searchTerm, locationFilter, jobTypeFilter, jobs, activeTab, savedJobs]);
  
  
  // Helper formatters
  const formatSalary = (min, max) =>
    `₱${parseInt(min).toLocaleString()} - ₱${parseInt(max).toLocaleString()}`;

  const formatVacantLeft = (v) => parseInt(v, 10);

  // Toggle save job for admin
  const toggleSaveJob = async (jobId) => {
    if (!currentUserId) {
      console.error('❌ No user ID found');
      setErrors({ general: 'Please log in to save jobs.' });
      return;
    }

    try {
      console.log('🔄 Toggling save for job:', jobId, 'User:', currentUserId);

      const isCurrentlySaved = savedJobs.includes(jobId);

      if (isCurrentlySaved) {
        console.log('🗑️ Unsaving job...');
        const response = await fetch(
          `/api/admin-saved-jobs/${currentUserId}/${jobId}`,
          { method: 'DELETE' }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to unsave job');
        }
        
        console.log('✅ Job unsaved successfully');
        setSavedJobs(prev => prev.filter(id => id !== jobId));
        setSuccessMessage('Job removed from saved!');
      } else {
        console.log('💾 Saving job...');
        const response = await fetch('/api/admin-saved-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, jobId })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save job');
        }
        
        console.log('✅ Job saved successfully');
        setSavedJobs(prev => [...prev, jobId]);
        setSuccessMessage('Job saved successfully!');
      }

      const updateSavedStatus = (jobs) => jobs.map(job =>
        job.job_id === jobId
          ? { ...job, isSaved: !isCurrentlySaved }
          : job
      );

      setJobs(updateSavedStatus);
      setFilteredJobs(updateSavedStatus);

      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('❌ Error toggling save job:', error);
      setErrors({ general: error.message || 'Failed to save/unsave job. Please try again.' });
      setTimeout(() => setErrors({}), 3000);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setLocationFilter("");
    setJobTypeFilter("All Types");
  };

  // Switch between All Jobs and Saved Jobs tabs
  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-600">Loading jobs...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-600 font-medium">{error}</div>
    );
  }

  const openAddModal = () => {
    setShowAddModal(true);
    setErrors({});
    setSuccessMessage("");
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewJob({ 
      title: "",
      description: "",
      location: "",
      min_salary: "",
      max_salary: "",
      vacantleft: 1,
      company: "",
      company_email: "",
      type: "Full-time",
      posted: "",
      tags: "",
      remote: 0
    });
    setErrors({});
    setSuccessMessage("");
  };

  // Open view modal
  const openViewModal = (job) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  // Close view modal
  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedJob(null);
  };

  // Open edit modal and populate with job data
  const openEditModal = (job) => {
    setEditingJob({
      job_id: job.job_id,
      title: job.title,
      description: job.description,
      location: job.location,
      min_salary: job.min_salary.toString(),
      max_salary: job.max_salary.toString(),
      vacantleft: job.vacantleft,
      company: job.company,
      company_email: job.company_email || "",  
      type: job.type,
      posted: job.posted,
      tags: Array.isArray(job.tags) ? job.tags.join(', ') : job.tags,
      remote: job.remote
    });
    setShowEditModal(true);
    setErrors({});
    setSuccessMessage("");
  };

  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingJob({
      job_id: "",
      title: "",
      description: "",
      location: "",
      min_salary: "",
      max_salary: "",
      vacantleft: 1,
      company: "",
      company_email: "",
      type: "Full-time",
      posted: "",
      tags: "",
      remote: 0
    });
    setErrors({});
    setSuccessMessage("");
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Only allow numbers for salary fields
    if ((name === 'min_salary' || name === 'max_salary') && value !== '' && !/^\d+$/.test(value)) {
      return;
    }
    
    const fieldValue = type === 'checkbox' ? (checked ? 1 : 0) : value;
    setNewJob((prev) => ({ ...prev, [name]: fieldValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Handle edit form input changes
  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Only allow numbers for salary fields
    if ((name === 'min_salary' || name === 'max_salary') && value !== '' && !/^\d+$/.test(value)) {
      return;
    }
    
    const fieldValue = type === 'checkbox' ? (checked ? 1 : 0) : value;
    setEditingJob(prev => ({ ...prev, [name]: fieldValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!newJob.title.trim()) {
      newErrors.title = "Job title is required";
    } else if (newJob.title.trim().length < 3) {
      newErrors.title = "Job title must be at least 3 characters";
    }

    if (!newJob.company.trim()) {
      newErrors.company = "Company name is required";
    }

     if (!newJob.company_email.trim()) {
    newErrors.company_email = "Company email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newJob.company_email)) {
      newErrors.company_email = "Please enter a valid email address";
    }

    if (!newJob.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!newJob.tags.trim()) {
      newErrors.tags = "Tags are required";
    }

    if (!newJob.description.trim()) {
      newErrors.description = "Description is required";
    } else if (newJob.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!newJob.min_salary) {
      newErrors.min_salary = "Minimum salary is required";
    } else if (parseInt(newJob.min_salary) < 0) {
      newErrors.min_salary = "Minimum salary cannot be negative";
    }

    if (!newJob.max_salary) {
      newErrors.max_salary = "Maximum salary is required";
    } else if (parseInt(newJob.max_salary) < 0) {
      newErrors.max_salary = "Maximum salary cannot be negative";
    } else if (parseInt(newJob.max_salary) < parseInt(newJob.min_salary)) {
      newErrors.max_salary = "Maximum salary must be greater than minimum salary";
    }

    if (newJob.vacantleft < 1) {
      newErrors.vacantleft = "Vacant positions must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate edit form
  const validateEditForm = () => {
    const newErrors = {};

    if (!editingJob.title.trim()) {
      newErrors.title = "Job title is required";
    } else if (editingJob.title.trim().length < 3) {
      newErrors.title = "Job title must be at least 3 characters";
    }

    if (!editingJob.company.trim()) {
      newErrors.company = "Company name is required";
    }

    if (!editingJob.company_email.trim()) {
      newErrors.company_email = "Company email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingJob.company_email)) {
      newErrors.company_email = "Please enter a valid email address";
    }

    if (!editingJob.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!editingJob.tags.trim()) {
      newErrors.tags = "Tags are required";
    }

    if (!editingJob.description.trim()) {
      newErrors.description = "Description is required";
    } else if (editingJob.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!editingJob.min_salary) {
      newErrors.min_salary = "Minimum salary is required";
    } else if (parseInt(editingJob.min_salary) < 0) {
      newErrors.min_salary = "Minimum salary cannot be negative";
    }

    if (!editingJob.max_salary) {
      newErrors.max_salary = "Maximum salary is required";
    } else if (parseInt(editingJob.max_salary) < 0) {
      newErrors.max_salary = "Maximum salary cannot be negative";
    } else if (parseInt(editingJob.max_salary) < parseInt(editingJob.min_salary)) {
      newErrors.max_salary = "Maximum salary must be greater than minimum salary";
    }

    if (editingJob.vacantleft < 1) {
      newErrors.vacantleft = "Vacant positions must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveNewJob = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const jobToAdd = {
        title: newJob.title,
        description: newJob.description,
        location: newJob.location,
        min_salary: parseInt(newJob.min_salary),
        max_salary: parseInt(newJob.max_salary),
        vacantleft: parseInt(newJob.vacantleft),
        company: newJob.company,
        company_email: newJob.company_email,
        type: newJob.type,
        posted: new Date().toISOString().split('T')[0],
        tags: newJob.tags,
        remote: newJob.remote
      };

      const response = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobToAdd),
      });

      if (!response.ok) {
        throw new Error("Failed to add job");
      }

      const addedJob = await response.json();
      
      const formattedJob = {
        job_id: addedJob.job_id,
        title: addedJob.title,
        description: addedJob.description,
        location: addedJob.location,
        min_salary: addedJob.min_salary,
        max_salary: addedJob.max_salary,
        vacantleft: addedJob.vacantleft,
        company: addedJob.company,
        type: addedJob.type,
        posted: addedJob.posted,
        tags: addedJob.tags.split(',').map(tag => tag.trim()),
        remote: addedJob.remote,
        isSaved: false
      };
      
      setJobs(prevJobs => [...prevJobs, formattedJob]);
      setFilteredJobs(prevJobs => [...prevJobs, formattedJob]);
      setSuccessMessage("Job added successfully!");
      
      setTimeout(() => {
        closeAddModal();
      }, 1500);
      
    } catch (error) {
      console.error("Error adding job:", error);
      setErrors({ general: "Failed to add job. Please try again." });
    }
  };

  // Save edited job
  const saveEditedJob = async () => {
    if (!validateEditForm()) return;

    try {
      const updatedJob = {
        title: editingJob.title,
        description: editingJob.description,
        location: editingJob.location,
        min_salary: parseInt(editingJob.min_salary),
        max_salary: parseInt(editingJob.max_salary),
        vacantleft: parseInt(editingJob.vacantleft),
        company: editingJob.company,
        company_email: editingJob.company_email,
        type: editingJob.type,
        posted: editingJob.posted,
        tags: editingJob.tags,
        remote: editingJob.remote
      };

      const response = await fetch(`${API_BASE}/api/jobs/${editingJob.job_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedJob),
      });

      if (!response.ok) {
        throw new Error("Failed to update job");
      }

      const formattedJob = {
        ...updatedJob,
        job_id: editingJob.job_id,
        tags: updatedJob.tags.split(',').map(tag => tag.trim())
      };
      
      setJobs(jobs.map(job => job.job_id === editingJob.job_id ? { ...job, ...formattedJob } : job));
      setFilteredJobs(filteredJobs.map(job => job.job_id === editingJob.job_id ? { ...job, ...formattedJob } : job));
      setSuccessMessage("Job updated successfully!");
      
      setTimeout(() => {
        closeEditModal();
      }, 1500);
      
    } catch (error) {
      console.error("Error updating job:", error);
      setErrors({ general: "Failed to update job. Please try again." });
    }
  };

  const deleteJob = async (jobId) => {
    if (window.confirm("Are you sure you want to delete this job listing?")) {
      try {
        const response = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete job");
        }

        setJobs(jobs.filter(job => job.job_id !== jobId));
        setFilteredJobs(filteredJobs.filter(job => job.job_id !== jobId));
        setSuccessMessage("Job deleted successfully!");
        
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (error) {
        console.error("Error deleting job:", error);
        setErrors({ general: "Failed to delete job. Please try again." });
      }
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeAddModal();
      closeEditModal();
      closeViewModal();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[30px]">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Job Listing Management</h1>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          {successMessage}
        </div>
      )}

      {/* General Error Message */}
      {errors.general && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          {errors.general}
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search jobs or companies...
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Search jobs or companies..."
            />
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Filter by location"
            />
          </div>

          {/* Job Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Type
            </label>
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="All Types">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Remote">Remote</option>
            </select>
          </div>
        </div>

        {/* Results and Clear Filters */}
        <div className="flex justify-between items-center">
          <div className="text-gray-600">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
            {activeTab === "saved" && " in saved jobs"}
          </div>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            CLEAR FILTERS
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button 
          onClick={() => switchTab("all")}
          className={`px-4 py-2 font-medium ${
            activeTab === "all" 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-blue-600'
          }`}
        >
          ALL JOBS
        </button>
        <button 
          onClick={() => switchTab("saved")}
          className={`px-4 py-2 font-medium ${
            activeTab === "saved" 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-blue-600'
          }`}
        >
          SAVED JOBS ({savedJobs.length})
        </button>
      </div>

      {/* Add Job Button */}
      <div className="mb-6 flex justify-end">
        <button 
          onClick={openAddModal}
          className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-300"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Job
        </button>
      </div>

      {/* Job Cards - Mobile View */}
      <div className="block sm:hidden space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {activeTab === "saved" ? "No saved jobs found" : "No jobs found"}
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.job_id} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-600">{job.company}</p>
                  </div>
                  <button 
                    onClick={() => toggleSaveJob(job.job_id)}
                    className={`p-2 rounded-full transition-colors ${
                      job.isSaved 
                        ? 'text-yellow-500 bg-yellow-50' 
                        : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={job.isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </div>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {job.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                <div>
                  <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                </div>

                {/* Job Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location}
                    {job.remote === 1 && <span className="ml-2 text-green-600 font-semibold">(Remote)</span>}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {job.type}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    {formatSalary(job.min_salary, job.max_salary)}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {job.posted}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                    {formatVacantLeft(job.vacantleft)} Vacancies Left
                  </span>
                  
                  <div className="flex space-x-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => openEditModal(job)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteJob(job.job_id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Job Table - Desktop View */}
      <div className="hidden sm:block bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary Range</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  {activeTab === "saved" ? "No saved jobs found" : "No jobs found"}
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr key={job.job_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-semibold text-gray-900">{job.title}</div>
                      <div className="text-sm text-gray-600">{job.company}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{job.location}</span>
                        {job.remote === 1 && (
                          <span className="text-xs text-green-600 font-medium">(Remote)</span>
                        )}
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-blue-600">{formatVacantLeft(job.vacantleft)} Vacancies</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      job.type === 'Full-time' ? 'bg-green-100 text-green-800' : 
                      job.type === 'Part-time' ? 'bg-blue-100 text-blue-800' : 
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {job.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600">
                      {formatSalary(job.min_salary, job.max_salary)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => toggleSaveJob(job.job_id)}
                        className={`p-2 rounded-lg transition-colors ${
                          job.isSaved 
                            ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' 
                            : 'text-gray-400 bg-gray-50 hover:text-yellow-500 hover:bg-yellow-50'
                        }`}
                        title={job.isSaved ? 'Remove from saved' : 'Save job'}
                      >
                        <svg className="w-5 h-5" fill={job.isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => openEditModal(job)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteJob(job.job_id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Add New Job</h2>
              <button
                onClick={closeAddModal}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-5">
                {/* Job Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={newJob.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Senior Frontend Developer"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.title 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-yellow-500"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={newJob.company}
                    onChange={handleInputChange}
                    placeholder="e.g., Tech Solutions Inc."
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.company 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-yellow-500"
                    }`}
                  />
                  {errors.company && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.company}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="company_email"
                    value={newJob.company_email}
                    onChange={handleInputChange}
                    placeholder="e.g., hr@techsolutions.com"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.company_email 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-yellow-500"
                    }`}
                  />
                  {errors.company_email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.company_email}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Applications will be sent to this email</p>
                </div>

                {/* Location and Job Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={newJob.location}
                      onChange={handleInputChange}
                      placeholder="e.g., Manila, Philippines"
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                        errors.location 
                          ? "border-red-400 focus:border-red-500 bg-red-50" 
                          : "border-gray-200 focus:border-yellow-500"
                      }`}
                    />
                    {errors.location && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.location}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={newJob.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 transition-colors bg-white"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>
                </div>

                {/* Remote Work Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="remote"
                    checked={newJob.remote === 1}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <label className="ml-2 text-sm font-semibold text-gray-700">
                    Remote Work Available
                  </label>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tags/Skills <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={newJob.tags}
                    onChange={handleInputChange}
                    placeholder="e.g., React, TypeScript, Tailwind CSS"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.tags 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-yellow-500"
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                  {errors.tags && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.tags}
                    </p>
                  )}
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Salary Range (₱) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="min_salary"
                        value={newJob.min_salary}
                        onChange={handleInputChange}
                        placeholder="Minimum"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                          errors.min_salary 
                            ? "border-red-400 focus:border-red-500 bg-red-50" 
                            : "border-gray-200 focus:border-yellow-500"
                        }`}
                      />
                      {errors.min_salary && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.min_salary}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="max_salary"
                        value={newJob.max_salary}
                        onChange={handleInputChange}
                        placeholder="Maximum"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                          errors.max_salary 
                            ? "border-red-400 focus:border-red-500 bg-red-50" 
                            : "border-gray-200 focus:border-yellow-500"
                        }`}
                      />
                      {errors.max_salary && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.max_salary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={newJob.description}
                    onChange={handleInputChange}
                    placeholder="Describe the role, responsibilities, and requirements...&#10;&#10;You can create bullet points by starting lines with:&#10;• Bullet point 1&#10;• Bullet point 2&#10;&#10;Or use - or * :&#10;- Responsibility 1&#10;- Responsibility 2"
                    rows="8"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors resize-none ${
                      errors.description 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-yellow-500"
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: Start lines with • or - or * to create bullet points
                  </p>
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Vacant Positions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vacant Positions <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="vacantleft"
                    value={newJob.vacantleft}
                    onChange={handleInputChange}
                    placeholder="Number of positions"
                    min="1"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.vacantleft 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-yellow-500"
                    }`}
                  />
                  {errors.vacantleft && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.vacantleft}
                    </p>
                  )}
                </div>

                {/* Success Message */}
                {successMessage && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-800 font-medium">{successMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-200">
              <button
                onClick={closeAddModal}
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveNewJob}
                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-md hover:shadow-lg"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Job
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Edit Job</h2>
              <button
                onClick={closeEditModal}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-5">
                {/* Job Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={editingJob.title}
                    onChange={handleEditInputChange}
                    placeholder="e.g., Senior Frontend Developer"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.title 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-blue-500"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={editingJob.company}
                    onChange={handleEditInputChange}
                    placeholder="e.g., Tech Solutions Inc."
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.company 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-blue-500"
                    }`}
                  />
                  {errors.company && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.company}
                    </p>
                  )}
                </div>

                {/* Company Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="company_email"
                    value={editingJob.company_email}
                    onChange={handleEditInputChange}
                    placeholder="e.g., hr@techsolutions.com"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.company_email 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-blue-500"
                    }`}
                  />
                  {errors.company_email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.company_email}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Applications will be sent to this email</p>
                </div>

                {/* Location and Job Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={editingJob.location}
                      onChange={handleEditInputChange}
                      placeholder="e.g., Manila, Philippines"
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                        errors.location 
                          ? "border-red-400 focus:border-red-500 bg-red-50" 
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    {errors.location && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.location}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={editingJob.type}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors bg-white"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>
                </div>

                {/* Remote Work Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="remote"
                    checked={editingJob.remote === 1}
                    onChange={handleEditInputChange}
                    className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm font-semibold text-gray-700">
                    Remote Work Available
                  </label>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tags/Skills <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={editingJob.tags}
                    onChange={handleEditInputChange}
                    placeholder="e.g., React, TypeScript, Tailwind CSS"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.tags 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-blue-500"
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                  {errors.tags && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.tags}
                    </p>
                  )}
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Salary Range (₱) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="min_salary"
                        value={editingJob.min_salary}
                        onChange={handleEditInputChange}
                        placeholder="Minimum"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                          errors.min_salary 
                            ? "border-red-400 focus:border-red-500 bg-red-50" 
                            : "border-gray-200 focus:border-blue-500"
                        }`}
                      />
                      {errors.min_salary && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.min_salary}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="max_salary"
                        value={editingJob.max_salary}
                        onChange={handleEditInputChange}
                        placeholder="Maximum"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                          errors.max_salary 
                            ? "border-red-400 focus:border-red-500 bg-red-50" 
                            : "border-gray-200 focus:border-blue-500"
                        }`}
                      />
                      {errors.max_salary && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.max_salary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={editingJob.description}
                    onChange={handleEditInputChange}
                    placeholder="Describe the role, responsibilities, and requirements..."
                    rows="5"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors resize-none ${
                      errors.description 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-blue-500"
                    }`}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Vacant Positions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vacant Positions <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="vacantleft"
                    value={editingJob.vacantleft}
                    onChange={handleEditInputChange}
                    placeholder="Number of positions"
                    min="1"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.vacantleft 
                        ? "border-red-400 focus:border-red-500 bg-red-50" 
                        : "border-gray-200 focus:border-blue-500"
                    }`}
                  />
                  {errors.vacantleft && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.vacantleft}
                    </p>
                  )}
                </div>

                {/* Success Message */}
                {successMessage && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-800 font-medium">{successMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-200">
              <button
                onClick={closeEditModal}
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedJob}
                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Update Job
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Job Modal */}
      {showViewModal && selectedJob && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Details</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedJob.title}</h3>
                  <p className="text-gray-600">{selectedJob.company}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    selectedJob.type === 'Full-time' ? 'bg-green-100 text-green-800' : 
                    selectedJob.type === 'Part-time' ? 'bg-blue-100 text-blue-800' : 
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {selectedJob.type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong className="text-gray-700">Location:</strong>
                  <p className="text-gray-600">
                    {selectedJob.location}
                    {selectedJob.remote === 1 && <span className="ml-2 text-green-600 font-semibold">(Remote)</span>}
                  </p>
                </div>
                <div>
                  <strong className="text-gray-700">Salary Range:</strong>
                  <p className="text-green-600 font-semibold">{formatSalary(selectedJob.min_salary, selectedJob.max_salary)}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Vacant Positions:</strong>
                  <p className="text-gray-600">{selectedJob.vacantleft}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Posted:</strong>
                  <p className="text-gray-600">{selectedJob.posted}</p>
                </div>
              </div>

              <div>
                <strong className="text-gray-700">Tags/Skills Required:</strong>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedJob.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <strong className="text-gray-700">Job Description:</strong>
                <p className="text-gray-600 mt-2 whitespace-pre-line">{selectedJob.description}</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeViewModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobListing;