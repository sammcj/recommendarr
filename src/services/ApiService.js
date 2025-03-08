import axios from 'axios';

/**
 * Client-side API service for communicating with our proxy server
 */
class ApiService {
  constructor() {
    // Initialize with default or environment value 
    this.baseUrl = process.env.VUE_APP_API_URL || this.detectApiUrl();
    
    // If URL doesn't include /api path suffix, add it
    if (this.baseUrl && !this.baseUrl.endsWith('/api')) {
      this.baseUrl = this.baseUrl.endsWith('/') 
        ? `${this.baseUrl}api` 
        : `${this.baseUrl}/api`;
    }
    
    console.log(`Initial API URL: ${this.baseUrl}`);
    
    // Create axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl
    });
    
    // Add response interceptor to handle 401 errors globally
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        // If we receive a 401 Unauthorized error, it means our session has expired
        // or the token is invalid - we should force logout
        if (error.response && error.response.status === 401) {
          console.log('Session expired or invalid token checking...', error.config?.url);
          
          // Skip auth-related paths to prevent loops
          const skipPaths = ['/auth/login', '/auth/logout', '/auth/register'];
          const isAuthRequest = error.config && 
                               error.config.url && 
                               skipPaths.some(path => error.config.url.includes(path));
          
          // Only trigger logout for non-auth-related requests when we have a token stored
          const hasStoredToken = localStorage.getItem('auth_token');
          
          if (!isAuthRequest && hasStoredToken) {
            console.log('Valid session timeout detected, logging out...');
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
    
    // Initialize with any stored auth token
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('Setting stored auth token in ApiService');
        this.setHeader('Authorization', `Bearer ${token}`);
      } else {
        console.log('No stored auth token found');
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
   * Try to detect the best API URL based on the current environment
   * @private
   * @returns {string} API URL
   */
  detectApiUrl() {
    // Default fallback when running locally for development
    let apiBaseUrl = 'http://localhost:3050/api';
    
    // Get the current URL details
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    
    // In the unified container, the API is running on port 3050
    // and the frontend on port 3030
    if (port === '3030') {
      // When accessed via the frontend port in container
      apiBaseUrl = `${protocol}//${host}:3050/api`;
    } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // For other non-local environments, access API on same host with /api path
      apiBaseUrl = `${protocol}//${host}:3050/api`;
    } else {
      // For local development
      apiBaseUrl = `${protocol}//${host}:3050/api`;
    }
    
    console.log('Using API URL:', apiBaseUrl);
    return apiBaseUrl;
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
   * 
   * @param {string} type - 'tv' or 'movie'
   * @returns {Promise<Array>} - Recommendations
   */
  async getRecommendations(type) {
    try {
      const response = await this.get(`/recommendations/${type}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get ${type} recommendations:`, error);
      return [];
    }
  }

  /**
   * Save recommendations to the server
   * 
   * @param {string} type - 'tv' or 'movie'
   * @param {Array} recommendations - Recommendations to save
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async saveRecommendations(type, recommendations) {
    try {
      await this.post(`/recommendations/${type}`, recommendations);
      return true;
    } catch (error) {
      console.error(`Failed to save ${type} recommendations:`, error);
      return false;
    }
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

  /**
   * Get user settings
   * 
   * @returns {Promise<Object>} - User settings
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
   * Save user settings
   * 
   * @param {Object} settings - Settings to save
   * @returns {Promise<boolean>} - Whether the save was successful
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
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;