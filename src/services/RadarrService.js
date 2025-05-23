import axios from 'axios';
import apiService from './ApiService';
import credentialsService from './CredentialsService';

class RadarrService {
constructor() {
    this.apiKey = '';
    this.baseUrl = '';
    // Flag to determine if we should use the proxy
    this.useProxy = true;
    // Flag to track if credentials have been loaded
    this.credentialsLoaded = false;
    // Removed automatic loading of credentials to prevent double loading
  }
  
  /**
   * Load credentials from server-side storage
   * @returns {Promise<boolean>} - Whether credentials were loaded successfully
   */
  async loadCredentials() {
    // Skip if already loaded to prevent double loading
    if (this.credentialsLoaded) {
      return true;
    }
    
    try {
      const credentials = await credentialsService.getCredentials('radarr');
      
      if (credentials && credentials.baseUrl && credentials.apiKey) {
        
        
        // Only update if the credentials are valid (non-empty strings)
        if (typeof credentials.baseUrl === 'string' && credentials.baseUrl.trim() !== '' &&
            typeof credentials.apiKey === 'string' && credentials.apiKey.trim() !== '') {
          this.baseUrl = credentials.baseUrl;
          this.apiKey = credentials.apiKey;
          
          
          this.credentialsLoaded = true; // Set flag after successful load
          return true;
        } else {
          console.warn('Found Radarr credentials but they contain empty values - not updating local credentials');
          // Important: Don't update this.baseUrl or this.apiKey with invalid values
          return false;
        }
      } else {
        
        return false;
      }
    } catch (error) {
      console.error('Error loading Radarr credentials:', error);
      // Don't clear existing credentials on error
      
      return false;
    }
  }
  
  /**
   * Helper method to make API requests through proxy if enabled
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} data - Request body
   * @param {Object} params - URL parameters
   * @returns {Promise<Object>} - Response data
   * @private
   */
  async _apiRequest(endpoint, method = 'GET', data = null, params = {}) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    let retryCount = 0;
    
    // Check if service is configured with valid credentials
    if (!this.isConfigured()) {
      
      
      // Only load credentials if they haven't been loaded yet
      if (!this.credentialsLoaded) {
        await this.loadCredentials();
        
        // Double-check configuration after loading credentials
        if (!this.isConfigured()) {
          console.error('Radarr service is not configured after credential load attempt');
          throw new Error('Radarr service is not configured. Please set valid baseUrl and apiKey.');
        }
      } else {
        // Credentials were already loaded but service is still not configured
        console.error('Radarr service is not configured even though credentials were loaded');
        throw new Error('Radarr service is not configured. Please set valid baseUrl and apiKey.');
      }
    }

    // Always include API key in params
    const requestParams = { 
      ...params,
      apiKey: this.apiKey 
    };
    
    const url = `${this.baseUrl}${endpoint}`;
    
    while (retryCount <= maxRetries) {
      try {
        if (this.useProxy) {
          // Log attempt to connect through proxy for debugging
          
          
          const response = await apiService.proxyRequest({
            url,
            method,
            data,
            params: requestParams
          });
          
          // The proxy returns the data wrapped, we need to unwrap it
          return response.data;
        } else {
          // Direct API request
          
          
          const response = await axios({
            url,
            method,
            data,
            params: requestParams,
            // Removed timeout to allow slower network connections
          });
          
          return response.data;
        }
      } catch (error) {
        if (retryCount === maxRetries || 
            (error.response && error.response.status < 500)) {
          console.error(`Final attempt failed in Radarr API request to ${endpoint}:`, error);
          
          // Enhance the error with more helpful information
          const enhancedError = {
            ...error,
            message: error.message || 'Unknown error',
            endpoint,
            url
          };
          
          throw enhancedError;
        }
        
        const delay = baseDelay * Math.pow(2, retryCount);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
  }

  /**
   * Configure the Radarr service with API details
   * @param {string} baseUrl - The base URL of your Radarr instance (e.g., http://localhost:7878)
   * @param {string} apiKey - Your Radarr API key
   * @returns {Promise<boolean>} - Whether the configuration was successful
   */
  async configure(baseUrl, apiKey) {
    // Validate inputs before storing
    if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
      console.error('Invalid baseUrl provided to Radarr configure method');
      return false;
    }
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      console.error('Invalid apiKey provided to Radarr configure method');
      return false;
    }
    
