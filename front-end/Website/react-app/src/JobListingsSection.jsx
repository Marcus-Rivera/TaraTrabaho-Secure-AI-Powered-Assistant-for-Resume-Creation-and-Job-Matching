import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Typography,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BusinessIcon from '@mui/icons-material/Business';
import Groups2Icon from '@mui/icons-material/Groups2';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useSessionCheck } from "../useSessionCheck";

const JobListingsSection = () => {
  const { userData } = useSessionCheck();
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userResumes, setUserResumes] = useState([]);
  const [resumeOption, setResumeOption] = useState('upload'); // 'upload' or 'saved'
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [applicationData, setApplicationData] = useState({
    fullName: '',
    email: '',
    phone: '',
    coverLetter: '',
    resume: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success' | 'error' | 'warning' | 'info'
  });

  // Fetch jobs from backend
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/jobs');
        
        if (!response.ok) {
          throw new Error('Failed to fetch jobs');
        }
        
        const data = await response.json();
        
        // Format the data to match our component structure
        const formattedJobs = data.map(job => ({
          id: job.job_id,
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          salary: `₱${parseInt(job.min_salary).toLocaleString()} - ₱${parseInt(job.max_salary).toLocaleString()}`,
          posted: job.posted,
          description: job.description,
          tags: job.tags ? job.tags.split(',').map(tag => tag.trim()) : [],
          vacantleft: `${job.vacantleft} Vacancies Left`,
          remote: job.remote === 1,
          min_salary: job.min_salary,
          max_salary: job.max_salary,
        }));
        
        setJobs(formattedJobs);
        setError('');
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load job listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Fetch user's saved resumes
  useEffect(() => {
    const fetchUserResumes = async () => {
      if (!userData?.email) return;

      try {
        const profileResponse = await fetch(`/api/profile/${userData.email}`);
        const userProfile = await profileResponse.json();
        
        if (!userProfile || !userProfile.user_id) return;

        const resumeResponse = await fetch(`/api/resume/user/${userProfile.user_id}`);
        const resumeData = await resumeResponse.json();

        if (resumeResponse.ok) {
          setUserResumes(resumeData);
        }
      } catch (err) {
        console.error('Error fetching user resumes:', err);
      }
    };

    fetchUserResumes();
  }, [userData]);

  // Fetch saved jobs from database
  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!userData?.email) return;

      try {
        const profileResponse = await fetch(`/api/profile/${userData.email}`);
        const userProfile = await profileResponse.json();
        
        if (!userProfile || !userProfile.user_id) return;

        const response = await fetch(`/api/saved-jobs/${userProfile.user_id}`);
        const data = await response.json();

        if (data.success) {
          // Extract just the job IDs for the savedJobs state
          const jobIds = data.savedJobs.map(saved => saved.job_id);
          setSavedJobs(jobIds);
        }
      } catch (err) {
        console.error('Error fetching saved jobs:', err);
      }
    };

    fetchSavedJobs();
  }, [userData]);


  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const toggleSaveJob = async (jobId) => {
    if (!userData?.email) {
      showSnackbar('Please log in to save jobs', 'warning');
      return;
    }

    try {
      const profileResponse = await fetch(`/api/profile/${userData.email}`);
      const userProfile = await profileResponse.json();
      
      if (!userProfile || !userProfile.user_id) {
        showSnackbar('User profile not found', 'error');
        return;
      }

      const userId = userProfile.user_id;
      const isSaved = savedJobs.includes(jobId);

      if (isSaved) {
        // Unsave the job
        const response = await fetch(`/api/saved-jobs/${userId}/${jobId}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (result.success) {
          setSavedJobs(prev => prev.filter(id => id !== jobId));
          showSnackbar('Job removed from saved list', 'info');
        } else {
          showSnackbar('Failed to unsave job', 'error');
        }
      } else {
        // Save the job
        const response = await fetch('/api/saved-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, jobId }),
        });

        const result = await response.json();

        if (result.success) {
          setSavedJobs(prev => [...prev, jobId]);
          showSnackbar('Job saved successfully', 'success');
        } else {
          showSnackbar('Failed to save job', 'error');
        }
      }
    } catch (error) {
      console.error('Error toggling saved job:', error);
      showSnackbar('An error occurred', 'error');
    }
  };

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setApplyModalOpen(true);
  };

  const handleDetailsClick = (job) => {
    setSelectedJob(job);
    setDetailsModalOpen(true);
  };

  const handleCloseApplyModal = () => {
    if (isSubmitting) return;
    setApplyModalOpen(false);
    setResumeOption('upload');
    setSelectedResumeId('');
    setApplicationData({
      fullName: '',
      email: '',
      phone: '',
      coverLetter: '',
      resume: null,
    });
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
  };

  // handleApplicationSubmit
  const handleApplicationSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Get user ID from userData
      const userId = userData?.user_id || userData?.id;
      
      if (!userId) {
        showSnackbar('Please log in to apply for jobs', 'error');
        setIsSubmitting(false);
        return;
      }

      // Validate required fields
      if (!applicationData.fullName || !applicationData.email || !applicationData.phone) {
        showSnackbar('Please fill in all required fields', 'warning');
        setIsSubmitting(false);
        return;
      }

      if (resumeOption === 'upload' && !applicationData.resume) {
        showSnackbar('Please upload a resume', 'warning');
        setIsSubmitting(false);
        return;
      }

      if (resumeOption === 'saved' && !selectedResumeId) {
        showSnackbar('Please select a resume', 'warning');
        setIsSubmitting(false);
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('jobId', selectedJob.id);
      formData.append('fullName', applicationData.fullName);
      formData.append('email', applicationData.email);
      formData.append('phone', applicationData.phone);
      formData.append('coverLetter', applicationData.coverLetter);
      formData.append('resumeSource', resumeOption);

      if (resumeOption === 'upload') {
        formData.append('resume', applicationData.resume);
      } else {
        formData.append('resumeId', selectedResumeId);
      }

      // Submit application
      const response = await fetch('/api/jobs/apply', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        showSnackbar(result.message || 'Application submitted successfully!', 'success');
        handleCloseApplyModal();
        setIsSubmitting(false);
      } else {
        showSnackbar(result.error || 'Failed to submit application', 'error');
        setIsSubmitting(false);
      }

    } catch (error) {
      console.error('Error submitting application:', error);
      showSnackbar('An error occurred while submitting your application. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should not exceed 5MB');
        return;
      }
      setApplicationData(prev => ({ ...prev, resume: file }));
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = location === '' || job.location.toLowerCase().includes(location.toLowerCase());
    const matchesType = jobType === 'all' || job.type === jobType;
    const matchesTab = tabValue === 0 || (tabValue === 1 && savedJobs.includes(job.id));
    
    return matchesSearch && matchesLocation && matchesType && matchesTab;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const JobCard = ({ job }) => (
    <Card className="mb-4 hover:shadow-xl transition-all duration-300 border border-gray-100">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#BAE8E8] to-[#FBDA23] rounded-lg flex items-center justify-center flex-shrink-0">
              <BusinessIcon sx={{ color: '#272343', fontSize: 30 }} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#272343] mb-1">{job.title}</h3>
              <p className="text-gray-600 font-medium mb-2">{job.company}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {job.tags.map((tag, index) => (
                  <Chip 
                    key={index} 
                    label={tag} 
                    size="small"
                    sx={{
                      backgroundColor: '#BAE8E8',
                      color: '#272343',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <IconButton 
            onClick={() => toggleSaveJob(job.id)}
            sx={{ color: savedJobs.includes(job.id) ? '#FBDA23' : '#272343' }}
          >
            {savedJobs.includes(job.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          </IconButton>
        </div>

        <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <LocationOnIcon fontSize="small" sx={{ color: '#FBDA23' }} />
            <span className="text-sm">{job.location}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <WorkIcon fontSize="small" sx={{ color: '#FBDA23' }} />
            <span className="text-sm">{job.type}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <AttachMoneyIcon fontSize="small" sx={{ color: '#FBDA23' }} />
            <span className="text-sm">{job.salary}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <AccessTimeIcon fontSize="small" sx={{ color: '#FBDA23' }} />
            <span className="text-sm">{job.posted}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Groups2Icon fontSize="small" sx={{ color: '#FBDA23' }} />
            <span className="text-sm">{job.vacantleft}</span>
          </div>
        </div>

        <div className="flex gap-2 items-center">   
          <Button
            variant="contained"
            onClick={() => handleApplyClick(job)}
            sx={{
              backgroundColor: '#FBDA23',
              color: '#272343',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#FFE55C',
              },
            }}
          >
            Apply Now
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleDetailsClick(job)}
            sx={{
              borderColor: '#272343',
              color: '#272343',
              fontWeight: 'bold',
              '&:hover': {
                borderColor: '#272343',
                backgroundColor: 'rgba(39, 35, 67, 0.05)',
              },
            }}
          >
            View Details
          </Button>
          {job.remote && (
            <Chip 
              label="Remote Available" 
              size="small"
              sx={{
                backgroundColor: '#2ECC71',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircularProgress sx={{ color: '#FBDA23' }} size={60} />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen">
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{
            backgroundColor: '#FBDA23',
            color: '#272343',
            fontWeight: 'bold',
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold md:pl-10 pt-15 md:pt-5 text-[#272343] mb-2">Find Your Next Opportunity</h1>
        <p className="text-gray-600 md:pl-10">Discover jobs that match your skills and interests</p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6 shadow-lg border border-gray-100">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <TextField
              fullWidth
              placeholder="Search jobs or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#FBDA23' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOnIcon sx={{ color: '#FBDA23' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              fullWidth
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              label="Job Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="Full-time">Full-time</MenuItem>
              <MenuItem value="Part-time">Part-time</MenuItem>
              <MenuItem value="Contract">Contract</MenuItem>
              <MenuItem value="Freelance">Freelance</MenuItem>
            </TextField>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
            </p>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setLocation('');
                setJobType('all');
              }}
              sx={{
                borderColor: '#272343',
                color: '#272343',
                '&:hover': {
                  borderColor: '#272343',
                },
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            '& .MuiTab-root': {
              color: '#272343',
              fontWeight: 'bold',
            },
            '& .Mui-selected': {
              color: '#FBDA23',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#FBDA23',
            },
          }}
        >
          <Tab label="All Jobs" />
          <Tab label={`Saved Jobs (${savedJobs.length})`} />
        </Tabs>
      </Box>

      {/* Job Listings */}
      <div>
        {filteredJobs.length > 0 ? (
          filteredJobs.map(job => <JobCard key={job.id} job={job} />)
        ) : (
          <Card className="p-12 text-center">
            <WorkIcon sx={{ fontSize: 60, color: '#BAE8E8', mb: 2 }} />
            <h3 className="text-xl font-bold text-[#272343] mb-2">No jobs found</h3>
            <p className="text-gray-600">
              {tabValue === 1 
                ? "You haven't saved any jobs yet" 
                : "Try adjusting your search or filters"}
            </p>
          </Card>
        )}
      </div>

      {/* Apply Modal */}
      <Dialog 
        open={applyModalOpen} 
        onClose={handleCloseApplyModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#BAE8E8', color: '#272343', fontWeight: 'bold' }}>
          <div className="flex justify-between items-center">
            <span>Apply for {selectedJob?.title}</span>
            <IconButton onClick={handleCloseApplyModal}>
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedJob?.company} • {selectedJob?.location}
          </Typography>
          
          <TextField
            fullWidth
            label="Full Name"
            value={applicationData.fullName}
            onChange={(e) => setApplicationData(prev => ({ ...prev, fullName: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={applicationData.email}
            onChange={(e) => setApplicationData(prev => ({ ...prev, email: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            fullWidth
            label="Phone Number"
            value={applicationData.phone}
            onChange={(e) => setApplicationData(prev => ({ ...prev, phone: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            fullWidth
            label="Cover Letter"
            multiline
            rows={4}
            value={applicationData.coverLetter}
            onChange={(e) => setApplicationData(prev => ({ ...prev, coverLetter: e.target.value }))}
            placeholder="Tell us why you're a great fit for this role..."
            sx={{ mb: 3 }}
          />

          {/* Resume Selection */}
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend" sx={{ fontWeight: 'bold', color: '#272343', mb: 1 }}>
              Resume
            </FormLabel>
            <RadioGroup
              value={resumeOption}
              onChange={(e) => {
                setResumeOption(e.target.value);
                setApplicationData(prev => ({ ...prev, resume: null }));
                setSelectedResumeId('');
              }}
            >
              <FormControlLabel 
                value="upload" 
                control={<Radio sx={{ color: '#FBDA23', '&.Mui-checked': { color: '#FBDA23' } }} />} 
                label="Upload New Resume" 
              />
              <FormControlLabel 
                value="saved" 
                control={<Radio sx={{ color: '#FBDA23', '&.Mui-checked': { color: '#FBDA23' } }} />} 
                label={`Choose from My Resumes (${userResumes.length})`}
                disabled={userResumes.length === 0}
              />
            </RadioGroup>
          </FormControl>

          {resumeOption === 'upload' ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="resume-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileIcon />}
                  sx={{
                    borderColor: '#272343',
                    color: '#272343',
                    '&:hover': {
                      borderColor: '#FBDA23',
                      backgroundColor: '#FBDA23',
                    },
                  }}
                >
                  Upload Resume
                </Button>
              </label>
              {applicationData.resume && (
                <Typography variant="body2" sx={{ mt: 2, color: '#2ECC71', fontWeight: 'bold' }}>
                  ✓ {applicationData.resume.name}
                </Typography>
              )}
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                Supported formats: PDF, DOC, DOCX (Max 5MB)
              </Typography>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4">
              {userResumes.length > 0 ? (
                <FormControl fullWidth>
                  <Typography variant="body2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Select a resume:
                  </Typography>
                  <RadioGroup
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                  >
                    {userResumes.map((resume) => (
                      <div
                        key={resume.resume_id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                      >
                        <FormControlLabel
                          value={resume.resume_id.toString()}
                          control={<Radio sx={{ color: '#FBDA23', '&.Mui-checked': { color: '#FBDA23' } }} />}
                          label={
                            <div className="flex items-center gap-2">
                              <DescriptionIcon sx={{ color: '#272343' }} />
                              <div>
                                <Typography variant="body2" fontWeight="bold">
                                  {resume.filename}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(resume.created_at)}
                                </Typography>
                              </div>
                            </div>
                          }
                        />
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  No saved resumes found. Create one in the Career Bot!
                </Typography>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleApplicationSubmit}
            variant="contained"
            disabled={
              isSubmitting ||
              !applicationData.fullName || 
              !applicationData.email || 
              !applicationData.phone ||
              (resumeOption === 'upload' && !applicationData.resume) ||
              (resumeOption === 'saved' && !selectedResumeId)
            }
            startIcon={isSubmitting && <CircularProgress size={20} sx={{ color: '#272343' }} />}
            sx={{
              backgroundColor: '#FBDA23',
              color: '#272343',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#FFE55C',
              },
              '&:disabled': {
                backgroundColor: '#E0E0E0',
                color: '#9E9E9E',
              },
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job Details Modal */}
      <Dialog 
        open={detailsModalOpen} 
        onClose={handleCloseDetailsModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#BAE8E8', color: '#272343', fontWeight: 'bold' }}>
          <div className="flex justify-between items-center">
            <span>Job Details</span>
            <IconButton onClick={handleCloseDetailsModal}>
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedJob && (
            <>
              <div className="flex gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#BAE8E8] to-[#FBDA23] rounded-lg flex items-center justify-center flex-shrink-0">
                  <BusinessIcon sx={{ color: '#272343', fontSize: 35 }} />
                </div>
                <div>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#272343', mb: 1 }}>
                    {selectedJob.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                    {selectedJob.company}
                  </Typography>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {selectedJob.tags.map((tag, index) => (
                  <Chip 
                    key={index} 
                    label={tag} 
                    sx={{
                      backgroundColor: '#BAE8E8',
                      color: '#272343',
                      fontWeight: 'bold',
                    }}
                  />
                ))}
              </div>

              <Divider sx={{ my: 3 }} />

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <LocationOnIcon sx={{ color: '#FBDA23' }} />
                  <div>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedJob.location}</Typography>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <WorkIcon sx={{ color: '#FBDA23' }} />
                  <div>
                    <Typography variant="caption" color="text.secondary">Job Type</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedJob.type}</Typography>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AttachMoneyIcon sx={{ color: '#FBDA23' }} />
                  <div>
                    <Typography variant="caption" color="text.secondary">Salary Range</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedJob.salary}</Typography>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AccessTimeIcon sx={{ color: '#FBDA23' }} />
                  <div>
                    <Typography variant="caption" color="text.secondary">Posted</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedJob.posted}</Typography>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Groups2Icon sx={{ color: '#FBDA23' }} />
                  <div>
                    <Typography variant="caption" color="text.secondary">Vacancies</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedJob.vacantleft}</Typography>
                  </div>
                </div>
                {selectedJob.remote && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#2ECC71] rounded-full" />
                    <div>
                      <Typography variant="caption" color="text.secondary">Work Setup</Typography>
                      <Typography variant="body2" fontWeight="bold" color="#2ECC71">Remote Available</Typography>
                    </div>
                  </div>
                )}
              </div>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#272343', mb: 2 }}>
                Job Description
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {selectedJob.description}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              handleCloseDetailsModal();
              toggleSaveJob(selectedJob.id);
            }}
            startIcon={savedJobs.includes(selectedJob?.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            sx={{
              color: '#272343',
              fontWeight: 'bold',
            }}
          >
            {savedJobs.includes(selectedJob?.id) ? 'Saved' : 'Save Job'}
          </Button>
          <Button
            onClick={() => {
              handleCloseDetailsModal();
              handleApplyClick(selectedJob);
            }}
            variant="contained"
            sx={{
              backgroundColor: '#FBDA23',
              color: '#272343',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#FFE55C',
              },
            }}
          >
            Apply Now
          </Button>
        </DialogActions>
      </Dialog>
       <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          icon={snackbar.severity === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
          sx={{
            width: '100%',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default JobListingsSection;