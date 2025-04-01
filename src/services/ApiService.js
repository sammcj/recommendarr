import axios from 'axios';

/**
 * Client-side API service for communicating with our proxy server
 */
class ApiService {
  // Current user information
  currentUser = null;
  constructor() {
    // Use the same server for both frontend and API by using a relative path
    // This enables both to run on the same port
    this.baseUrl = '/api';
    
    console.log(`Using relative API path: ${this.baseUrl}`);
    
    // Create axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl
    });
    
    // Add response interceptor to handle 401 errors globally
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        // Handle 401 Unauthorized or 530 errors - both indicate auth issues
        if (error.response && (error.response.status === 401 || error.response.status === 530)) {
          console.log(`Auth error (${error.response.status}) detected, checking...`, error.config?.url);
          
          // Skip auth-related paths to prevent loops
          const skipPaths = ['/auth/login', '/auth/logout', '/auth/register'];
          const isAuthRequest = error.config && 
                               error.config.url && 
                               skipPaths.some(path => error.config.url.includes(path));
          
      // Only trigger logout for non-auth pages when user is actually logged in 
      // We need to check if we're on login page to avoid infinite refreshes
      const isLoginPage = window.location.pathname === '/login' || 
                         window.location.pathname === '/' || 
                         document.querySelector('.login-container') !== null;
      
      // Don't trigger logout flow if we're already on the login page or if it's an auth request
      // Also don't reload if we're getting credentials or settings
      const isCredentialsRequest = error.config && 
                                  error.config.url && 
                                  (error.config.url.includes('/credentials/') || 
                                   error.config.url.includes('/settings'));
      
      if (!isAuthRequest && !isLoginPage && !isCredentialsRequest) {
            console.log('Session expired, clearing auth data...');
            
            // Force clear the auth cookie by setting it to expire in the past
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            // Import needs to be here to avoid circular dependency
            import('./AuthService').then(module => {
              const authService = module.default;
              // Clear local auth data without making another server request
              authService.clearLocalAuth();
              // Reload page once to show login screen
              window.location.reload();
            });
          }
        }
        return Promise.reject(error);
      }
    );
    
    // Try to load saved settings after initialization
    this.loadSavedSettings();
    
    // Configure to send credentials (cookies) with requests
    this.axiosInstance.defaults.withCredentials = true;
    
    // Initialize with any stored auth token (for backward compatibility)
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('Found token in localStorage (legacy support)');
        this.setHeader('Authorization', `Bearer ${token}`);
      } else {
        console.log('No stored auth token found - using HttpOnly cookies');
      }
    } catch (error) {
      console.error('Error accessing localStorage in ApiService:', error);
      // Continue without stored auth token
    }
  }
  
  // Set a header for all future requests
  setHeader(key, value) {
    this.axiosInstance.defaults.headers.common[key] = value;
  }
  
  // Remove a header from all future requests
  removeHeader(key) {
    delete this.axiosInstance.defaults.headers.common[key];
  }
  
  // Basic HTTP methods
  async get(url, config = {}) {
    return this.axiosInstance.get(url, config);
  }
  
  async post(url, data = {}, config = {}) {
    return this.axiosInstance.post(url, data, config);
  }
  
  async put(url, data = {}, config = {}) {
    return this.axiosInstance.put(url, data, config);
  }
  
  async delete(url, config = {}) {
    return this.axiosInstance.delete(url, config);
  }
  
  /**
   * Loads any user-configured settings from the credentials storage
   * This happens asynchronously after the initial constructor
   */
  async loadSavedSettings() {
    // Skip loading saved settings as app-config feature has been removed
    console.log('Using environment-configured API URL settings');
    return;
  }
  
  /**
   * No longer need to detect API URL as we're using relative paths
   * This is kept as a stub for compatibility with any code that might call it
   * @private
   * @returns {string} API URL
   */
  detectApiUrl() {
    return '/api';
  }

  /**
   * Send a request through the proxy server
   * 
   * @param {Object} options - Request options
   * @param {string} options.url - Target URL
   * @param {string} options.method - HTTP method (GET, POST, etc.)
   * @param {Object} options.data - Request body
   * @param {Object} options.params - URL parameters
   * @param {Object} options.headers - HTTP headers
   * @returns {Promise<Object>} - Response data
   */
  async proxyRequest(options) {
    try {
      const response = await this.post('/proxy', options);
      
      // If the proxy returns a status that's not 2xx but within 400-599, we still get a success response
      // from axios, but we need to check the status in the response data and throw appropriate errors
      if (response.data && response.data.status >= 400) {
        const errorInfo = {
          status: response.data.status,
          statusText: response.data.statusText,
          message: response.data.data?.message || 'An error occurred in the proxy request',
          code: response.data.data?.code,
          error: response.data.data || response.data.error || 'Unknown error'
        };
        
        console.error('Proxy error response:', errorInfo);
        throw errorInfo;
      }
      
      return response.data;
    } catch (error) {
      // Handle networking errors
      if (!error.response) {
        console.error('Network error in API service:', error.message);
        throw {
          status: 0,
          statusText: 'Network Error',
          message: 'Cannot connect to the API server. Please check your connection.',
          error: error.message
        };
      }
      
      // Handle API server errors
      console.error('Error in API service:', error);
      
      // If the error has a response with data property, it's from our proxy
      if (error.response?.data) {
        throw error.response.data;
      }
      
      // Otherwise, it's likely a client-side error
      throw error;
    }
  }

  /**
   * Check if the API server is running
   * 
   * @returns {Promise<boolean>} - Whether the API server is available
   */
  async checkHealth() {
    try {
      const response = await this.get('/health');
      return response.data.status === 'ok';
    } catch (error) {
      console.error('API server health check failed:', error);
      return false;
    }
  }

  /**
   * Get recommendations from the server
   * (History component should use getRecommendationsReadOnly instead)
   * 
   * @param {string} type - 'tv' or 'movie'
   * @param {string} [username] - Optional username for user-specific recommendations
   * @returns {Promise<Array>} - Recommendations
   */
  async getRecommendations(type, username) {
    try {
      const endpoint = username 
        ? `/recommendations/${type}?username=${encodeURIComponent(username)}`
        : `/recommendations/${type}`;
      const response = await this.get(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Failed to get ${type} recommendations:`, error);
      return [];
    }
  }
  
  /**
   * Get recommendations from the server in read-only mode (doesn't trigger save)
   * This should be used by History component to avoid overwriting data
   * 
   * @param {string} type - 'tv' or 'movie'
   * @param {string} [username] - Optional username for user-specific recommendations
   * @returns {Promise<Array>} - Recommendations
   */
  async getRecommendationsReadOnly(type, username) {
    try {
      // This calls a different endpoint entirely, ensuring no side effects
      const endpoint = username 
        ? `/recommendations-readonly/${type}?username=${encodeURIComponent(username)}`
        : `/recommendations-readonly/${type}`;
      const response = await this.get(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Failed to get ${type} recommendations (readonly):`, error);
      return [];
    }
  }

  /**
   * Save recommendations to the server
   * 
   * @param {string} type - 'tv' or 'movie'
   * @param {Array} recommendations - Recommendations to save
   * @param {string} [username] - Optional username for user-specific recommendations
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async saveRecommendations(type, recommendations, username) {
    try {
      const endpoint = username 
        ? `/recommendations/${type}?username=${encodeURIComponent(username)}`
        : `/recommendations/${type}`;
      await this.post(endpoint, recommendations);
      return true;
    } catch (error) {
      console.error(`Failed to save ${type} recommendations:`, error);
      return false;
    }
  }

  /**
   * Get user settings
   * 
   * @returns {Promise<Object>} - User settings
   * @deprecated Use getSetting for individual settings instead
   */
  async getSettings() {
    try {
      const response = await this.get('/settings');
      return response.data;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  }

  /**
   * Get a specific user setting
   * 
   * @param {string} settingName - The name of the setting to get
   * @returns {Promise<any>} - The setting value
   */
  async getSetting(settingName) {
    try {
      const response = await this.get(`/settings/${settingName}`);
      return response.data.value;
    } catch (error) {
      console.error(`Failed to get setting ${settingName}:`, error);
      return null;
    }
  }

  /**
   * Save user settings
   * 
   * @param {Object} settings - Settings to save
   * @returns {Promise<boolean>} - Whether the save was successful
   * @deprecated Use saveSetting for individual settings instead
   */
  async saveSettings(settings) {
    try {
      await this.post('/settings', settings);
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * Save a specific user setting
   * 
   * @param {string} settingName - The name of the setting to save
   * @param {any} value - The value to save
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async saveSetting(settingName, value) {
    try {
      // Wrap the value in an object to ensure it's sent as JSON
      await this.post(`/settings/${settingName}`, { value });
      return true;
    } catch (error) {
      console.error(`Failed to save setting ${settingName}:`, error);
      return false;
    }
  }

  /**
   * Get watch history from the server
   * 
   * @param {string} type - 'movies' or 'shows'
   * @returns {Promise<Array>} - Watch history
   */
  async getWatchHistory(type) {
    try {
      const response = await this.get(`/watch-history/${type}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to get ${type} watch history:`, error);
      return [];
    }
  }

  /**
   * Save watch history to the server
   * 
   * @param {string} type - 'movies' or 'shows'
   * @param {Array} items - Watch history items to save
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async saveWatchHistory(type, items) {
    try {
      await this.post(`/watch-history/${type}`, items);
      console.log(`Saved ${items.length} ${type} watch history items to server`);
      return true;
    } catch (error) {
      console.error(`Failed to save ${type} watch history:`, error);
      return false;
    }
  }

  /**
   * Set the current user information
   * This should be called by AuthService after login/logout
   * 
   * @param {Object} user - User information
   */
  setCurrentUser(user) {
    this.currentUser = user;
  }

  /**
   * Get the current user information
   * 
   * @returns {Object|null} - Current user information or null if not logged in
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get user preferences (liked/disliked items)
   * 
   * @param {string} type - 'tv' or 'movie'
   * @param {string} preference - 'liked' or 'disliked'
   * @returns {Promise<Array>} - User preferences
   */
  async getPreferences(type, preference) {
    try {
      const response = await this.get(`/preferences/${type}/${preference}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get ${type} ${preference} preferences:`, error);
      return [];
    }
  }

  /**
   * Save user preferences (liked/disliked items)
   * 
   * @param {string} type - 'tv' or 'movie'
   * @param {string} preference - 'liked' or 'disliked'
   * @param {Array} items - Items to save
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async savePreferences(type, preference, items) {
    try {
      await this.post(`/preferences/${type}/${preference}`, items);
      return true;
    } catch (error) {
      console.error(`Failed to save ${type} ${preference} preferences:`, error);
      return false;
    }
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;
