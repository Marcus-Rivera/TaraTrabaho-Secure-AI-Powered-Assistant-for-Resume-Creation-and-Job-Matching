import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [dailyUsersData, setDailyUsersData] = useState([]);
  const [resumesData, setResumesData] = useState([]);
  const [applicationsData, setApplicationsData] = useState([]);
  const [matchesData, setMatchesData] = useState([]);
  const [dateRange, setDateRange] = useState('7'); // 7, 14, 30 days
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalResumes: 0,
    totalApplications: 0,
    totalJobs: 0,
    activeUsersToday: 0,
    applicationsToday: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const BASE_URL = '/api';

      const [dailyUsers, resumes, applications, matches, summaryData] = await Promise.all([
        fetch(`${BASE_URL}/analytics/daily-users`).then(r => r.json()),
        fetch(`${BASE_URL}/analytics/resumes`).then(r => r.json()),
        fetch(`${BASE_URL}/analytics/applications`).then(r => r.json()),
        fetch(`${BASE_URL}/analytics/matches`).then(r => r.json()),
        fetch(`${BASE_URL}/analytics/summary`).then(r => r.json())
      ]);

      setDailyUsersData(dailyUsers.data || []);
      setResumesData(resumes.data || []);
      setApplicationsData(applications.data || []);
      setMatchesData(matches.data || []);
      setSummary(summaryData.summary || {});
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFilteredData = (data) => {
    const days = parseInt(dateRange);
    return data.slice(-days);
  };

  const calculateGrowth = (data) => {
    if (data.length < 2) return 0;
    const recent = data.slice(-7).reduce((sum, item) => sum + item.count, 0);
    const previous = data.slice(-14, -7).reduce((sum, item) => sum + item.count, 0);
    if (previous === 0) return recent > 0 ? 100 : 0;
    return Math.round(((recent - previous) / previous) * 100);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-xl border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-1">{formatDate(label)}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-bold text-gray-900">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const EmptyState = ({ icon, text }) => (
    <div className="h-64 flex flex-col items-center justify-center text-gray-400">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );

  // Calculate pie chart data for user engagement
  const engagementData = [
    { name: 'Resumes', value: summary.totalResumes, color: '#3B82F6' },
    { name: 'Applications', value: summary.totalApplications, color: '#10B981' },
    { name: 'Active Users', value: summary.activeUsersToday, color: '#F59E0B' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const usersGrowth = calculateGrowth(dailyUsersData);
  const resumesGrowth = calculateGrowth(resumesData);
  const applicationsGrowth = calculateGrowth(applicationsData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
                Analytics Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Real-time platform performance metrics
              </p>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
              {['7', '14', '30'].map((days) => (
                <button
                  key={days}
                  onClick={() => setDateRange(days)}
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                    dateRange === days
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards - Now fully responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Users Card */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                usersGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {usersGrowth >= 0 ? '↑' : '↓'} {Math.abs(usersGrowth)}%
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-gray-900">{summary.totalUsers}</p>
            <p className="text-sm text-gray-600 mt-2">Total Users</p>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-semibold text-blue-600">{summary.activeUsersToday}</span> active today
            </p>
          </div>

          {/* Resumes Card */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                resumesGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {resumesGrowth >= 0 ? '↑' : '↓'} {Math.abs(resumesGrowth)}%
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-gray-900">{summary.totalResumes}</p>
            <p className="text-sm text-gray-600 mt-2">Resumes Generated</p>
            <p className="text-xs text-gray-500 mt-1">AI-powered resumes</p>
          </div>

          {/* Applications Card */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                applicationsGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {applicationsGrowth >= 0 ? '↑' : '↓'} {Math.abs(applicationsGrowth)}%
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-gray-900">{summary.totalApplications}</p>
            <p className="text-sm text-gray-600 mt-2">Job Applications</p>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-semibold text-green-600">{summary.applicationsToday}</span> submitted today
            </p>
          </div>
        </div>

        {/* Charts Grid - Fully Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Daily Users Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Daily Active Users</h3>
              <span className="text-xs sm:text-sm text-gray-500 font-medium">Last {dateRange} days</span>
            </div>
            {dailyUsersData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={getFilteredData(dailyUsersData)}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    fill="url(#colorUsers)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="👥" text="No user activity data yet" />
            )}
          </div>

          {/* Resumes Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Resumes Generated</h3>
              <span className="text-xs sm:text-sm text-gray-500 font-medium">Last {dateRange} days</span>
            </div>
            {resumesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={getFilteredData(resumesData)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="📄" text="No resume data yet" />
            )}
          </div>

          {/* Applications Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Job Applications</h3>
              <span className="text-xs sm:text-sm text-gray-500 font-medium">Last {dateRange} days</span>
            </div>
            {applicationsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={getFilteredData(applicationsData)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="📝" text="No application data yet" />
            )}
          </div>

          {/* AI Matches Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">AI Job Matches</h3>
              <span className="text-xs sm:text-sm text-gray-500 font-medium">Last {dateRange} days</span>
            </div>
            {matchesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={getFilteredData(matchesData)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="🎯" text="No matching data yet" />
            )}
          </div>
        </div>

        {/* Engagement Overview - NEW */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Platform Engagement Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend & Stats */}
            <div className="flex flex-col justify-center space-y-3">
              {engagementData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats Bar - NEW */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{summary.totalJobs}</p>
            <p className="text-xs text-gray-600 mt-1">Total Jobs Posted</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {summary.totalApplications > 0 ? Math.round((summary.totalApplications / summary.totalJobs) * 10) / 10 : 0}
            </p>
            <p className="text-xs text-gray-600 mt-1">Avg Apps/Job</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {summary.totalUsers > 0 ? Math.round((summary.totalResumes / summary.totalUsers) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-600 mt-1">Resume Creation Rate</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {summary.totalResumes > 0 ? Math.round((summary.totalApplications / summary.totalResumes) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-600 mt-1">Application Rate</p>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={fetchAnalytics}
            className="px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl hover:from-gray-800 hover:to-gray-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;