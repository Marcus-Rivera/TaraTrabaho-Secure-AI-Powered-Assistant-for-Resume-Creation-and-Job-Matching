export const API_BASE = "https://taratrabaho-secure-ai-powered-assistant-3913.onrender.com";

export const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};