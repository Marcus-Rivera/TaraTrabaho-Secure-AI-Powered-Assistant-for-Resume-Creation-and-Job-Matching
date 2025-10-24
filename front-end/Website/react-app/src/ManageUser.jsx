import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";

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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();

        setUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

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

  const handleStatusChange = (userId, newStatus) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.user_id === userId ? { ...user, status: newStatus } : user
      )
    );

    fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update user");
        }
        showNotification("User status updated successfully");
      })
      .catch((err) => {
        console.error("Error updating user:", err);
        showNotification("Failed to update user status", "error");
      });
  };

  const handleRoleChange = (userId, newRole) => {
    if (newRole === "admin") {
      setConfirmDialog({ open: true, userId, newRole });
    } else {
      proceedWithRoleChange(userId, newRole);
    }
  };

  const proceedWithRoleChange = (userId, newRole) => {
    fetch(`/api/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update user role");
        }
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.user_id === userId ? { ...user, role: newRole } : user
          )
        );
        showNotification(`User role updated to ${newRole}`);
      })
      .catch((err) => {
        console.error("Error updating user role:", err);
        showNotification("Failed to update user role", "error");
      });
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
    switch (status) {
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
      <Typography variant="h4" fontWeight="bold" color="text.primary" mb={3}>
        Manage Users
      </Typography>

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
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
                          value={user.status}
                          onChange={(e) =>
                            handleStatusChange(user.user_id, e.target.value)
                          }
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
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.user_id, e.target.value)
                          }
                        >
                          <MenuItem value="job_seeker">Job Seeker</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </FormControl>
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
    </Container>
  );
};

export default ManageUser;
