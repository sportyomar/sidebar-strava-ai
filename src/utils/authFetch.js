const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const apiClient = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  post: async (endpoint: string, data?: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  }
};