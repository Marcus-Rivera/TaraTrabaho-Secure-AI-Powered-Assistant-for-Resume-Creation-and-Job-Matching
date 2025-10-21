import React, { useState, useEffect } from "react";

const ManageUser = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [successMessage, setSuccessMessage] = useState("");
  const [savedUsers, setSavedUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // "all" or "saved"

  // Fetch users from backend database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        
        // Load saved users from localStorage
        const saved = JSON.parse(localStorage.getItem('savedUsers') || '[]');
        setSavedUsers(saved);

        // Add isSaved property to users
        const usersWithSavedStatus = data.map(user => ({
          ...user,
          isSaved: saved.some(savedUser => savedUser.user_id === user.user_id)
        }));

        setUsers(usersWithSavedStatus);
        setFilteredUsers(usersWithSavedStatus);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search, filters, and active tab
  useEffect(() => {
    let filtered = users;

    // Tab filter
    if (activeTab === "saved") {
      filtered = filtered.filter(user => user.isSaved);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "All Status") {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, statusFilter, users, activeTab]);

  // Toggle save user
  const toggleSaveUser = (userId) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;

    let updatedSavedUsers;
    const isCurrentlySaved = savedUsers.some(savedUser => savedUser.user_id === userId);

    if (isCurrentlySaved) {
      updatedSavedUsers = savedUsers.filter(savedUser => savedUser.user_id !== userId);
    } else {
      updatedSavedUsers = [...savedUsers, user];
    }

    setSavedUsers(updatedSavedUsers);
    localStorage.setItem('savedUsers', JSON.stringify(updatedSavedUsers));

    // Update users with saved status
    const updatedUsers = users.map(user =>
      user.user_id === userId
        ? { ...user, isSaved: !isCurrentlySaved }
        : user
    );
    
    setUsers(updatedUsers);
    
    // Update filtered users based on current tab
    if (activeTab === "saved" && isCurrentlySaved) {
      // If unsaving from saved tab, remove from filtered view
      setFilteredUsers(prev => prev.filter(user => user.user_id !== userId));
    } else {
      setFilteredUsers(updatedUsers.filter(user => {
        if (activeTab === "saved") return user.isSaved;
        return true;
      }));
    }

    setSuccessMessage(isCurrentlySaved ? "User removed from saved!" : "User saved successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Handle action change
  const handleActionChange = (userId, newAction) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.user_id === userId ? { ...user, action: newAction } : user
      )
    );

    // Update user status in backend (using newAction as the status)
    fetch(`http://localhost:5000/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newAction }),
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      // After successful update, sync the status with action
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.user_id === userId ? { ...user, status: newAction } : user
        )
      );
      setSuccessMessage("User status updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    })
    .catch((err) => {
      console.error("Error updating user:", err);
      setError("Failed to update user status. Please try again.");
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All Status");
  };

  // Switch between All Users and Saved Users tabs
  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[30px]">
        <div className="text-center py-10 text-gray-600">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[30px]">
        <div className="text-center py-10 text-red-600 font-medium">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[30px]">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage Users</h1>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search users...
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by username or email..."
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All Status">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Suspended">Suspended</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Results and Clear Filters */}
        <div className="flex justify-between items-center">
          <div className="text-gray-600">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            {activeTab === "saved" && " in saved users"}
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
          ALL USERS
        </button>
        <button 
          onClick={() => switchTab("saved")}
          className={`px-4 py-2 font-medium ${
            activeTab === "saved" 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-blue-600'
          }`}
        >
          SAVED USERS ({savedUsers.length})
        </button>
      </div>

      {/* User Cards - Mobile View */}
      <div className="block sm:hidden space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {activeTab === "saved" ? "No saved users found" : "No users found"}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.user_id} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{user.username}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : user.status === "Suspended"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {user.status}
                    </span>
                    <button 
                      onClick={() => toggleSaveUser(user.user_id)}
                      className={`p-2 rounded-full transition-colors ${
                        user.isSaved 
                          ? 'text-yellow-500 bg-yellow-50' 
                          : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={user.isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <select
                    value={user.action || user.status}
                    onChange={(e) => handleActionChange(user.user_id, e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Table - Desktop View */}
      <div className="hidden sm:block bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 lg:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-4 py-3 lg:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 lg:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 lg:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              <th className="px-4 py-3 lg:px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Save</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  {activeTab === "saved" ? "No saved users found" : "No users found"}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 lg:px-6 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-4 py-4 lg:px-6 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-4 py-4 lg:px-6 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : user.status === "Suspended"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 lg:px-6 whitespace-nowrap text-sm text-gray-500">
                    <select
                      value={user.action || user.status}
                      onChange={(e) => handleActionChange(user.user_id, e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="spproved">Approved</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 lg:px-6 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex justify-center">
                      <button 
                        onClick={() => toggleSaveUser(user.user_id)}
                        className={`p-2 rounded-full transition-colors ${
                          user.isSaved 
                            ? 'text-yellow-500 bg-yellow-50' 
                            : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-50'
                        }`}
                        title={user.isSaved ? 'Remove from saved' : 'Save user'}
                      >
                        <svg className="w-5 h-5" fill={user.isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageUser;