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
    
    // Try to load saved settings after initialization
    this.loadSavedSettings();
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
      const response = await axios.post(`${this.baseUrl}/proxy`, options);
      
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
      const response = await axios.get(`${this.baseUrl}/health`);
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
      const response = await axios.get(`${this.baseUrl}/recommendations/${type}`);
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
      await axios.post(`${this.baseUrl}/recommendations/${type}`, recommendations);
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
      const response = await axios.get(`${this.baseUrl}/preferences/${type}/${preference}`);
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
      await axios.post(`${this.baseUrl}/preferences/${type}/${preference}`, items);
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
      const response = await axios.get(`${this.baseUrl}/settings`);
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
      await axios.post(`${this.baseUrl}/settings`, settings);
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;