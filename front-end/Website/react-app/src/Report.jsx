import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [dailyUsersData, setDailyUsersData] = useState([]);
  const [resumesData, setResumesData] = useState([]);
  const [applicationsData, setApplicationsData] = useState([]);
  const [matchesData, setMatchesData] = useState([]);
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
      const BASE_URL = 'http://localhost:5000/api';

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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{formatDate(label)}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-semibold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const EmptyState = ({ icon, text }) => (
    <div className="h-64 flex flex-col items-center justify-center text-gray-400">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Analytics</h1>
          <p className="text-gray-600">Platform performance overview</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500">Today: {summary.activeUsersToday}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.totalUsers}</p>
            <p className="text-sm text-gray-600 mt-1">Total Users</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500">Total Resumes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.totalResumes}</p>
            <p className="text-sm text-gray-600 mt-1">Generated</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500">Today: {summary.applicationsToday}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.totalApplications}</p>
            <p className="text-sm text-gray-600 mt-1">Applications</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Users Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Active Users</h3>
            {dailyUsersData.length > 0 ? (
              <div className="w-full h-64">
                <AreaChart width={500} height={240} data={dailyUsersData.slice(-7)}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B7280" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6B7280" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#374151" 
                    strokeWidth={2}
                    fill="url(#colorUsers)" 
                  />
                </AreaChart>
              </div>
            ) : (
              <EmptyState icon="👥" text="No user activity data yet" />
            )}
          </div>

          {/* Resumes Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumes Generated</h3>
            {resumesData.length > 0 ? (
              <div className="w-full h-64">
                <BarChart width={500} height={240} data={resumesData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#4B5563" radius={[4, 4, 0, 0]} />
                </BarChart>
              </div>
            ) : (
              <EmptyState icon="📄" text="No resume data yet" />
            )}
          </div>

          {/* Applications Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Applications</h3>
            {applicationsData.length > 0 ? (
              <div className="w-full h-64">
                <LineChart width={500} height={240} data={applicationsData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#1F2937" 
                    strokeWidth={2}
                    dot={{ fill: '#1F2937', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </div>
            ) : (
              <EmptyState icon="📝" text="No application data yet" />
            )}
          </div>

          {/* AI Matches Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Job Matches</h3>
            {matchesData.length > 0 ? (
              <div className="w-full h-64">
                <BarChart width={500} height={240} data={matchesData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    stroke="#9CA3AF"
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#6B7280" radius={[4, 4, 0, 0]} />
                </BarChart>
              </div>
            ) : (
              <EmptyState icon="🎯" text="No matching data yet" />
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={fetchAnalytics}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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