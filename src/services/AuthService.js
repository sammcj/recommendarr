import ApiService from './ApiService';

class AuthService {
  constructor() {
    this.token = null;
    this.user = null;
    
    try {
      this.token = localStorage.getItem('auth_token');
      const userJson = localStorage.getItem('auth_user');
      if (userJson) {
        this.user = JSON.parse(userJson);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      // Continue without stored credentials
    }
  }
  
  // Check if user is authenticated
  isAuthenticated() {
    // With HttpOnly cookies, we can't check the cookie directly
    // We rely on the presence of user data as an indicator
    return !!this.user;
  }
  
  // Get current user
  getUser() {
    return this.user;
  }
  
  // Get authentication token
  getToken() {
    return this.token;
  }
  
  // Check if user is admin
  isAdmin() {
    return this.user && this.user.isAdmin;
  }
  
  // Set authentication headers for API requests (for compatibility)
  setAuthHeader() {
    // With HttpOnly cookies, the browser automatically sends the cookie
    // We don't need to set Authorization header anymore
    // However, we keep this method for backward compatibility
    if (this.token) {
      console.log('Using cookie-based authentication, no need to set auth header');
      // If we have a token in memory (from old version), continue to use it
      if (this.token !== "cookie-auth") {
        console.log('Setting backup auth header with token:', this.token.substring(0, 10) + '...');
        ApiService.setHeader('Authorization', `Bearer ${this.token}`);
      } else {
        // With cookie auth, we don't need to set a header
        ApiService.removeHeader('Authorization');
      }
    } else {
      console.log('Removing auth header due to no token');
      ApiService.removeHeader('Authorization');
    }
  }
  
  // Register a new user
  async register(username, password) {
    try {
      const response = await ApiService.post('/auth/register', {
        username,
        password
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || error.message;
    }
  }
  
  // Login a user
  async login(username, password) {
    try {
      console.log('Attempting login for user:', username);
      
      const response = await ApiService.post('/auth/login', {
        username,
        password
      });
      
      console.log('Login response received');
      
      // Check response format - With HttpOnly cookies, we don't receive a token
      if (!response.data || !response.data.user) {
        console.error('Invalid login response format:', response.data);
        throw new Error('Invalid response from server');
      }
      
      const { user } = response.data;
      console.log('User authenticated successfully:', user.username);
      
      // Token is now stored in an HttpOnly cookie managed by the browser
      // We only store user data in memory and localStorage
      this.user = user;
      
      // The token is implicitly sent with every request via cookies
      // We store null for token, as we don't have direct access to the HttpOnly cookie
      this.token = "cookie-auth"; // Marker to indicate we're using cookie auth
      
      // Save user data to localStorage
      try {
        localStorage.setItem('auth_user', JSON.stringify(user));
        console.log('User data saved to localStorage');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        // Continue even if localStorage fails
      }
      
      // Set auth header for future API requests
      console.log('Setting auth header after login');
      this.setAuthHeader();
      
      // Verify the header was set correctly
      const currentHeaders = ApiService.axiosInstance.defaults.headers.common;
      console.log('Current auth header:', currentHeaders['Authorization'] ? 'Set' : 'Not set');
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data?.error || error.message;
    }
  }
  
  // Logout the current user - handles both server-side and local logout
  async logout() {
    try {
      // First clear local authentication
      this.clearLocalAuth();
      
      // Then call logout endpoint
      await this.logoutOnServer();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
  
  // Only call server-side logout endpoint
  async logoutOnServer() {
    try {
      console.log('Calling server logout endpoint');
      // Call logout endpoint - must include credentials to send the cookie
      await fetch(`${ApiService.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        credentials: 'include' // Important: This ensures cookies are sent with the request
      });
      console.log('Server logout completed');
    } catch (error) {
      console.error('Error during server logout:', error);
      throw error;
    }
  }
  
  // Clear local authentication data without making server request
  clearLocalAuth() {
    console.log('Clearing local authentication data');
    // Clear local data
    this.token = null;
    this.user = null;
    
    // Remove from localStorage - note: cookie is cleared on server side
    try {
      localStorage.removeItem('auth_token'); // For backward compatibility
      localStorage.removeItem('auth_user');
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      // Continue even if localStorage fails
    }
    
    // Remove auth header (for backward compatibility)
    ApiService.removeHeader('Authorization');
  }
  
  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await ApiService.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || error.message;
    }
  }
  
  // Get all users (admin only)
  async getUsers() {
    try {
      const response = await ApiService.get('/auth/users');
      return response.data.users;
    } catch (error) {
      throw error.response?.data?.error || error.message;
    }
  }
  
  // Create a new user (admin only)
  async createUser(username, password, isAdmin = false) {
    try {
      const response = await ApiService.post('/auth/users', {
        username,
        password,
        isAdmin
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || error.message;
    }
  }
  
  // Delete a user (admin only)
  async deleteUser(username) {
    try {
      const response = await ApiService.delete(`/auth/users/${username}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || error.message;
    }
  }
}

export default new AuthService();