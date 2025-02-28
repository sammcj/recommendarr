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