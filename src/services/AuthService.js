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
        // Initialize ApiService with the current user
        ApiService.setCurrentUser(this.user);
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
    if (!this.user) {
      return false;
    }
    
    // Add timestamp check to detect stale local storage data
    // Get current timestamp
    const now = new Date().getTime();
    
    // Get timestamp from localStorage if available
    let authTimestamp = null;
    try {
      authTimestamp = localStorage.getItem('auth_timestamp');
    } catch (e) {
      console.error('Error accessing localStorage for auth timestamp:', e);
    }
    
    // If no timestamp or timestamp is more than 1 hour old, consider session potentially stale
    // This doesn't invalidate the session but triggers a verification with the server
    if (!authTimestamp || (now - parseInt(authTimestamp, 10)) > 3600000) {
      console.log('Authentication data is stale or missing timestamp');
      return false;  // Returning false will trigger a server verification in the Login component
    }
    
    return true;
  }
  
  // Get current user
  getUser() {
    return this.user;
  }
  
  // Initialize the current user in ApiService
  initApiServiceUser() {
    if (this.user) {
      ApiService.setCurrentUser(this.user);
    }
  }
  
  // Get authentication token
  getToken() {
    return this.token;
  }
  
  // Check if user is admin
  isAdmin() {
    return this.user && this.user.isAdmin;
  }
  
  // Get authentication provider
  getAuthProvider() {
    return this.user && this.user.authProvider ? this.user.authProvider : 'local';
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
  
  // Verify current session (useful after OAuth redirect)
  async verifySession() {
    try {
      console.log('Verifying session with server');
      const response = await ApiService.get('/auth/verify');
      
      if (response.data && response.data.user) {
        console.log('Session verified successfully for user:', response.data.user.username);
        
        // Update local user data
        this.user = response.data.user;
        this.token = "cookie-auth";
        
        // Update localStorage with user data and fresh timestamp
        try {
          localStorage.setItem('auth_user', JSON.stringify(this.user));
          localStorage.setItem('auth_timestamp', Date.now().toString()); 
          console.log('Updated user data and timestamp in localStorage');
        } catch (error) {
          console.error('Error updating localStorage after session verification:', error);
        }
        
        // Set the current user in ApiService
        ApiService.setCurrentUser(this.user);
        
        // Set auth header
        this.setAuthHeader();
        
        return true;
      } else {
        console.log('Server returned no user data, session is invalid');
        // Clear local auth data since server doesn't recognize the session
        this.clearLocalAuth();
        return false;
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      
      // Check if it's a 401 unauthorized error
      if (error.response && error.response.status === 401) {
        console.log('Server returned 401 Unauthorized, clearing local auth data');
        this.clearLocalAuth();
      }
      
      return false;
    }
  }

  // Get enabled authentication providers
  async getEnabledProviders() {
    try {
      const response = await ApiService.get('/auth/providers');
      return response.data;
    } catch (error) {
      console.error('Error getting auth providers:', error);
      return { providers: [], localAuth: true };
    }
  }
  
  // Register a new user
  // eslint-disable-next-line no-unused-vars
  async register(username, password) {
    try {
      // Prevent local username/password registration from login page
      // Only admins can create local users now
      // Note: Users can still register via OAuth providers if configured
      throw new Error('Direct registration is disabled. Please contact an administrator to create an account or use a social login option if available.');
      
      // This code is unreachable but kept for reference
      /*
      const response = await ApiService.post('/auth/register', {
        username,
        password
      });
      
      return response.data;
      */
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
      // We store "cookie-auth" for token, as we don't have direct access to the HttpOnly cookie
      this.token = "cookie-auth"; // Marker to indicate we're using cookie auth
      
      // Save user data and timestamp to localStorage
      try {
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('auth_timestamp', Date.now().toString());
        console.log('User data and timestamp saved to localStorage');
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
      
      // Set the current user in ApiService
      ApiService.setCurrentUser(user);
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data?.error || error.message;
    }
  }
  
  // OAuth login redirect
  oauthLogin(provider) {
    // Redirect to the OAuth provider's authorization page
    window.location.href = `${ApiService.baseUrl}/auth/${provider}`;
  }
  
  // Logout the current user - handles both server-side and local logout
  async logout() {
    try {
      console.log('Starting logout process');
      
      // First call server-side logout to invalidate the session and clear the cookie
      await this.logoutOnServer();
      
      // Then clear local authentication data
      this.clearLocalAuth();
      
      // Force reload to clear any in-memory state
      console.log('Forcing page reload to clear all application state');
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if server logout fails, clear local data and redirect
      this.clearLocalAuth();
      window.location.href = '/login';
    }
  }
  
  // Only call server-side logout endpoint
  async logoutOnServer() {
    try {
      console.log('Calling server logout endpoint');
      // Call logout endpoint - must include credentials to send the cookie
      const response = await fetch(`${ApiService.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        credentials: 'include' // Important: This ensures cookies are sent with the request
      });
      
      if (!response.ok) {
        throw new Error(`Server logout failed with status: ${response.status}`);
      }
      
      console.log('Server logout completed successfully');
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
      localStorage.removeItem('auth_timestamp');
      
      // Clear any other application data that might be stored
      const keysToKeep = ['darkTheme']; // User preferences to keep
      const keysToRemove = [];
      
      // Find all localStorage keys to remove
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove them
      keysToRemove.forEach(key => {
        console.log(`Removing localStorage item: ${key}`);
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      // Continue even if localStorage fails
    }
    
    // Force clear the auth cookie by setting it to expire in the past (client-side)
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Remove auth header (for backward compatibility)
    ApiService.removeHeader('Authorization');
    
    // Clear the current user in ApiService
    ApiService.setCurrentUser(null);
    
    // Reset any in-memory stores to prevent data leakage
    try {
      console.log('Resetting global stores and utilities...');
      
      // Import and reset stores to avoid circular dependencies
      import('../stores/RecommendationsStore').then(module => {
        const RecommendationsStore = module.default;
        if (RecommendationsStore && typeof RecommendationsStore.resetStore === 'function') {
          console.log('Resetting RecommendationsStore...');
          RecommendationsStore.resetStore();
        }
      }).catch(err => console.error('Failed to reset RecommendationsStore:', err));
      
      // Reset database utilities
      import('../utils/DatabaseStorageUtils').then(module => {
        const DatabaseStorageUtils = module.default;
        if (DatabaseStorageUtils && typeof DatabaseStorageUtils.reset === 'function') {
          console.log('Resetting DatabaseStorageUtils...');
          DatabaseStorageUtils.reset();
        }
      }).catch(err => console.error('Failed to reset DatabaseStorageUtils:', err));
      
    } catch (error) {
      console.error('Error resetting application state:', error);
    }
    
    console.log('Local authentication data cleared successfully');
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
  
  // Update user profile
  async updateProfile(profile) {
    try {
      const response = await ApiService.post('/auth/profile', {
        profile
      });
      
      if (response.data.success && response.data.user) {
        // Update local user data
        this.user = response.data.user;
        localStorage.setItem('auth_user', JSON.stringify(this.user));
      }
      
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
  
  // Update a user (admin only)
  async updateUser(userId, updates) {
    try {
      const response = await ApiService.put(`/auth/users/${userId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || error.message;
    }
  }
  
  // Delete a user (admin only)
  async deleteUser(userId) {
    try {
      const response = await ApiService.delete(`/auth/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || error.message;
    }
  }
}

export default new AuthService();
