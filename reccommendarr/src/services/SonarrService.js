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
    this.baseUrl = baseUrl;
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
}

// Create a singleton instance
const sonarrService = new SonarrService();

export default sonarrService;