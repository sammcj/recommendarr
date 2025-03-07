import axios from 'axios';
import apiService from './ApiService';
import credentialsService from './CredentialsService';

class TraktService {
  constructor() {
    this.baseUrl = 'https://api.trakt.tv';
    this.clientId = '';
    this.accessToken = '';
    this.configured = false;
    // Flag to determine if we should use the proxy
    this.useProxy = true;
    
    // Try to load saved credentials
    this.loadCredentials();
  }
  
  /**
   * Load saved credentials from the server
   */
  async loadCredentials() {
    try {
      const credentials = await credentialsService.getCredentials('trakt');
      if (credentials) {
        this.clientId = credentials.clientId || '';
        this.accessToken = credentials.accessToken || '';
        this.configured = !!(this.clientId && this.accessToken);
        return true;
      }
    } catch (error) {
      console.error('Failed to load Trakt credentials:', error);
    }
    return false;
  }

  async configure(clientId, accessToken) {
    if (clientId && accessToken) {
      this.clientId = clientId;
      this.accessToken = accessToken;
      this.configured = true;
      
      // Store credentials on the server
      await credentialsService.storeCredentials('trakt', {
        clientId: this.clientId,
        accessToken: this.accessToken
      });
      
      return true;
    }
    
    return false;
  }
  
  isConfigured() {
    return this.clientId && this.accessToken;
  }
  
  async testConnection() {
    if (!this.isConfigured()) {
      return false;
    }
    
    try {
      // Try to get user settings as a basic test
      const response = await this._apiRequest('/users/settings');
      return !!response;
    } catch (error) {
      console.error('Trakt connection test failed:', error);
      return false;
    }
  }
  
  async _apiRequest(endpoint, params = {}) {
    if (!this.isConfigured()) {
      // Try to load credentials again in case they weren't ready during init
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('Trakt service is not configured');
      }
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': this.clientId,
      'Authorization': `Bearer ${this.accessToken}`
    };
    
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      if (this.useProxy) {
        // Log attempt to connect through proxy for debugging
        console.log(`Making request to Trakt via proxy: endpoint=${endpoint}`);
        
        const response = await apiService.proxyRequest({
          url,
          method: 'GET',
          params,
          headers
        });
        
        // The proxy returns the data wrapped, we need to unwrap it
        return response.data;
      } else {
        // Direct API request
        console.log(`Making direct request to Trakt: endpoint=${endpoint}`);
        
        const response = await axios.get(url, {
          params,
          headers
        });
        
        return response.data;
      }
    } catch (error) {
      console.error(`Trakt API error (${endpoint}):`, error);
      
      // Enhance the error with more helpful information
      const enhancedError = {
        ...error,
        message: error.message || 'Unknown error',
        endpoint,
        url
      };
      
      throw enhancedError;
    }
  }
  
  async getWatchHistory(options = {}) {
    try {
      const { limit = 50, type, startDate = null, endDate = null } = options;
      
      const params = {
        limit: limit,
        extended: 'full'
      };
      
      // Add type filter if specified (movies or shows)
      const endpoint = type ? `/sync/history/${type}` : '/sync/history';
      
      // Add date filter if daysAgo is specified
      if (startDate) {
        params.start_at = startDate;
      }
      
      if (endDate) {
        params.end_at = endDate;
      }
      
      const response = await this._apiRequest(endpoint, params);
      return response;
    } catch (error) {
      console.error('Failed to get Trakt watch history:', error);
      return [];
    }
  }
  
  async getRecentlyWatchedMovies(limit = 50, daysAgo = 0) {
    try {
      let options = {
        limit,
        type: 'movies'
      };
      
      if (daysAgo > 0) {
        const today = new Date();
        const past = new Date();
        past.setDate(today.getDate() - daysAgo);
        
        options.startDate = past.toISOString();
      }
      
      const historyData = await this.getWatchHistory(options);
      
      // Process and format the movie data
      return historyData.map(item => {
        const movie = item.movie;
        return {
          title: movie.title,
          year: movie.year,
          tmdbId: movie.ids.tmdb,
          traktId: movie.ids.trakt,
          watched: new Date(item.watched_at).toISOString(),
          type: 'movie'
        };
      });
    } catch (error) {
      console.error('Failed to get recently watched movies from Trakt:', error);
      return [];
    }
  }
  
  async getRecentlyWatchedShows(limit = 50, daysAgo = 0) {
    try {
      let options = {
        limit,
        type: 'episodes'
      };
      
      if (daysAgo > 0) {
        const today = new Date();
        const past = new Date();
        past.setDate(today.getDate() - daysAgo);
        
        options.startDate = past.toISOString();
      }
      
      const historyData = await this.getWatchHistory(options);
      
      // Group episodes by show
      const showMap = new Map();
      
      historyData.forEach(item => {
        const show = item.show;
        const episode = item.episode;
        const showId = show.ids.trakt;
        
        if (!showMap.has(showId)) {
          showMap.set(showId, {
            title: show.title,
            tmdbId: show.ids.tmdb,
            traktId: show.ids.trakt,
            episodes: [],
            lastWatched: new Date(item.watched_at).toISOString(),
            type: 'show'
          });
        }
        
        // Add this episode
        showMap.get(showId).episodes.push({
          title: episode.title,
          season: episode.season,
          episode: episode.number,
          watched: new Date(item.watched_at).toISOString()
        });
        
        // Update last watched if this is more recent
        const episodeDate = new Date(item.watched_at);
        const lastWatchedDate = new Date(showMap.get(showId).lastWatched);
        
        if (episodeDate > lastWatchedDate) {
          showMap.get(showId).lastWatched = episodeDate.toISOString();
        }
      });
      
      // Convert map to array and sort by last watched (most recent first)
      return Array.from(showMap.values()).sort((a, b) => {
        return new Date(b.lastWatched) - new Date(a.lastWatched);
      });
    } catch (error) {
      console.error('Failed to get recently watched shows from Trakt:', error);
      return [];
    }
  }
}

export default new TraktService();