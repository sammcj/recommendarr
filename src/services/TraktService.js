import axios from 'axios';
import apiService from './ApiService';
import credentialsService from './CredentialsService';

class TraktService {
  constructor() {
    this.baseUrl = 'https://api.trakt.tv';
    this.clientId = '';
    this.clientSecret = '';
    this.accessToken = '';
    this.refreshToken = '';
    this.expiresAt = null;
    this.redirectUri = window.location.origin + '/trakt-callback';
    this.configured = false;
    // Flag to determine if we should use the proxy
    this.useProxy = true;
    
    console.log('TraktService: Initialized with redirectUri:', this.redirectUri);
    
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
        this.clientSecret = credentials.clientSecret || '';
        this.accessToken = credentials.accessToken || '';
        this.refreshToken = credentials.refreshToken || '';
        this.expiresAt = credentials.expiresAt || null;
        this.configured = !!(this.clientId && this.accessToken);
        
        // Check if token is expired and needs refresh
        if (this.isTokenExpired() && this.refreshToken) {
          this.refreshAccessToken();
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to load Trakt credentials:', error);
    }
    return false;
  }

  /**
   * Start OAuth authorization flow
   */
  async startOAuthFlow() {
    if (!this.clientId) {
      throw new Error('Client ID is required to start OAuth flow');
    }
    
    // Store the client ID in local storage temporarily
    localStorage.setItem('trakt_client_id', this.clientId);
    
    // If client secret is provided, store it too
    if (this.clientSecret) {
      localStorage.setItem('trakt_client_secret', this.clientSecret);
    }
    
    // Generate random state value for security
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('trakt_oauth_state', state);
    
    // Construct the authorization URL
    const authUrl = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}`;
    
    console.log('TraktService: Starting OAuth flow with URL:', authUrl);
    console.log('TraktService: Redirect URI is:', this.redirectUri);
    
    // Redirect the user to the authorization page
    window.location.href = authUrl;
  }
  
  /**
   * Handle OAuth callback by exchanging authorization code for tokens
   */
  async handleOAuthCallback(code, state) {
    // Verify state parameter matches what we stored
    const storedState = localStorage.getItem('trakt_oauth_state');
    if (state !== storedState) {
      throw new Error('OAuth state mismatch - possible CSRF attack');
    }
    
    // Get client ID from localStorage
    const clientId = localStorage.getItem('trakt_client_id');
    if (!clientId) {
      throw new Error('Client ID not found in localStorage');
    }
    
    // Get client secret from localStorage if available
    const clientSecret = localStorage.getItem('trakt_client_secret') || '';
    
    // Clear localStorage values
    localStorage.removeItem('trakt_oauth_state');
    localStorage.removeItem('trakt_client_id');
    localStorage.removeItem('trakt_client_secret');
    
    // Exchange code for tokens using our proxy to avoid CORS issues
    try {
      console.log('Using proxy for OAuth token exchange to avoid CORS issues');
      
      const tokenResponse = await apiService.proxyRequest({
        url: 'https://api.trakt.tv/oauth/token',
        method: 'POST',
        data: {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!tokenResponse.data || tokenResponse.status >= 400) {
        console.error('Proxy request failed:', tokenResponse);
        throw new Error(tokenResponse.data?.error || 'Failed to exchange authorization code for token');
      }
      
      // Set tokens and expiration
      const data = tokenResponse.data;
      const expiresAt = Date.now() + (data.expires_in * 1000);
      
      console.log('Successfully obtained tokens from Trakt');
      
      // Update service properties
      this.clientId = clientId;
      this.clientSecret = clientSecret;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.expiresAt = expiresAt;
      this.configured = true;
      
      // Store credentials on the server
      await credentialsService.storeCredentials('trakt', {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt
      });
      
      return true;
    } catch (error) {
      console.error('Failed to exchange code for token:', error);
      throw error;
    }
  }
  
  /**
   * Check if the access token is expired
   */
  isTokenExpired() {
    if (!this.expiresAt) return true;
    // Consider token expired 5 minutes before actual expiration to avoid edge cases
    return Date.now() > (this.expiresAt - 5 * 60 * 1000);
  }
  
  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken || !this.clientId) {
      throw new Error('Refresh token and client ID are required to refresh access token');
    }
    
    try {
      console.log('Refreshing Trakt access token using proxy to avoid CORS issues');
      
      const tokenResponse = await apiService.proxyRequest({
        url: 'https://api.trakt.tv/oauth/token',
        method: 'POST',
        data: {
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret || '',
          redirect_uri: this.redirectUri,
          grant_type: 'refresh_token'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!tokenResponse.data || tokenResponse.status >= 400) {
        console.error('Proxy request failed:', tokenResponse);
        throw new Error(tokenResponse.data?.error || 'Failed to refresh access token');
      }
      
      // Update tokens and expiration
      const data = tokenResponse.data;
      const expiresAt = Date.now() + (data.expires_in * 1000);
      
      console.log('Successfully refreshed Trakt access token');
      
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.expiresAt = expiresAt;
      
      // Store updated credentials
      await credentialsService.storeCredentials('trakt', {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt
      });
      
      return true;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  async configure(clientId, clientSecret = '') {
    if (clientId) {
      this.clientId = clientId;
      this.clientSecret = clientSecret;
      
      // We don't immediately set this as configured since we need to complete OAuth
      // Store partial credentials on the server
      await credentialsService.storeCredentials('trakt', {
        clientId: this.clientId,
        clientSecret: this.clientSecret
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
  
  async _apiRequest(endpoint, params = {}, method = 'GET', data = null) {
    if (!this.isConfigured()) {
      // Try to load credentials again in case they weren't ready during init
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('Trakt service is not configured');
      }
    }
    
    // Check if token is expired and refresh if needed
    if (this.isTokenExpired() && this.refreshToken) {
      try {
        await this.refreshAccessToken();
      } catch (refreshError) {
        console.error('Error refreshing Trakt token:', refreshError);
        throw new Error('Session expired. Please reconnect to Trakt.');
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
        console.log(`Making request to Trakt via proxy: endpoint=${endpoint}, method=${method}`);
        
        const response = await apiService.proxyRequest({
          url,
          method,
          params,
          data,
          headers
        });
        
        // The proxy returns the data wrapped, we need to unwrap it
        return response.data;
      } else {
        // Direct API request
        console.log(`Making direct request to Trakt: endpoint=${endpoint}, method=${method}`);
        
        const options = {
          params,
          headers
        };
        
        let response;
        if (method === 'GET') {
          response = await axios.get(url, options);
        } else if (method === 'POST') {
          response = await axios.post(url, data, options);
        } else if (method === 'PUT') {
          response = await axios.put(url, data, options);
        } else if (method === 'DELETE') {
          response = await axios.delete(url, options);
        } else {
          throw new Error(`Unsupported HTTP method: ${method}`);
        }
        
        return response.data;
      }
    } catch (error) {
      console.error(`Trakt API error (${endpoint}):`, error);
      
      // Check for 401 Unauthorized, which might mean token is invalid
      if (error.response && error.response.status === 401) {
        // If we have a refresh token, try to refresh and retry
        if (this.refreshToken) {
          try {
            await this.refreshAccessToken();
            // Retry the request with the new token
            return this._apiRequest(endpoint, params, method, data);
          } catch (refreshError) {
            console.error('Error refreshing token after 401:', refreshError);
            throw new Error('Your Trakt authorization has expired. Please reconnect to Trakt.');
          }
        } else {
          throw new Error('Trakt authentication failed. Please reconnect to Trakt.');
        }
      }
      
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
          lastWatched: new Date(item.watched_at).toISOString(), // Add lastWatched for compatibility
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