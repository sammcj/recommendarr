import axios from 'axios';
import apiService from './ApiService';

/**
 * Service for managing API credentials (stored server-side)
 */
class CredentialsService {
  constructor() {
    this.baseUrl = apiService.baseUrl;
    // Used for migration from localStorage
    this.migrated = {};
    // Constants for recommendation services
    this.MOVIE_RECOMMENDATIONS_SERVICE = 'movie-recommendations';
    this.TV_RECOMMENDATIONS_SERVICE = 'tv-recommendations';
    this.LIKED_MOVIE_SERVICE = 'liked-movies';
    this.DISLIKED_MOVIE_SERVICE = 'disliked-movies';
    this.LIKED_TV_SERVICE = 'liked-tv';
    this.DISLIKED_TV_SERVICE = 'disliked-tv';
    this.MAX_STORED_RECOMMENDATIONS = 500;
  }

  /**
   * Store credentials for a specific service
   * 
   * @param {string} serviceName - Name of the service (sonarr, radarr, etc)
   * @param {Object} credentials - Credentials object to store
   * @returns {Promise<boolean>} - Success status
   */
  async storeCredentials(serviceName, credentials) {
    try {
      // Send credentials to server
      const response = await axios.post(`${this.baseUrl}/credentials/${serviceName}`, credentials);
      return response.data.success;
    } catch (error) {
      console.error(`Error storing credentials for ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Retrieve credentials for a specific service
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object|null>} - Credentials object or null if not found
   */
  async getCredentials(serviceName) {
    try {
      const response = await axios.get(`${this.baseUrl}/credentials/${serviceName}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // Service not found - try migrating from localStorage
        return this.migrateFromLocalStorage(serviceName);
      }
      console.error(`Error retrieving credentials for ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Delete credentials for a specific service
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<boolean>} - Success status
   */
  async deleteCredentials(serviceName) {
    try {
      const response = await axios.delete(`${this.baseUrl}/credentials/${serviceName}`);
      return response.data.success;
    } catch (error) {
      console.error(`Error deleting credentials for ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Check if credentials exist for a service
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<boolean>} - Whether credentials exist
   */
  async hasCredentials(serviceName) {
    try {
      const response = await axios.get(`${this.baseUrl}/credentials`);
      return !!response.data.services[serviceName];
    } catch (error) {
      console.error('Error checking credentials:', error);
      return false;
    }
  }

  /**
   * Store movie recommendations
   * 
   * @param {string[]} recommendations - Array of movie titles
   * @returns {Promise<boolean>} - Success status
   */
  async storeMovieRecommendations(recommendations) {
    try {
      // Get existing recommendations directly from credentials instead of using getMovieRecommendations 
      // to avoid potential circular dependency
      let currentRecs = [];
      try {
        const data = await this.getCredentials(this.MOVIE_RECOMMENDATIONS_SERVICE);
        if (data && data.titles) {
          currentRecs = data.titles;
        }
      } catch (error) {
        // If error fetching, just use the provided recommendations
        console.error('Error fetching existing movie recommendations:', error);
      }

      // Combine both arrays and remove duplicates
      const uniqueRecommendations = [...new Set([...currentRecs, ...recommendations])];
      
      // Limit to max stored recommendations
      const trimmedRecommendations = uniqueRecommendations.slice(-this.MAX_STORED_RECOMMENDATIONS);

      // Store the recommendations
      return await this.storeCredentials(this.MOVIE_RECOMMENDATIONS_SERVICE, { titles: trimmedRecommendations });
    } catch (error) {
      console.error('Error storing movie recommendations:', error);
      return false;
    }
  }

  /**
   * Retrieve movie recommendations
   * 
   * @returns {Promise<string[]|null>} - Array of movie titles or null if not found
   */
  async getMovieRecommendations() {
    try {
      const data = await this.getCredentials(this.MOVIE_RECOMMENDATIONS_SERVICE);
      const existingRecs = data?.titles || null;
      
      // Also check localStorage for migration purposes
      if (!existingRecs) {
        const localStorageRecs = localStorage.getItem('previousMovieRecommendations');
        if (localStorageRecs) {
          try {
            const parsedRecs = JSON.parse(localStorageRecs);
            if (Array.isArray(parsedRecs) && parsedRecs.length > 0) {
              // Migrate from localStorage to server-side, but don't call storeMovieRecommendations
              // which would cause infinite recursion
              await this.storeCredentials(this.MOVIE_RECOMMENDATIONS_SERVICE, { titles: parsedRecs });
              return parsedRecs;
            }
          } catch (e) {
            console.error('Error parsing localStorage movie recommendations:', e);
          }
        }
        return [];
      }
      
      return existingRecs;
    } catch (error) {
      console.error('Error retrieving movie recommendations:', error);
      return [];
    }
  }

  /**
   * Store TV recommendations
   * 
   * @param {string[]} recommendations - Array of TV show titles
   * @returns {Promise<boolean>} - Success status
   */
  async storeTVRecommendations(recommendations) {
    try {
      // Get existing recommendations directly from credentials instead of using getTVRecommendations
      // to avoid potential circular dependency
      let currentRecs = [];
      try {
        const data = await this.getCredentials(this.TV_RECOMMENDATIONS_SERVICE);
        if (data && data.titles) {
          currentRecs = data.titles;
        }
      } catch (error) {
        // If error fetching, just use the provided recommendations
        console.error('Error fetching existing TV recommendations:', error);
      }

      // Combine both arrays and remove duplicates
      const uniqueRecommendations = [...new Set([...currentRecs, ...recommendations])];
      
      // Limit to max stored recommendations
      const trimmedRecommendations = uniqueRecommendations.slice(-this.MAX_STORED_RECOMMENDATIONS);

      // Store the recommendations
      return await this.storeCredentials(this.TV_RECOMMENDATIONS_SERVICE, { titles: trimmedRecommendations });
    } catch (error) {
      console.error('Error storing TV recommendations:', error);
      return false;
    }
  }

  /**
   * Retrieve TV recommendations
   * 
   * @returns {Promise<string[]|null>} - Array of TV show titles or null if not found
   */
  async getTVRecommendations() {
    try {
      const data = await this.getCredentials(this.TV_RECOMMENDATIONS_SERVICE);
      const existingRecs = data?.titles || null;
      
      // Also check localStorage for migration purposes
      if (!existingRecs) {
        const localStorageRecs = localStorage.getItem('previousTVRecommendations');
        if (localStorageRecs) {
          try {
            const parsedRecs = JSON.parse(localStorageRecs);
            if (Array.isArray(parsedRecs) && parsedRecs.length > 0) {
              // Migrate from localStorage to server-side, but don't call getTVRecommendations again
              // which would cause infinite recursion
              await this.storeCredentials(this.TV_RECOMMENDATIONS_SERVICE, { titles: parsedRecs });
              return parsedRecs;
            }
          } catch (e) {
            console.error('Error parsing localStorage TV recommendations:', e);
          }
        }
        return [];
      }
      
      return existingRecs;
    } catch (error) {
      console.error('Error retrieving TV recommendations:', error);
      return [];
    }
  }

  /**
   * Store liked movie titles
   * 
   * @param {string[]} titles - Array of liked movie titles
   * @returns {Promise<boolean>} - Success status
   */
  async storeLikedMovies(titles) {
    try {
      return await this.storeCredentials(this.LIKED_MOVIE_SERVICE, { titles });
    } catch (error) {
      console.error('Error storing liked movies:', error);
      return false;
    }
  }

  /**
   * Retrieve liked movie titles
   * 
   * @returns {Promise<string[]>} - Array of liked movie titles
   */
  async getLikedMovies() {
    try {
      const data = await this.getCredentials(this.LIKED_MOVIE_SERVICE);
      const existingLikes = data?.titles || null;
      
      // Also check localStorage for migration purposes
      if (!existingLikes) {
        const localStorageLikes = localStorage.getItem('likedMovieRecommendations');
        if (localStorageLikes) {
          try {
            const parsedLikes = JSON.parse(localStorageLikes);
            if (Array.isArray(parsedLikes) && parsedLikes.length > 0) {
              // Migrate from localStorage to server-side
              await this.storeCredentials(this.LIKED_MOVIE_SERVICE, { titles: parsedLikes });
              return parsedLikes;
            }
          } catch (e) {
            console.error('Error parsing localStorage liked movies:', e);
          }
        }
        return [];
      }
      
      return existingLikes;
    } catch (error) {
      console.error('Error retrieving liked movies:', error);
      return [];
    }
  }

  /**
   * Store disliked movie titles
   * 
   * @param {string[]} titles - Array of disliked movie titles
   * @returns {Promise<boolean>} - Success status
   */
  async storeDislikedMovies(titles) {
    try {
      return await this.storeCredentials(this.DISLIKED_MOVIE_SERVICE, { titles });
    } catch (error) {
      console.error('Error storing disliked movies:', error);
      return false;
    }
  }

  /**
   * Retrieve disliked movie titles
   * 
   * @returns {Promise<string[]>} - Array of disliked movie titles
   */
  async getDislikedMovies() {
    try {
      const data = await this.getCredentials(this.DISLIKED_MOVIE_SERVICE);
      const existingDislikes = data?.titles || null;
      
      // Also check localStorage for migration purposes
      if (!existingDislikes) {
        const localStorageDislikes = localStorage.getItem('dislikedMovieRecommendations');
        if (localStorageDislikes) {
          try {
            const parsedDislikes = JSON.parse(localStorageDislikes);
            if (Array.isArray(parsedDislikes) && parsedDislikes.length > 0) {
              // Migrate from localStorage to server-side
              await this.storeCredentials(this.DISLIKED_MOVIE_SERVICE, { titles: parsedDislikes });
              return parsedDislikes;
            }
          } catch (e) {
            console.error('Error parsing localStorage disliked movies:', e);
          }
        }
        return [];
      }
      
      return existingDislikes;
    } catch (error) {
      console.error('Error retrieving disliked movies:', error);
      return [];
    }
  }

  /**
   * Store liked TV show titles
   * 
   * @param {string[]} titles - Array of liked TV show titles
   * @returns {Promise<boolean>} - Success status
   */
  async storeLikedTVShows(titles) {
    try {
      return await this.storeCredentials(this.LIKED_TV_SERVICE, { titles });
    } catch (error) {
      console.error('Error storing liked TV shows:', error);
      return false;
    }
  }

  /**
   * Retrieve liked TV show titles
   * 
   * @returns {Promise<string[]>} - Array of liked TV show titles
   */
  async getLikedTVShows() {
    try {
      const data = await this.getCredentials(this.LIKED_TV_SERVICE);
      const existingLikes = data?.titles || null;
      
      // Also check localStorage for migration purposes
      if (!existingLikes) {
        const localStorageLikes = localStorage.getItem('likedTVRecommendations');
        if (localStorageLikes) {
          try {
            const parsedLikes = JSON.parse(localStorageLikes);
            if (Array.isArray(parsedLikes) && parsedLikes.length > 0) {
              // Migrate from localStorage to server-side
              await this.storeCredentials(this.LIKED_TV_SERVICE, { titles: parsedLikes });
              return parsedLikes;
            }
          } catch (e) {
            console.error('Error parsing localStorage liked TV shows:', e);
          }
        }
        return [];
      }
      
      return existingLikes;
    } catch (error) {
      console.error('Error retrieving liked TV shows:', error);
      return [];
    }
  }

  /**
   * Store disliked TV show titles
   * 
   * @param {string[]} titles - Array of disliked TV show titles
   * @returns {Promise<boolean>} - Success status
   */
  async storeDislikedTVShows(titles) {
    try {
      return await this.storeCredentials(this.DISLIKED_TV_SERVICE, { titles });
    } catch (error) {
      console.error('Error storing disliked TV shows:', error);
      return false;
    }
  }

  /**
   * Retrieve disliked TV show titles
   * 
   * @returns {Promise<string[]>} - Array of disliked TV show titles
   */
  async getDislikedTVShows() {
    try {
      const data = await this.getCredentials(this.DISLIKED_TV_SERVICE);
      const existingDislikes = data?.titles || null;
      
      // Also check localStorage for migration purposes
      if (!existingDislikes) {
        const localStorageDislikes = localStorage.getItem('dislikedTVRecommendations');
        if (localStorageDislikes) {
          try {
            const parsedDislikes = JSON.parse(localStorageDislikes);
            if (Array.isArray(parsedDislikes) && parsedDislikes.length > 0) {
              // Migrate from localStorage to server-side
              await this.storeCredentials(this.DISLIKED_TV_SERVICE, { titles: parsedDislikes });
              return parsedDislikes;
            }
          } catch (e) {
            console.error('Error parsing localStorage disliked TV shows:', e);
          }
        }
        return [];
      }
      
      return existingDislikes;
    } catch (error) {
      console.error('Error retrieving disliked TV shows:', error);
      return [];
    }
  }

  /**
   * Migrate credentials from localStorage to server-side storage
   * Only used once per service to handle transition
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object|null>} - Migrated credentials or null
   * @private
   */
  async migrateFromLocalStorage(serviceName) {
    // Don't try to migrate more than once per service
    if (this.migrated[serviceName]) return null;
    
    try {
      let credentials = {};
      
      // Handle different services
      switch(serviceName) {
        case 'sonarr': {
          const sonarrBaseUrl = localStorage.getItem('sonarrBaseUrl');
          const sonarrApiKey = localStorage.getItem('sonarrApiKey');
          if (sonarrBaseUrl && sonarrApiKey) {
            credentials = { baseUrl: sonarrBaseUrl, apiKey: sonarrApiKey };
          }
          break;
        }
          
        case 'radarr': {
          const radarrBaseUrl = localStorage.getItem('radarrBaseUrl');
          const radarrApiKey = localStorage.getItem('radarrApiKey');
          if (radarrBaseUrl && radarrApiKey) {
            credentials = { baseUrl: radarrBaseUrl, apiKey: radarrApiKey };
          }
          break;
        }
          
        case 'plex': {
          const plexUrl = localStorage.getItem('plexUrl');
          const plexToken = localStorage.getItem('plexToken');
          if (plexUrl && plexToken) {
            credentials = { baseUrl: plexUrl, token: plexToken };
          }
          break;
        }
          
        case 'jellyfin': {
          const jellyfinUrl = localStorage.getItem('jellyfinUrl');
          const jellyfinApiKey = localStorage.getItem('jellyfinApiKey');
          const jellyfinUserId = localStorage.getItem('jellyfinUserId');
          if (jellyfinUrl && jellyfinApiKey) {
            credentials = { 
              baseUrl: jellyfinUrl, 
              apiKey: jellyfinApiKey,
              userId: jellyfinUserId
            };
          }
          break;
        }
          
        case 'openai': {
          const openaiApiUrl = localStorage.getItem('openaiApiUrl');
          const openaiApiKey = localStorage.getItem('openaiApiKey');
          const openaiModel = localStorage.getItem('openaiModel');
          if (openaiApiUrl && openaiApiKey) {
            credentials = { 
              apiUrl: openaiApiUrl, 
              apiKey: openaiApiKey,
              model: openaiModel
            };
          }
          break;
        }
      }
      
      // If we found credentials, store them server-side
      if (Object.keys(credentials).length > 0) {
        await this.storeCredentials(serviceName, credentials);
        this.migrated[serviceName] = true;
        return credentials;
      }
      
      return null;
    } catch (error) {
      console.error(`Error migrating ${serviceName} credentials:`, error);
      return null;
    }
  }
}

// Create singleton instance
const credentialsService = new CredentialsService();

export default credentialsService;