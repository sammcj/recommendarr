import axios from 'axios';
import apiService from './ApiService';
import credentialsService from './CredentialsService';

class TMDBService {
  constructor() {
    this.apiKey = '';
    this.baseUrl = 'https://api.themoviedb.org/3';
    this.imageBaseUrl = 'https://image.tmdb.org/t/p/w500'; // Default image base URL
    this.useProxy = true;
    
    // Load credentials when instantiated
    this.loadCredentials();
  }
  
  /**
   * Load TMDB credentials from server-side storage
   * @returns {Promise<boolean>} - Whether credentials were loaded successfully
   */
  async loadCredentials() {
    try {
      const credentials = await credentialsService.getCredentials('tmdb');
      
      if (credentials && credentials.apiKey) {
        console.log('Found TMDB credentials in server storage');
        
        // Only update if the credentials are valid (non-empty)
        this.apiKey = credentials.apiKey;
        
        // If we have a valid API key, fetch the configuration for image URLs
        await this.fetchConfiguration();
        
        return true;
      } else {
        console.log('No valid TMDB credentials found in server storage');
        return false;
      }
    } catch (error) {
      console.error('Error loading TMDB credentials:', error);
      return false;
    }
  }
  
  /**
   * Check if the service is configured
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    return Boolean(this.apiKey);
  }
  
  /**
   * Fetch TMDB configuration for image URLs
   * @returns {Promise<void>}
   */
  async fetchConfiguration() {
    if (!this.isConfigured()) return;
    
    try {
      const config = await this._apiRequest('/configuration');
      
      if (config && config.images && config.images.secure_base_url) {
        this.imageBaseUrl = config.images.secure_base_url + 'w500';
        console.log(`TMDB image base URL: ${this.imageBaseUrl}`);
      }
    } catch (error) {
      console.error('Error fetching TMDB configuration:', error);
      // Fall back to default image base URL if configuration fetch fails
    }
  }
  
  /**
   * Helper method to make API requests
   * @param {string} endpoint - API endpoint
   * @param {Object} params - URL parameters
   * @returns {Promise<Object>} - Response data
   * @private
   */
  async _apiRequest(endpoint, params = {}) {
    if (!this.isConfigured()) {
      // Try to load credentials again in case they weren't ready during init
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('TMDB service is not configured. Please set apiKey.');
      }
    }

    // Always include API key in params
    const requestParams = { 
      ...params,
      api_key: this.apiKey
    };
    
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      if (this.useProxy) {
        // Use proxy to avoid CORS issues
        console.log(`Making request to TMDB via proxy: ${endpoint}`);
        
        const response = await apiService.proxyRequest({
          url,
          method: 'GET',
          params: requestParams
        });
        
        return response.data;
      } else {
        // Direct API request
        console.log(`Making direct request to TMDB: ${endpoint}`);
        
        const response = await axios({
          url,
          method: 'GET',
          params: requestParams
        });
        
        return response.data;
      }
    } catch (error) {
      console.error(`Error in TMDB API request to ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for a movie by title
   * @param {string} title - Movie title to search for
   * @returns {Promise<Object|null>} - Movie info or null if not found
   */
  async findMovieByTitle(title) {
    try {
      console.log(`Searching TMDB for movie: ${title}`);
      
      const results = await this._apiRequest('/search/movie', {
        query: title,
        include_adult: false,
        language: 'en-US',
        page: 1
      });
      
      if (results && results.results && results.results.length > 0) {
        // Get the first (most relevant) result
        const movie = results.results[0];
        
        // Format response to match Radarr format
        return {
          title: movie.title,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
          tmdbId: movie.id,
          images: [
            {
              coverType: 'poster',
              remoteUrl: movie.poster_path ? this.getFullImageUrl(movie.poster_path) : null
            }
          ],
          overview: movie.overview
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding movie by title "${title}":`, error);
      return null;
    }
  }
  
  /**
   * Search for a TV show by title
   * @param {string} title - TV show title to search for
   * @returns {Promise<Object|null>} - TV show info or null if not found
   */
  async findSeriesByTitle(title) {
    try {
      console.log(`Searching TMDB for TV show: ${title}`);
      
      const results = await this._apiRequest('/search/tv', {
        query: title,
        include_adult: false,
        language: 'en-US',
        page: 1
      });
      
      if (results && results.results && results.results.length > 0) {
        // Get the first (most relevant) result
        const show = results.results[0];
        
        // Format response to match Sonarr format
        return {
          title: show.name,
          year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
          tmdbId: show.id,
          images: [
            {
              coverType: 'poster',
              remoteUrl: show.poster_path ? this.getFullImageUrl(show.poster_path) : null
            }
          ],
          overview: show.overview
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding TV show by title "${title}":`, error);
      return null;
    }
  }
  
  /**
   * Get full image URL from relative path
   * @param {string} path - Relative image path
   * @returns {string} - Full image URL
   */
  getFullImageUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path; // Already a full URL
    
    // Ensure path starts with a slash
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.imageBaseUrl}${formattedPath}`;
  }
}

// Create a singleton instance
const tmdbService = new TMDBService();

export default tmdbService;