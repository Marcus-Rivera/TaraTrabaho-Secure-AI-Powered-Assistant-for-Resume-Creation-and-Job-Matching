import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
} from "@mui/icons-material";
import { API_BASE } from "./config/api";

const ManageUser = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    userId: null,
    newRole: null,
  });
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    userId: null,
    username: null,
  });

  // Real-time polling states
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef(null);

  // Fetch users function
  const fetchUsers = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      
      const response = await fetch(`${API_BASE}/api/users`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();

      setUsers(data);
      setFilteredUsers(data);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again later.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  // Auto-refresh polling (every 5 seconds)
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchUsers(false); // Don't show loader on auto-refresh
      }, 5000); // Poll every 5 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, fetchUsers]);

  // Filter users
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, statusFilter, roleFilter, users]);

  const showNotification = (message, severity = "success") => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleStatusChange = async (userId, newStatus) => {
    // Optimistic update
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.user_id === userId ? { ...user, status: newStatus } : user
      )
    );

    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update user");
      
      showNotification("User status updated successfully");
      // Fetch fresh data to ensure sync
      await fetchUsers(false);
    } catch (err) {
      console.error("Error updating user:", err);
      showNotification("Failed to update user status", "error");
      // Revert optimistic update
      await fetchUsers(false);
    }
  };

  const handleRoleChange = (userId, newRole) => {
    if (newRole === "admin") {
      setConfirmDialog({ open: true, userId, newRole });
    } else {
      proceedWithRoleChange(userId, newRole);
    }
  };

  const proceedWithRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error("Failed to update user role");

      // Optimistic update
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.user_id === userId ? { ...user, role: newRole } : user
        )
      );
      
      showNotification(`User role updated to ${newRole}`);
      // Fetch fresh data
      await fetchUsers(false);
    } catch (err) {
      console.error("Error updating user role:", err);
      showNotification("Failed to update user role", "error");
      await fetchUsers(false);
    }
  };

  const handleConfirmRoleChange = () => {
    proceedWithRoleChange(confirmDialog.userId, confirmDialog.newRole);
    setConfirmDialog({ open: false, userId: null, newRole: null });
  };

  const handleCancelRoleChange = () => {
    setConfirmDialog({ open: false, userId: null, newRole: null });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
  };

  const getStatusColor = (status) => {
    const normalizedStatus = String(status || '').toLowerCase().trim();
    switch (normalizedStatus) {
      case "approved":
        return "success";
      case "suspended":
        return "error";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getRoleColor = (role) => {
    return role === "admin" ? "secondary" : "primary";
  };

  const handleDeleteUser = (userId, username) => {
    setDeleteDialog({ open: true, userId, username });
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${deleteDialog.userId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete user");

      showNotification("User deleted successfully");
      setDeleteDialog({ open: false, userId: null, username: null });
      // Fetch fresh data
      await fetchUsers(false);
    } catch (err) {
      console.error("Error deleting user:", err);
      showNotification("Failed to delete user", "error");
      setDeleteDialog({ open: false, userId: null, username: null });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, userId: null, username: null });
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    showNotification(
      autoRefresh ? "Auto-refresh paused" : "Auto-refresh enabled",
      "info"
    );
  };

  const handleManualRefresh = () => {
    fetchUsers(false);
    showNotification("Users refreshed", "info");
  };

  const formatLastUpdated = () => {
    const now = new Date();
    const seconds = Math.floor((now - lastUpdated) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h6" color="text.secondary" textAlign="center">
          Loading users...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          Manage Users
        </Typography>
        
        {/* Real-time controls */}
        <Box display="flex" gap={1} alignItems="center">
          <Tooltip title={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}>
            <IconButton
              onClick={toggleAutoRefresh}
              color={autoRefresh ? "primary" : "default"}
              size="small"
            >
              {autoRefresh ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh now">
            <IconButton onClick={handleManualRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Updated {formatLastUpdated()}
          </Typography>
        </Box>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by username or email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              size={isMobile ? "small" : "medium"}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="job_seeker">Job Seeker</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="body2" color="text.secondary">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}{" "}
            found
          </Typography>
          <Button
            variant="outlined"
            onClick={clearFilters}
            startIcon={<FilterListIcon />}
            size={isMobile ? "small" : "medium"}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {isMobile || isTablet ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredUsers.length === 0 ? (
            <Paper elevation={1} sx={{ p: 4, textAlign:"center" }}>
              <Typography color="text.secondary">
                No users found
              </Typography>
            </Paper>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.user_id} elevation={2}>
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={2}
                  >
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {user.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {user.email}
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip
                          label={user.role === "admin" ? "Admin" : "Job Seeker"}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                        <Chip
                          label={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          color={getStatusColor(user.status)}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={user.status}
                          label="Status"
                          onChange={(e) =>
                            handleStatusChange(user.user_id, e.target.value)
                          }
                        >
                          <MenuItem value="approved">Approved</MenuItem>
                          <MenuItem value="suspended">Suspended</MenuItem>
                          <MenuItem value="pending">Pending</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Role</InputLabel>
                        <Select
                          value={user.role}
                          label="Role"
                          onChange={(e) =>
                            handleRoleChange(user.user_id, e.target.value)
                          }
                        >
                          <MenuItem value="job_seeker">Job Seeker</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <Box mt={2} display="flex" justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteUser(user.user_id, user.username)}
                  >
                    Delete User
                  </Button>
                </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Username
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Email
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Role
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Status
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Change Status
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Change Role
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Actions
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {user.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role === "admin" ? "Admin" : "Job Seeker"}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        color={getStatusColor(user.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={user.status || 'approved'}
                          onChange={(e) =>
                            handleStatusChange(user.user_id, e.target.value)
                          }
                          displayEmpty
                        >
                          <MenuItem value="approved">Approved</MenuItem>
                          <MenuItem value="suspended">Suspended</MenuItem>
                          <MenuItem value="pending">Pending</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={user.role || 'job_seeker'}
                          onChange={(e) =>
                            handleRoleChange(user.user_id, e.target.value)
                          }
                          displayEmpty
                        >
                          <MenuItem value="job_seeker">Job Seeker</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleDeleteUser(user.user_id, user.username)}
                        size="small"
                        color="error"
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: 'error.light',
                            color: 'white'
                          } 
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelRoleChange}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Admin Promotion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to promote this user to Admin? They will have
            full access to manage users and jobs.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelRoleChange} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRoleChange}
            variant="contained"
            color="primary"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog
        open={deleteDialog.open}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          ⚠️ Delete User Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete user{" "}
            <strong>{deleteDialog.username}</strong>? This action cannot be undone.
            All user data including applications, resumes, and activity will be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelDelete} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManageUser;