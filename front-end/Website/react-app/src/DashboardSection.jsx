import React, { useState, useEffect } from "react";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StarIcon from '@mui/icons-material/Star';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import RefreshIcon from '@mui/icons-material/Refresh';
import { 
  CircularProgress, 
  Alert, 
  Card, 
  CardContent, 
  Chip,
  Button,
  Skeleton,
} from '@mui/material';
import { useSessionCheck } from "../useSessionCheck";
import { useNavigate } from "react-router-dom";

const DashboardSection = () => {
  const { userData, loading: userLoading } = useSessionCheck();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    applications: 0,
    resumes: 0,
    matches: 0,
  });
  const [jobRecommendations, setJobRecommendations] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasResume, setHasResume] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch user stats and job recommendations
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Wait for userData to be fully loaded
      if (userLoading || !userData?.email) {
        console.log('Waiting for user data...');
        return;
      }

      try {
        setError('');
        
        console.log('Fetching dashboard data for:', userData.email);
        
        // Step 1: Get user profile to fetch user_id
        const profileResponse = await fetch(`http://localhost:5000/api/profile/${userData.email}`);
        
        if (!profileResponse.ok) {
          throw new Error(`Profile fetch failed: ${profileResponse.status}`);
        }
        
        const userProfile = await profileResponse.json();
        console.log('User profile loaded:', userProfile.user_id);
        
        if (!userProfile || !userProfile.user_id) {
          throw new Error('User profile not found or missing user_id');
        }

        const userId = userProfile.user_id;

        // Fetch stats and recommendations in parallel
        const fetchStats = async () => {
          try {
            console.log('Fetching stats for user:', userId);
            const statsResponse = await fetch(`http://localhost:5000/api/stats/${userId}`);
            
            if (!statsResponse.ok) {
              console.error('Stats response not OK:', statsResponse.status);
              throw new Error(`Failed to fetch stats: ${statsResponse.status}`);
            }
            
            const statsData = await statsResponse.json();
            console.log('Stats data received:', statsData);
            
            if (statsData.success) {
              setStats(statsData.stats);
            } else {
              throw new Error(statsData.error || 'Failed to load stats');
            }
          } catch (err) {
            console.error('❌ Error fetching stats:', err);
            setError(prev => prev || `Stats error: ${err.message}`);
          } finally {
            setStatsLoading(false);
          }
        };

      const fetchRecommendations = async () => {
      try {
        console.log('Checking for user resume...');
        
        // FIRST: Check if user has a resume in the resume table
        const resumeCheckResponse = await fetch(`http://localhost:5000/api/resume/user/${userId}`);
        
        if (!resumeCheckResponse.ok) {
          throw new Error(`Failed to check resume: ${resumeCheckResponse.status}`);
        }
        
        const userResumes = await resumeCheckResponse.json();
        
        // Check if user has any resumes
        const hasResumeInTable = Array.isArray(userResumes) && userResumes.length > 0;
        
        if (!hasResumeInTable) {
          console.log('❌ No resume found in database - Skipping job recommendations');
          setHasResume(false);
          setJobRecommendations([]);
          setJobsLoading(false);
          return; // EXIT EARLY - Don't call recommendation API
        }
        
        console.log(`✅ Found ${userResumes.length} resume(s) - Fetching AI job recommendations...`);
        setHasResume(true);
        
        // NOW call the recommendation API (only if resume exists)
        const recommendResponse = await fetch('http://localhost:5000/api/jobs/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId }),
        });

        if (!recommendResponse.ok) {
          console.error('Recommend response not OK:', recommendResponse.status);
          throw new Error(`Failed to fetch recommendations: ${recommendResponse.status}`);
        }

        const recommendData = await recommendResponse.json();
        console.log('Recommendations received:', recommendData);
        
        if (recommendData.success) {
          setJobRecommendations(recommendData.recommendations);
          
          // Update matches count
          setStats(prev => ({
            ...prev,
            matches: recommendData.recommendations.length,
          }));

          console.log(`✅ Loaded ${recommendData.recommendations.length} AI-matched jobs`);
        } else {
          throw new Error(recommendData.error || 'Failed to load recommendations');
        }
      } catch (err) {
        console.error('❌ Error fetching recommendations:', err);
        setError(prev => prev || `Recommendations error: ${err.message}`);
      } finally {
        setJobsLoading(false);
      }
    };

        // Fetch both in parallel
        await Promise.all([fetchStats(), fetchRecommendations()]);

        setRetryCount(0);
      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err);
        setError(`Failed to load dashboard data: ${err.message}`);
        setStatsLoading(false);
        setJobsLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData, userLoading, retryCount]);

  const handleApplyClick = (job) => {
    navigate('/taratrabaho/jobs', { state: { selectedJobId: job.id } });
  };

  const handleViewAllJobs = () => {
    navigate('/taratrabaho/jobs');
  };

  const handleRetry = () => {
    setStatsLoading(true);
    setJobsLoading(true);
    setError('');
    setRetryCount(prev => prev + 1);
  };

  // Only show full page loading if user is not loaded yet
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CircularProgress sx={{ color: '#FBDA23' }} size={60} />
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  

  return (
      <div className="flex-1 p-4 md:p-6 lg:p-8 bg-white">
      {/* Header - Always visible */}
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#272343] mb-4 pl-5 md:pl-4">DASHBOARD</h1>

      <p className="text-xl md:text-2xl ml-2 md:ml-5 font-bold text-[#272343]">
        Hi there! <span className="wave">👋</span>
        <br />
      </p>
      <p className="text-[#272343]/77 mb-6 ml-2 md:ml-5 font-bold text-sm md:text-base">
        Here's your overview for today
      </p>

      {/* Error Alert with Retry */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetry}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Overview cards - Show loading skeletons */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {statsLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 bg-[#FFE660] rounded-4xl p-4">
                <div className="flex items-center gap-3">
                  <Skeleton variant="rounded" width={48} height={48} />
                  <div className="flex-1">
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="80%" height={20} />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex-1 bg-[#FFE660] rounded-4xl p-4 flex items-center gap-3">
              <div className="bg-[#BAE8E8] p-3 rounded-lg flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  className="text-black flex-shrink-0"
                >
                  <path
                    fill="currentColor"
                    d="M11 20v2H3c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h18c1.1 0 2 .9 2 2v8.1l-.2-.2c-.5-.5-1.1-.8-1.8-.8V6H3v14zm10.4-6.7l1.3 1.3c.2.2.2.6 0 .8l-1 1l-2.1-2.1l1-1c.1-.1.2-.2.4-.2s.3.1.4.2m-.3 3.6l-6 6.1H13v-2.1l6.1-6.1z"
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="text-lg xl:text-2xl font-bold mt-1 text-[#272343]">
                  {stats.applications} Application{stats.applications !== 1 ? 's' : ''}
                </div>
                <div className="text-sm font-semibold text-[#272343]/77">Applications Submitted</div>
              </div>
            </div>

            <div className="flex-1 bg-[#FFE660] rounded-4xl p-4 flex items-center gap-3">
              <div className="bg-[#BAE8E8] p-3 rounded-lg flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="26"
                  height="26"
                  viewBox="0 0 16 16"
                  className="text-black flex-shrink-0"
                >
                  <path
                    fill="currentColor"
                    d="M8 4.5A1.25 1.25 0 1 0 8 2a1.25 1.25 0 0 0 0 2.5"
                  />
                  <path
                    fill="currentColor"
                    d="M8 4.5c.597 0 1.13.382 1.32.949l.087.26a.22.22 0 0 1-.21.291h-2.39a.222.222 0 0 1-.21-.291l.087-.26a1.39 1.39 0 0 1 1.32-.949zm-3 4a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m.5 1.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"
                  />
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M2.33 1.64c-.327.642-.327 1.48-.327 3.16v6.4c0 1.68 0 2.52.327 3.16a3.02 3.02 0 0 0 1.31 1.31c.642.327 1.48.327 3.16.327h2.4c1.68 0 2.52 0 3.16-.327a3 3 0 0 0 1.31-1.31c.327-.642.327-1.48.327-3.16V4.8c0-1.68 0-2.52-.327-3.16A3 3 0 0 0 12.36.33C11.718.003 10.88.003 9.2.003H6.8c-1.68 0-2.52 0-3.16.327a3.02 3.02 0 0 0-1.31 1.31m6.87-.638H6.8c-.857 0-1.44 0-1.89.038c-.438.035-.663.1-.819.18a2 2 0 0 0-.874.874c-.08.156-.145.38-.18.819c-.037.45-.038 1.03-.038 1.89v6.4c0 .857.001 1.44.038 1.89c.036.438.101.663.18.819c.192.376.498.682.874.874c.156.08.381.145.819.18c.45.036 1.03.037 1.89.037h2.4c.857 0 1.44 0 1.89-.037c.438-.036.663-.101.819-.18c.376-.192.682-.498.874-.874c.08-.156.145-.381.18-.82c.037-.45.038-1.03.038-1.89v-6.4c0-.856-.001-1.44-.038-1.89c-.036-.437-.101-.662-.18-.818a2 2 0 0 0-.874-.874c-.156-.08-.381-.145-.819-.18c-.45-.037-1.03-.038-1.89-.038"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="text-lg xl:text-2xl font-bold mt-1 text-[#272343]">
                  {stats.resumes} Resume{stats.resumes !== 1 ? 's' : ''}
                </div>
                <div className="text-sm font-semibold text-[#272343]/77">Resumes Generated</div>
              </div>
            </div>

            <div className="flex-1 bg-[#FFE660] rounded-4xl p-4 flex items-center gap-3">
              <div className="bg-[#BAE8E8] p-3 rounded-lg flex items-center justify-center">
                <StarIcon className="text-[#272343]" style={{ fontSize: 26 }} />
              </div>
              <div className="flex flex-col">
                <div className="text-lg xl:text-2xl font-bold mt-1 text-[#272343]">
                  {stats.matches} Match{stats.matches !== 1 ? 'es' : ''}
                </div>
                <div className="text-sm font-semibold text-[#272343]/77">AI Job Matches</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Job Recommendations Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-[#272343]">
          Job Recommendations {hasResume && ''}
        </h2>
        <Button
          variant="outlined"
          onClick={handleViewAllJobs}
          fullWidth
          sx={{
            borderColor: '#272343',
            color: '#272343',
            fontWeight: 'bold',
            '@media (min-width: 768px)': {
              width: 'auto',
            },
            '&:hover': {
              borderColor: '#FBDA23',
              backgroundColor: '#FBDA23',
            },
          }}
        >
          View All Jobs
        </Button>
      </div>

      {/* Alert messages */}
      {!jobsLoading && !hasResume && jobRecommendations.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          💡 Create a resume in the Career Bot to get personalized AI-powered job recommendations based on your skills and experience!
        </Alert>
      )}

      {!jobsLoading && hasResume && jobRecommendations.length > 0 && (
        <Alert severity="success" sx={{ mb: 3 }}>
          These jobs are AI-matched to your resume! The recommendations are based on your skills, experience, and career goals.
        </Alert>
      )}

      {/* Loading message for recommendations */}
      {jobsLoading && (
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 p-4 md:p-8 bg-gradient-to-r from-[#BAE8E8] to-[#FFE660] rounded-lg mb-4">
          <CircularProgress size={24} sx={{ color: '#272343' }} />
          <div className="text-center md:text-left">
            <p className="text-[#272343] font-bold text-base md:text-lg">
              AI is analyzing jobs for you...
            </p>
            <p className="text-[#272343]/70 text-xs md:text-sm">
              Finding the best matches based on your profile
            </p>
          </div>
        </div>
      )}
      {/* Job recommendations cards */}
      {jobsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton variant="rounded" width={48} height={48} />
                <div className="flex-1">
                  <Skeleton variant="text" width="80%" height={24} />
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="40%" height={20} />
                </div>
              </div>
              <div className="flex gap-1 mb-3">
                <Skeleton variant="rounded" width={60} height={20} />
                <Skeleton variant="rounded" width={70} height={20} />
                <Skeleton variant="rounded" width={50} height={20} />
              </div>
              <div className="flex gap-2">
                <Skeleton variant="rounded" width={80} height={32} />
                <Skeleton variant="rounded" width={24} height={24} />
              </div>
            </Card>
          ))}
        </div>
      ) : jobRecommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobRecommendations.map((job) => (
            <Card key={job.id} className="hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#BAE8E8] to-[#FBDA23] rounded-lg flex items-center justify-center flex-shrink-0">
                    <BusinessIcon sx={{ color: '#272343', fontSize: 24 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#272343] truncate">{job.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{job.company}</p>
                    <p className="text-sm text-green-600 font-semibold">{job.salary}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {job.tags.slice(0, 3).map((tag, idx) => (
                    <Chip 
                      key={idx} 
                      label={tag} 
                      size="small"
                      sx={{
                        backgroundColor: '#BAE8E8',
                        color: '#272343',
                        fontSize: '0.65rem',
                        height: '20px',
                      }}
                    />
                  ))}
                  {hasResume && (
                    <Chip 
                      label="AI Match" 
                      size="small"
                      icon={<StarIcon style={{ fontSize: 12 }} />}
                      sx={{
                        backgroundColor: '#FBDA23',
                        color: '#272343',
                        fontSize: '0.65rem',
                        height: '20px',
                        fontWeight: 'bold',
                      }}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => handleApplyClick(job)}
                    className="px-4 py-1.5 bg-[#FBDA23] text-[#272343] text-sm rounded font-bold hover:bg-[#FFE55C] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                  <OpenInNewIcon 
                    className="text-gray-400 cursor-pointer hover:text-[#FBDA23]" 
                    onClick={() => handleApplyClick(job)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 md:p-12 text-center">
          <WorkIcon sx={{ fontSize: { xs: 48, md: 60 }, color: '#BAE8E8', mb: 2 }} />
          <h3 className="text-lg md:text-xl font-bold text-[#272343] mb-2">No recommendations yet</h3>
          <p className="text-sm md:text-base text-gray-600 mb-4 px-2">
            {hasResume 
              ? "We're analyzing your profile to find the best matches" 
              : "Create a resume to get personalized AI-powered job recommendations"}
          </p>
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate('/taratrabaho/careerbot')}
            sx={{
              backgroundColor: '#FBDA23',
              color: '#272343',
              fontWeight: 'bold',
              maxWidth: { xs: '100%', sm: '300px' },
              mx: 'auto',
              '&:hover': {
                backgroundColor: '#FFE55C',
              },
            }}
          >
            Create Resume in Career Bot
          </Button>
        </Card>
      )}
    </div>
  );
};

export default DashboardSection;