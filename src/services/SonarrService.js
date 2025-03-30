import axios from 'axios';
import apiService from './ApiService';
import credentialsService from './CredentialsService';

class SonarrService {
  constructor() {
    this.apiKey = '';
    this.baseUrl = '';
    // Flag to determine if we should use the proxy
    this.useProxy = true;
    // Load credentials when instantiated
    this.loadCredentials();
  }
  
  /**
   * Load credentials from server-side storage
   */
  async loadCredentials() {
    const credentials = await credentialsService.getCredentials('sonarr');
    if (credentials) {
      this.baseUrl = credentials.baseUrl || '';
      this.apiKey = credentials.apiKey || '';
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
    
    if (!this.isConfigured()) {
      // Try to load credentials again in case they weren't ready during init
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
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
          console.log(`Making ${method} request to Sonarr via proxy: ${endpoint}`);
          
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
          console.log(`Making direct ${method} request to Sonarr: ${endpoint}`);
          
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
          console.error(`Final attempt failed in Sonarr API request to ${endpoint}:`, error);
          
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
        console.log(`Retry ${retryCount + 1}/${maxRetries} in ${delay}ms for ${endpoint}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
  }

  /**
   * Configure the Sonarr service with API details
   * @param {string} baseUrl - The base URL of your Sonarr instance (e.g., http://localhost:8989)
   * @param {string} apiKey - Your Sonarr API key
   */
  async configure(baseUrl, apiKey) {
    // Normalize the URL by removing trailing slashes
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    this.apiKey = apiKey;
    
    // Store credentials server-side
    await credentialsService.storeCredentials('sonarr', {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey
    });
  }

  /**
   * Check if the service is configured with API key and URL
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    return this.apiKey && this.baseUrl;
  }

  /**
   * Extract essential series information for storage and LLM requests
   * @param {Array} seriesData - Full series data from Sonarr API
   * @returns {Array} - Array of simplified series objects with only essential information
   * @private
   */
  _extractSeriesEssentials(seriesData) {
    if (!Array.isArray(seriesData)) {
      console.error('Invalid series data provided to _extractSeriesEssentials');
      return [];
    }
    
    return seriesData.map(series => ({
      id: series.id,
      title: series.title,
      year: series.year,
      tvdbId: series.tvdbId,
      status: series.status,
      overview: series.overview ? series.overview.substring(0, 200) : '', // Truncate overview to save space
      network: series.network || '',
      genres: Array.isArray(series.genres) ? series.genres : []
    }));
  }

  /**
   * Get all series from Sonarr
   * @param {boolean} [forceRefresh=false] - Force refresh from API instead of using cached data
   * @returns {Promise<Array>} - List of TV shows
   */
  async getSeries(forceRefresh = false) {
    try {
      // Check if we have data in the database and it's not a forced refresh
      if (!forceRefresh) {
        try {
          // Try to get library from database via API
          const response = await apiService.get('/sonarr/library');
          
          if (response.data && Array.isArray(response.data)) {
            console.log('Using cached Sonarr library from database');
            return response.data;
          }
        } catch (dbError) {
          console.error('Error accessing database for Sonarr library:', dbError);
          // Continue to API request if database access fails
        }
      }
      
      // If no cached data or force refresh, get from API
      console.log(forceRefresh ? 'Forcing refresh of Sonarr library from API' : 'No cached data, fetching Sonarr library from API');
      const seriesData = await this._apiRequest('/api/v3/series');
      
      // Extract essential information before saving to database
      const essentialSeriesData = this._extractSeriesEssentials(seriesData);
      
      // Save to database for future use
      try {
        // Save library to database via API
        await apiService.post('/sonarr/library', essentialSeriesData);
        console.log('Saved Sonarr library to database (essential data only)');
      } catch (saveError) {
        console.error('Error saving Sonarr library to database:', saveError);
        // Continue even if save fails
      }
      
      return seriesData;
    } catch (error) {
      console.error('Error fetching series from Sonarr:', error);
      
      // If API request fails, try to fall back to database
      try {
        // Try to get library from database as fallback
        const response = await apiService.get('/sonarr/library');
        
        if (response.data && Array.isArray(response.data)) {
          console.log('API request failed, using cached Sonarr library from database');
          return response.data;
        }
      } catch (dbError) {
        console.error('Error accessing database for fallback Sonarr library:', dbError);
      }
      
      // If both API and database fallback fail, rethrow the original error
      throw error;
    }
  }
  
  /**
   * Force refresh of the Sonarr library from the API
   * @returns {Promise<Array>} - Updated list of TV shows
   */
  async refreshLibrary() {
    try {
      console.log('Forcing refresh of Sonarr library from API');
      const seriesData = await this._apiRequest('/api/v3/series');
      
      // Extract essential information before saving to database
      const essentialSeriesData = this._extractSeriesEssentials(seriesData);
      
      // Save to database for all users via the refresh-all endpoint
      try {
        // Save library to database via API for all users
        await apiService.post('/sonarr/library/refresh-all', essentialSeriesData);
        console.log('Saved Sonarr library to database for all users (essential data only)');
      } catch (saveError) {
        console.error('Error saving Sonarr library to database for all users:', saveError);
        // Continue even if save fails
      }
      
      return seriesData;
    } catch (error) {
      console.error('Error refreshing Sonarr library:', error);
      
      // If API request fails, try to fall back to database
      try {
        // Try to get library from database as fallback
        const response = await apiService.get('/sonarr/library');
        
        if (response.data && Array.isArray(response.data)) {
          console.log('API request failed, using cached Sonarr library from database');
          return response.data;
        }
      } catch (dbError) {
        console.error('Error accessing database for fallback Sonarr library:', dbError);
      }
      
      // If both API and database fallback fail, rethrow the original error
      throw error;
    }
  }
  
  /**
   * Check if a series already exists in the Sonarr library
   * @param {string} title - The series title to search for
   * @returns {Promise<Object|null>} - Series info if found in library, null otherwise
   */
  async findExistingSeriesByTitle(title) {
    try {
      // Search in the existing library - use getSeries which handles caching
      const libraryData = await this.getSeries();
      
      // Look for exact match first
      let match = libraryData.find(show => 
        show.title.toLowerCase() === title.toLowerCase()
      );
      
      // If no exact match, try a more flexible search
      if (!match) {
        match = libraryData.find(show => 
          show.title.toLowerCase().includes(title.toLowerCase()) || 
          title.toLowerCase().includes(show.title.toLowerCase())
        );
      }
      
      return match || null;
    } catch (error) {
      console.error(`Error checking if series "${title}" exists in Sonarr:`, error);
      return null;
    }
  }

  /**
   * Search for a series by title in Sonarr
   * @param {string} title - The series title to search for
   * @returns {Promise<Object|null>} - Series info if found, null otherwise
   */
  async findSeriesByTitle(title) {
    try {
      // First try to search in existing library - use getSeries which handles caching
      const libraryData = await this.getSeries();
      
      // Find closest match in library
      const libraryMatch = libraryData.find(show => 
        show.title.toLowerCase() === title.toLowerCase()
      );
      
      if (libraryMatch) {
        return libraryMatch;
      }
      
      // If not found in library, search lookup
      // Make sure we're not adding any wildcards or special characters
      const cleanTitle = title.trim();
      
      // Use the API request helper with the term as a parameter
      const lookupData = await this._apiRequest('/api/v3/series/lookup', 'GET', null, { term: cleanTitle });
      
      if (lookupData && lookupData.length > 0) {
        return lookupData[0];
      }
      
      return null;
    } catch (error) {
      console.error(`Error searching for series "${title}" in Sonarr:`, error);
      return null;
    }
  }

  /**
   * Test the connection to Sonarr
   * @returns {Promise<boolean>} - Whether the connection is successful
   */
  async testConnection() {
    try {
      console.log('Testing Sonarr connection with URL:', this.baseUrl);
      await this._apiRequest('/api/v3/system/status');
      console.log('Sonarr connection successful');
      return true;
    } catch (error) {
      console.error('Error connecting to Sonarr:', error);
      // Log more detailed diagnostics information
      if (this.useProxy) {
        console.log('Using proxy mode - check server logs for details');
      } else {
        console.log('Using direct connection mode');
      }
      return false;
    }
  }

  /**
   * Get quality profiles from Sonarr
   * @returns {Promise<Array>} - List of quality profiles
   */
  async getQualityProfiles() {
    try {
      return await this._apiRequest('/api/v3/qualityprofile');
    } catch (error) {
      console.error('Error fetching quality profiles from Sonarr:', error);
      throw error;
    }
  }

  /**
   * Get root folders from Sonarr
   * @returns {Promise<Array>} - List of root folders
   */
  async getRootFolders() {
    try {
      return await this._apiRequest('/api/v3/rootfolder');
    } catch (error) {
      console.error('Error fetching root folders from Sonarr:', error);
      throw error;
    }
  }

  /**
   * Look up a series by title in Sonarr API
   * @param {string} title - The title to search for
   * @returns {Promise<Object>} - Series details from the lookup, including ratings if available
   */
  async lookupSeries(title) {
    try {
      const cleanTitle = title.trim();
      const lookupData = await this._apiRequest('/api/v3/series/lookup', 'GET', null, { term: cleanTitle });
      
      if (!lookupData || lookupData.length === 0) {
        throw new Error(`Series "${title}" not found in Sonarr lookup.`);
      }
      
      // The first result is typically the most relevant
      const seriesData = lookupData[0];
      
      // Log ratings data if available for debugging
      if (seriesData.ratings) {
        console.log(`Found ratings data for "${title}":`, seriesData.ratings);
      }
      
      return seriesData;
    } catch (error) {
      console.error(`Error looking up series "${title}" in Sonarr:`, error);
      throw error;
    }
  }
  
  /**
   * Get all available tags from Sonarr
   * @returns {Promise<Array>} - List of tags
   */
  async getTags() {
    try {
      return await this._apiRequest('/api/v3/tag');
    } catch (error) {
      console.error('Error fetching tags from Sonarr:', error);
      throw error;
    }
  }

  /**
   * Create a new tag in Sonarr
   * @param {string} label - The tag label/name
   * @returns {Promise<Object>} - The created tag object
   */
  async createTag(label) {
    try {
      return await this._apiRequest('/api/v3/tag', 'POST', { label });
    } catch (error) {
      console.error(`Error creating tag "${label}" in Sonarr:`, error);
      throw error;
    }
  }

  /**
   * Add a series to Sonarr
   * @param {string} title - The series title to search for
   * @param {Array|null} [selectedSeasons] - Array of season numbers to monitor (optional)
   *                                          If null, all seasons will be monitored
   *                                          If empty array, no seasons will be monitored
   * @param {number} [qualityProfileId] - Quality profile ID to use (optional)
   * @param {string} [rootFolderPath] - Root folder path to use (optional)
   * @param {Array<number>} [tags] - Array of tag IDs to apply (optional)
   * @returns {Promise<Object>} - The added series object
   */
  async addSeries(title, selectedSeasons = null, qualityProfileId = null, rootFolderPath = null, tags = []) {
    if (!this.isConfigured()) {
      throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
    }
    
    try {
      // 1. Look up the series to get details
      const seriesData = await this.lookupSeries(title);
      
      // 2. Get quality profiles and root folders if not provided
      const [qualityProfiles, rootFolders] = await Promise.all([
        this.getQualityProfiles(),
        this.getRootFolders()
      ]);
      
      if (!qualityProfiles.length) {
        throw new Error('No quality profiles found in Sonarr.');
      }
      
      if (!rootFolders.length) {
        throw new Error('No root folders found in Sonarr.');
      }
      
      // Use provided values or default to the first available option
      const selectedQualityProfileId = qualityProfileId || qualityProfiles[0].id;
      const selectedRootFolderPath = rootFolderPath || rootFolders[0].path;
      
      // 3. Prepare seasons configuration
      let seasons = [];
      
      // Handle case where no seasons are returned from the API
      if (!seriesData.seasons || seriesData.seasons.length === 0) {
        console.log('No season information available for series:', title);
        // When no seasons information is available, don't set any seasons
        // This will make Sonarr monitor all seasons by default
        // We won't include seasons in the payload below
      } else {
        // Normal case - use seasons from lookup data
        if (selectedSeasons === null || selectedSeasons === undefined) {
          // If selectedSeasons is null/undefined, monitor all seasons
          seasons = seriesData.seasons.map(season => ({
            seasonNumber: season.seasonNumber,
            monitored: true
          }));
        } else if (selectedSeasons.length === 0) {
          // If selectedSeasons is an empty array, monitor no seasons
          seasons = seriesData.seasons.map(season => ({
            seasonNumber: season.seasonNumber,
            monitored: false
          }));
        } else {
          // Otherwise, only monitor selected seasons
          seasons = seriesData.seasons.map(season => ({
            seasonNumber: season.seasonNumber,
            monitored: selectedSeasons.includes(season.seasonNumber)
          }));
        }
      }
      
      // 4. Prepare payload for adding the series
      const payload = {
        title: seriesData.title,
        tvdbId: seriesData.tvdbId,
        qualityProfileId: selectedQualityProfileId,
        rootFolderPath: selectedRootFolderPath,
        monitored: true,
        seasonFolder: true,
        seriesType: 'standard',
        tags: tags, // Add the tags array
        addOptions: {
          searchForMissingEpisodes: true
        }
      };
      
      // Only add seasons to payload if we have season information
      // This allows Sonarr to use its default behavior when seasons aren't specified
      if (seasons.length > 0) {
        payload.seasons = seasons;
      } else {
        console.log(`Adding series "${title}" without season information - Sonarr will monitor all seasons by default`);
      }
      
      // 5. Add the series
      return await this._apiRequest('/api/v3/series', 'POST', payload);
    } catch (error) {
      console.error(`Error adding series "${title}" to Sonarr:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const sonarrService = new SonarrService();

export default sonarrService;
