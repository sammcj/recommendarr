import axios from 'axios';

class PlexService {
  constructor() {
    // Try to restore from localStorage on initialization
    this.token = localStorage.getItem('plexToken') || '';
    this.baseUrl = localStorage.getItem('plexBaseUrl') || '';
  }

  /**
   * Configure the Plex service with API details
   * @param {string} baseUrl - The base URL of your Plex instance (e.g., http://localhost:32400)
   * @param {string} token - Your Plex token
   */
  configure(baseUrl, token) {
    // Normalize the URL by removing trailing slashes
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    this.token = token;
  }

  /**
   * Check if the service is configured with token and URL
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    return this.token && this.baseUrl;
  }

  /**
   * Test the connection to Plex
   * @returns {Promise<boolean>} - Whether the connection is successful
   */
  async testConnection() {
    if (!this.isConfigured()) {
      throw new Error('Plex service is not configured. Please set baseUrl and token.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/identity`, {
        params: { 
          'X-Plex-Token': this.token 
        }
      });
      return response.status === 200;
    } catch (error) {
      console.error('Error connecting to Plex:', error);
      return false;
    }
  }

  /**
   * Get recently watched movies from Plex
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} - List of recently watched movies
   */
  async getRecentlyWatchedMovies(limit = 20) {
    if (!this.isConfigured()) {
      throw new Error('Plex service is not configured. Please set baseUrl and token.');
    }

    try {
      // Get recently watched from the history endpoint
      const response = await axios.get(`${this.baseUrl}/status/sessions/history/all`, {
        params: {
          'X-Plex-Token': this.token,
          'type': 1, // Type 1 is movie
          'sort': 'viewedAt:desc',
          'limit': limit
        }
      });

      // Parse the XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, "text/xml");
      const videoNodes = xmlDoc.querySelectorAll('Video');
      
      // Extract movie info from XML
      const movies = Array.from(videoNodes).map(node => {
        return {
          title: node.getAttribute('title'),
          year: node.getAttribute('year'),
          viewedAt: node.getAttribute('viewedAt'),
          ratingKey: node.getAttribute('ratingKey')
        };
      });

      // Filter duplicates by title
      const uniqueMovies = movies.filter((movie, index, self) => 
        index === self.findIndex((m) => m.title === movie.title)
      );

      return uniqueMovies;
    } catch (error) {
      console.error('Error fetching recently watched movies from Plex:', error);
      throw error;
    }
  }

  /**
   * Get recently watched TV shows from Plex
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} - List of recently watched TV shows
   */
  async getRecentlyWatchedShows(limit = 20) {
    if (!this.isConfigured()) {
      throw new Error('Plex service is not configured. Please set baseUrl and token.');
    }

    try {
      // Get recently watched from the history endpoint
      const response = await axios.get(`${this.baseUrl}/status/sessions/history/all`, {
        params: {
          'X-Plex-Token': this.token,
          'type': 4, // Type 4 is TV episode
          'sort': 'viewedAt:desc',
          'limit': limit
        }
      });

      // Parse the XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, "text/xml");
      const episodeNodes = xmlDoc.querySelectorAll('Video');
      
      // Extract show info from XML (grouping by show)
      const showMap = new Map();
      
      Array.from(episodeNodes).forEach(node => {
        const grandparentTitle = node.getAttribute('grandparentTitle'); // Show title
        if (grandparentTitle) {
          if (!showMap.has(grandparentTitle)) {
            showMap.set(grandparentTitle, {
              title: grandparentTitle,
              year: node.getAttribute('parentYear') || node.getAttribute('year'),
              viewedAt: node.getAttribute('viewedAt'),
              ratingKey: node.getAttribute('grandparentRatingKey')
            });
          }
        }
      });

      // Convert map to array
      return Array.from(showMap.values());
    } catch (error) {
      console.error('Error fetching recently watched shows from Plex:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const plexService = new PlexService();

export default plexService;