import axios from 'axios';

class SonarrService {
  constructor() {
    // Try to restore from localStorage on initialization
    this.apiKey = localStorage.getItem('sonarrApiKey') || '';
    this.baseUrl = localStorage.getItem('sonarrBaseUrl') || '';
  }

  /**
   * Configure the Sonarr service with API details
   * @param {string} baseUrl - The base URL of your Sonarr instance (e.g., http://localhost:8989)
   * @param {string} apiKey - Your Sonarr API key
   */
  configure(baseUrl, apiKey) {
    // Normalize the URL by removing trailing slashes
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    this.apiKey = apiKey;
  }

  /**
   * Check if the service is configured with API key and URL
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    return this.apiKey && this.baseUrl;
  }

  /**
   * Get all series from Sonarr
   * @returns {Promise<Array>} - List of TV shows
   */
  async getSeries() {
    if (!this.isConfigured()) {
      throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/series`, {
        params: { apiKey: this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching series from Sonarr:', error);
      throw error;
    }
  }
  
  /**
   * Search for a series by title in Sonarr
   * @param {string} title - The series title to search for
   * @returns {Promise<Object|null>} - Series info if found, null otherwise
   */
  async findSeriesByTitle(title) {
    if (!this.isConfigured()) {
      throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
    }
    
    try {
      // First try to search in existing library
      const libraryResponse = await axios.get(`${this.baseUrl}/api/v3/series`, {
        params: { apiKey: this.apiKey }
      });
      
      // Find closest match in library
      const libraryMatch = libraryResponse.data.find(show => 
        show.title.toLowerCase() === title.toLowerCase()
      );
      
      if (libraryMatch) {
        return libraryMatch;
      }
      
      // If not found in library, search lookup
      // Make sure we're not adding any wildcards or special characters
      // Sonarr's API doesn't need wildcards like ** - it does its own fuzzy matching
      const cleanTitle = title.trim();
      const encodedTitle = encodeURIComponent(cleanTitle);
      const lookupUrl = `${this.baseUrl}/api/v3/series/lookup?apiKey=${this.apiKey}&term=${encodedTitle}`;
      const lookupResponse = await axios.get(lookupUrl);
      
      if (lookupResponse.data && lookupResponse.data.length > 0) {
        return lookupResponse.data[0];
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
    if (!this.isConfigured()) {
      throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/system/status`, {
        params: { apiKey: this.apiKey }
      });
      return response.status === 200;
    } catch (error) {
      console.error('Error connecting to Sonarr:', error);
      return false;
    }
  }

  /**
   * Get quality profiles from Sonarr
   * @returns {Promise<Array>} - List of quality profiles
   */
  async getQualityProfiles() {
    if (!this.isConfigured()) {
      throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/qualityprofile`, {
        params: { apiKey: this.apiKey }
      });
      return response.data;
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
    if (!this.isConfigured()) {
      throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/rootfolder`, {
        params: { apiKey: this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching root folders from Sonarr:', error);
      throw error;
    }
  }

  /**
   * Add a series to Sonarr
   * @param {string} title - The series title to search for
   * @returns {Promise<Object>} - The added series object
   */
  async addSeries(title) {
    if (!this.isConfigured()) {
      throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
    }
    
    try {
      // 1. Look up the series to get details
      const cleanTitle = title.trim();
      const encodedTitle = encodeURIComponent(cleanTitle);
      const lookupUrl = `${this.baseUrl}/api/v3/series/lookup?apiKey=${this.apiKey}&term=${encodedTitle}`;
      const lookupResponse = await axios.get(lookupUrl);
      
      if (!lookupResponse.data || lookupResponse.data.length === 0) {
        throw new Error(`Series "${title}" not found in Sonarr lookup.`);
      }
      
      const seriesData = lookupResponse.data[0];
      
      // 2. Get the first quality profile and root folder
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
      
      const qualityProfileId = qualityProfiles[0].id;
      const rootFolderPath = rootFolders[0].path;
      
      // 3. Prepare payload for adding the series
      const payload = {
        title: seriesData.title,
        tvdbId: seriesData.tvdbId,
        qualityProfileId: qualityProfileId,
        rootFolderPath: rootFolderPath,
        monitored: true,
        seasonFolder: true,
        seriesType: 'standard',
        seasons: seriesData.seasons.map(season => ({
          seasonNumber: season.seasonNumber,
          monitored: true
        })),
        addOptions: {
          searchForMissingEpisodes: true
        }
      };
      
      // 4. Add the series
      const response = await axios.post(`${this.baseUrl}/api/v3/series`, payload, {
        params: { apiKey: this.apiKey }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error adding series "${title}" to Sonarr:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const sonarrService = new SonarrService();

export default sonarrService;