    // Normalize the URL by removing trailing slashes
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    
    
    
    try {
      // Store credentials server-side
      const success = await credentialsService.storeCredentials('radarr', {
        baseUrl: this.baseUrl,
        apiKey: this.apiKey
      });
      
      if (!success) {
        console.error('Failed to store Radarr credentials');
        return false;
      }
      
      
      return true;
    } catch (error) {
      console.error('Error storing Radarr credentials:', error);
      return false;
    }
  }

  /**
   * Check if the service is configured with API key and URL
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    // Check for valid non-empty strings
    return typeof this.apiKey === 'string' && this.apiKey.trim() !== '' && 
           typeof this.baseUrl === 'string' && this.baseUrl.trim() !== '';
  }

  /**
   * Extract essential movie information for storage and LLM requests
   * @param {Array} moviesData - Full movies data from Radarr API
   * @returns {Array} - Array of simplified movie objects with only essential information
   * @private
   */
  _extractMovieEssentials(moviesData) {
    if (!Array.isArray(moviesData)) {
      console.error('Invalid movie data provided to _extractMovieEssentials');
      return [];
    }
    
    return moviesData.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId,
      status: movie.status,
      overview: movie.overview ? movie.overview.substring(0, 200) : '', // Truncate overview to save space
      studio: movie.studio || '',
      genres: Array.isArray(movie.genres) ? movie.genres : []
    }));
  }

  /**
   * Get all movies from Radarr
   * @param {boolean} [forceRefresh=false] - Force refresh from API instead of using cached data
   * @returns {Promise<Array>} - List of movies
   */
  async getMovies(forceRefresh = false) {
    try {
      // Check if we have data in the database and it's not a forced refresh
      if (!forceRefresh) {
        try {
          // Try to get library from database via API
          const response = await apiService.get('/radarr/library');
          
          if (response.data && Array.isArray(response.data)) {
            
            return response.data;
          }
        } catch (dbError) {
          console.error('Error accessing database for Radarr library:', dbError);
          // Continue to API request if database access fails
        }
      }
      
      // If no cached data or force refresh, get from API
      
      const moviesData = await this._apiRequest('/api/v3/movie');
      
      // Extract essential information before saving to database
      const essentialMoviesData = this._extractMovieEssentials(moviesData);
      
      // Save to database for future use
      try {
        // Save library to database via API
        await apiService.post('/radarr/library', essentialMoviesData);
        
      } catch (saveError) {
        console.error('Error saving Radarr library to database:', saveError);
        // Continue even if save fails
      }
      
      return moviesData;
    } catch (error) {
      console.error('Error fetching movies from Radarr:', error);
      
      // If API request fails, try to fall back to database
      try {
        // Try to get library from database as fallback
        const response = await apiService.get('/radarr/library');
        
        if (response.data && Array.isArray(response.data)) {
          
          return response.data;
        }
      } catch (dbError) {
        console.error('Error accessing database for fallback Radarr library:', dbError);
      }
      
      // If both API and database fallback fail, rethrow the original error
      throw error;
    }
  }
  
  /**
   * Force refresh of the Radarr library from the API
   * @returns {Promise<Array>} - Updated list of movies
   */
  async refreshLibrary() {
    try {
      
      const moviesData = await this._apiRequest('/api/v3/movie');
      
      // Extract essential information before saving to database
      const essentialMoviesData = this._extractMovieEssentials(moviesData);
      
      // Save to database for all users via the refresh-all endpoint
      try {
        // Save library to database via API for all users
        await apiService.post('/radarr/library/refresh-all', essentialMoviesData);
        
      } catch (saveError) {
        console.error('Error saving Radarr library to database for all users:', saveError);
        // Continue even if save fails
      }
      
      return moviesData;
    } catch (error) {
      console.error('Error refreshing Radarr library:', error);
      
      // If API request fails, try to fall back to database
      try {
        // Try to get library from database as fallback
        const response = await apiService.get('/radarr/library');
        
        if (response.data && Array.isArray(response.data)) {
          
          return response.data;
        }
      } catch (dbError) {
        console.error('Error accessing database for fallback Radarr library:', dbError);
      }
      
      // If both API and database fallback fail, rethrow the original error
      throw error;
    }
  }
  
  /**
   * Check if a movie already exists in the Radarr library
   * @param {string} title - The movie title to search for
   * @returns {Promise<Object|null>} - Movie info if found in library, null otherwise
   */
  async findExistingMovieByTitle(title) {
    try {
      // Search in the existing library - use getMovies which handles caching
      const libraryData = await this.getMovies();
      
      // Look for exact match first
      let match = libraryData.find(movie => 
        movie.title.toLowerCase() === title.toLowerCase()
      );
      
      // If no exact match, try a more flexible search
      if (!match) {
        match = libraryData.find(movie => 
          movie.title.toLowerCase().includes(title.toLowerCase()) || 
          title.toLowerCase().includes(movie.title.toLowerCase())
        );
      }
      
      return match || null;
    } catch (error) {
      console.error(`Error checking if movie "${title}" exists in Radarr:`, error);
      return null;
    }
  }

  /**
   * Search for a movie by title in Radarr
   * @param {string} title - The movie title to search for
   * @returns {Promise<Object|null>} - Movie info if found, null otherwise
   */
  async findMovieByTitle(title) {
    try {
      // First try to search in existing library - use getMovies which handles caching
      const libraryData = await this.getMovies();
      
      // Find closest match in library
      const libraryMatch = libraryData.find(movie => 
        movie.title.toLowerCase() === title.toLowerCase()
      );
      
      if (libraryMatch) {
        return libraryMatch;
      }
      
      // If not found in library, search lookup
      // Make sure we're not adding any wildcards or special characters
      const cleanTitle = title.trim();
      
      // Use the API request helper with the term as a parameter
      const lookupData = await this._apiRequest('/api/v3/movie/lookup', 'GET', null, { term: cleanTitle });
      
      if (lookupData && lookupData.length > 0) {
        return lookupData[0];
      }
      
      return null;
    } catch (error) {
      console.error(`Error searching for movie "${title}" in Radarr:`, error);
      return null;
    }
  }

  /**
   * Test the connection to Radarr
   * @returns {Promise<{success: boolean, message: string}>} - Connection test result with message
   */
  async testConnection() {
    try {
      // First ensure we have valid credentials
      if (!this.isConfigured()) {
        
        await this.loadCredentials();
        
        if (!this.isConfigured()) {
          console.error('Cannot test connection: Radarr service is not configured with valid credentials');
          return { 
            success: false, 
            message: 'Radarr service is not configured with valid credentials. Please configure baseUrl and apiKey.'
          };
        }
      }
      
      
      const systemStatus = await this._apiRequest('/api/v3/system/status');
      
      // Log successful connection with version info if available
      if (systemStatus && systemStatus.version) {
        
        return { 
          success: true, 
          message: `Successfully connected to Radarr v${systemStatus.version}` 
        };
      }
      
      return { 
        success: true, 
        message: 'Successfully connected to Radarr' 
      };
    } catch (error) {
      console.error('Error connecting to Radarr:', error);
      
      // Provide a more helpful error message
      let errorMessage = 'Failed to connect to Radarr';
      
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      if (error.response && error.response.status) {
        errorMessage += ` (Status: ${error.response.status})`;
      }
      
      return { 
        success: false, 
        message: errorMessage
      };
    }
  }

  /**
   * Get quality profiles from Radarr
   * @returns {Promise<Array>} - List of quality profiles
   */
  async getQualityProfiles() {
    try {
      return await this._apiRequest('/api/v3/qualityprofile');
    } catch (error) {
      console.error('Error fetching quality profiles from Radarr:', error);
      throw error;
    }
  }

  /**
   * Get root folders from Radarr
   * @returns {Promise<Array>} - List of root folders
   */
  async getRootFolders() {
    try {
      return await this._apiRequest('/api/v3/rootfolder');
    } catch (error) {
      console.error('Error fetching root folders from Radarr:', error);
      throw error;
    }
  }

  /**
   * Get all available tags from Radarr
   * @returns {Promise<Array>} - List of tags
   */
  async getTags() {
    try {
      return await this._apiRequest('/api/v3/tag');
    } catch (error) {
      console.error('Error fetching tags from Radarr:', error);
      throw error;
    }
  }

  /**
   * Create a new tag in Radarr
   * @param {string} label - The tag label/name
   * @returns {Promise<Object>} - The created tag object
   */
  async createTag(label) {
    try {
      return await this._apiRequest('/api/v3/tag', 'POST', { label });
    } catch (error) {
      console.error(`Error creating tag "${label}" in Radarr:`, error);
      throw error;
    }
  }

  /**
   * Look up a movie by title in Radarr API
   * @param {string} title - The title to search for
   * @returns {Promise<Object>} - Movie details from the lookup, including ratings if available
   */
  async lookupMovie(title) {
    try {
      const cleanTitle = title.trim();
      const lookupData = await this._apiRequest('/api/v3/movie/lookup', 'GET', null, { term: cleanTitle });
      
      if (!lookupData || lookupData.length === 0) {
        throw new Error(`Movie "${title}" not found in Radarr lookup.`);
      }
      
      // The first result is typically the most relevant
      const movieData = lookupData[0];
      
      return movieData;
    } catch (error) {
      console.error(`Error looking up movie "${title}" in Radarr:`, error);
      throw error;
    }
  }

  /**
   * Add a movie to Radarr
   * @param {string} title - The movie title to search for
   * @param {number} [qualityProfileId] - Quality profile ID to use (optional)
   * @param {string} [rootFolderPath] - Root folder path to use (optional)
   * @param {Array<number>} [tags] - Array of tag IDs to apply (optional)
   * @returns {Promise<Object>} - The added movie object
   */
  async addMovie(title, qualityProfileId = null, rootFolderPath = null, tags = []) {
    try {
      // 1. Look up the movie to get details
      const movieData = await this.lookupMovie(title);
      
      // 2. Get quality profiles and root folders if not provided
      const [qualityProfiles, rootFolders] = await Promise.all([
        this.getQualityProfiles(),
        this.getRootFolders()
      ]);
      
      if (!qualityProfiles.length) {
        throw new Error('No quality profiles found in Radarr.');
      }
      
      if (!rootFolders.length) {
        throw new Error('No root folders found in Radarr.');
      }
      
      // Use provided values or default to the first available option
      const selectedQualityProfileId = qualityProfileId || qualityProfiles[0].id;
      const selectedRootFolderPath = rootFolderPath || rootFolders[0].path;
      
      // 3. Prepare payload for adding the movie
      const payload = {
        title: movieData.title,
        tmdbId: movieData.tmdbId,
        year: movieData.year,
        qualityProfileId: selectedQualityProfileId,
        rootFolderPath: selectedRootFolderPath,
        monitored: true,
        tags: tags, // Add the tags array
        addOptions: {
          searchForMovie: true
        }
      };
      
      // 4. Add the movie
      return await this._apiRequest('/api/v3/movie', 'POST', payload);
    } catch (error) {
      console.error(`Error adding movie "${title}" to Radarr:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const radarrService = new RadarrService();

export default radarrService;
