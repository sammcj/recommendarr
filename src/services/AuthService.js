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
    return !!this.token;
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
  
  // Set authentication headers for API requests
  setAuthHeader() {
    if (this.token) {
      ApiService.setHeader('Authorization', `Bearer ${this.token}`);
    } else {
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
      const response = await ApiService.post('/auth/login', {
        username,
        password
      });
      
      const { token, user } = response.data;
      
      // Store token and user data
      this.token = token;
      this.user = user;
      
      // Save to localStorage
      try {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        // Continue even if localStorage fails
      }
      
      // Set auth header for future API requests
      this.setAuthHeader();
      
      return user;
    } catch (error) {
      throw error.response?.data?.error || error.message;
    }
  }
  
  // Logout the current user
  async logout() {
    try {
      // Call logout endpoint
      await ApiService.post('/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear local data
      this.token = null;
      this.user = null;
      
      // Remove from localStorage
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } catch (error) {
        console.error('Error removing from localStorage:', error);
        // Continue even if localStorage fails
      }
      
      // Remove auth header
      ApiService.removeHeader('Authorization');
    }
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