import axios from 'axios';

class RadarrService {
  constructor() {
    // Try to restore from localStorage on initialization
    this.apiKey = localStorage.getItem('radarrApiKey') || '';
    this.baseUrl = localStorage.getItem('radarrBaseUrl') || '';
  }

  /**
   * Configure the Radarr service with API details
   * @param {string} baseUrl - The base URL of your Radarr instance (e.g., http://localhost:7878)
   * @param {string} apiKey - Your Radarr API key
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
   * Get all movies from Radarr
   * @returns {Promise<Array>} - List of movies
   */
  async getMovies() {
    if (!this.isConfigured()) {
      throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/movie`, {
        params: { apiKey: this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching movies from Radarr:', error);
      throw error;
    }
  }
  
  /**
   * Search for a movie by title in Radarr
   * @param {string} title - The movie title to search for
   * @returns {Promise<Object|null>} - Movie info if found, null otherwise
   */
  async findMovieByTitle(title) {
    if (!this.isConfigured()) {
      throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
    }
    
    try {
      // First try to search in existing library
      const libraryResponse = await axios.get(`${this.baseUrl}/api/v3/movie`, {
        params: { apiKey: this.apiKey }
      });
      
      // Find closest match in library
      const libraryMatch = libraryResponse.data.find(movie => 
        movie.title.toLowerCase() === title.toLowerCase()
      );
      
      if (libraryMatch) {
        return libraryMatch;
      }
      
      // If not found in library, search lookup
      // Make sure we're not adding any wildcards or special characters
      // Radarr's API doesn't need wildcards - it does its own fuzzy matching
      const cleanTitle = title.trim();
      const encodedTitle = encodeURIComponent(cleanTitle);
      const lookupUrl = `${this.baseUrl}/api/v3/movie/lookup?apiKey=${this.apiKey}&term=${encodedTitle}`;
      const lookupResponse = await axios.get(lookupUrl);
      
      if (lookupResponse.data && lookupResponse.data.length > 0) {
        return lookupResponse.data[0];
      }
      
      return null;
    } catch (error) {
      console.error(`Error searching for movie "${title}" in Radarr:`, error);
      return null;
    }
  }

  /**
   * Test the connection to Radarr
   * @returns {Promise<boolean>} - Whether the connection is successful
   */
  async testConnection() {
    if (!this.isConfigured()) {
      throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/system/status`, {
        params: { apiKey: this.apiKey }
      });
      return response.status === 200;
    } catch (error) {
      console.error('Error connecting to Radarr:', error);
      return false;
    }
  }
}

// Create a singleton instance
const radarrService = new RadarrService();

export default radarrService;