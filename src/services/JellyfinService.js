/* eslint-disable no-unused-vars */
import axios from 'axios';
/* eslint-enable no-unused-vars */
import credentialsService from './CredentialsService';
import apiService from './ApiService';
import AuthService from './AuthService';
import storageUtils from '../utils/StorageUtils';

class JellyfinService {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.userId = storageUtils.get('selectedJellyfinUserId') || '';
    // Load credentials when instantiated
    this.loadCredentials();
  }

  /**
   * Load credentials from server-side storage
   */
  async loadCredentials() {
    const credentials = await credentialsService.getCredentials('jellyfin');
    if (credentials) {
      this.baseUrl = credentials.baseUrl || '';
      this.apiKey = credentials.apiKey || '';
      // userId is now stored separately via StorageUtils
      
      // Load recentLimit if available
      if (credentials.recentLimit) {
        storageUtils.set('jellyfinRecentLimit', credentials.recentLimit);
      }
    }
  }

  async configure(baseUrl, apiKey, userId, recentLimit = null) {
    // Ensure baseUrl doesn't end with a slash
    this.baseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : '';
    this.apiKey = apiKey || '';
    this.userId = userId || '';
    storageUtils.set('selectedJellyfinUserId', this.userId);

    const credentials = {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey
    };
    
    // If recentLimit is provided, store it with the credentials
    if (recentLimit !== null) {
      credentials.recentLimit = recentLimit;
      // Also store in storageUtils for client-side access
      storageUtils.set('jellyfinRecentLimit', recentLimit);
    }
    
    // Store credentials server-side (single set of credentials)
    await credentialsService.storeCredentials('jellyfin', credentials);
  }

  isConfigured() {
    return !!this.baseUrl && !!this.apiKey;
  }
  
  async getUsers() {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        return [];
      }
    }
    
    try {
      const response = await apiService.proxyRequest({
        url: `${this.baseUrl}/Users`,
        method: 'GET',
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });
      
      return response.data.map(user => ({
        id: user.Id,
        name: user.Name,
        lastLoginDate: user.LastLoginDate,
        hasPassword: user.HasPassword,
        isAdministrator: user.Policy?.IsAdministrator || false
      }));
    } catch (error) {
      console.error('Error fetching Jellyfin users:', error);
      return [];
    }
  }
  
  /**
   * Find a user ID by username
   * @param {string} username - The username to search for
   * @returns {Promise<string|null>} - The user ID if found, null otherwise
   */
  async getUserIdByUsername(username) {
    if (!username) return null;
    
    try {
      const users = await this.getUsers();
      const user = users.find(u => u.name.toLowerCase() === username.toLowerCase());
      return user ? user.id : null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      return null;
    }
  }

  async testConnection() {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        return { success: false, message: 'Jellyfin URL and API key are required.' };
      }
    }

    try {
      // First check if we can connect to the server
      const systemResponse = await apiService.proxyRequest({
        url: `${this.baseUrl}/System/Info`,
        method: 'GET',
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });
      
      if (systemResponse.status !== 200) {
        return { success: false, message: `Error connecting to Jellyfin: ${systemResponse.status}` };
      }
      
      // If userId is provided, verify it's valid
      if (this.userId) {
        try {
          const userResponse = await apiService.proxyRequest({
            url: `${this.baseUrl}/Users/${this.userId}`,
            method: 'GET',
            headers: {
              'X-Emby-Token': this.apiKey
            }
          });
          
          return { 
            success: true, 
            message: `Connected to Jellyfin successfully! User: ${userResponse.data.Name}`
          };
        } catch (userError) {
          // User ID may be invalid
          return { 
            success: false, 
            message: 'Connected to Jellyfin, but the User ID is invalid.'
          };
        }
      }
      
      return { success: true, message: 'Connected to Jellyfin successfully!' };
    } catch (error) {
      return { 
        success: false, 
        message: `Error connecting to Jellyfin: ${error.message || 'Unknown error'}`
      };
    }
  }

  async getRecentlyWatchedMovies(limit = 50, daysAgo = null) {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured() || !this.userId) {
      await this.loadCredentials();
      
      if (!this.isConfigured() || !this.userId) {
        return [];
      }
    }
    
    // For non-admin users, reload credentials to get the admin-set limit
    if (!AuthService.isAdmin()) {
      const credentials = await credentialsService.getCredentials('jellyfin');
      if (credentials && credentials.recentLimit !== undefined) {
        // Override the provided limit with the admin-set limit
        limit = credentials.recentLimit;
      }
    }

    try {
      // Construct the URL for getting watch history for movies
      const url = `${this.baseUrl}/Users/${this.userId}/Items?IncludeItemTypes=Movie&Recursive=true&SortBy=DatePlayed&SortOrder=Descending&Filters=IsPlayed&Limit=${limit}`;
      
      const response = await apiService.proxyRequest({
        url: url,
        method: 'GET',
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });

      // Filter by date if daysAgo is specified
      const cutoffDate = daysAgo ? new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)) : null;
      
      // Map the response to a standardized format
      const watchedMovies = response.data.Items.map(item => {
        return {
          title: item.Name,
          year: item.ProductionYear,
          viewedAt: new Date(item.UserData.LastPlayedDate),
          ratingKey: item.Id
        };
      });

      // Filter by date if needed
      if (cutoffDate) {
        return watchedMovies.filter(movie => movie.viewedAt > cutoffDate);
      }

      return watchedMovies;
    } catch (error) {
      console.error('Error fetching Jellyfin watched movies:', error);
      return [];
    }
  }

  async getRecentlyWatchedShows(limit = 50, daysAgo = null) {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured() || !this.userId) {
      await this.loadCredentials();
      
      if (!this.isConfigured() || !this.userId) {
        return [];
      }
    }
    
    // For non-admin users, reload credentials to get the admin-set limit
    if (!AuthService.isAdmin()) {
      const credentials = await credentialsService.getCredentials('jellyfin');
      if (credentials && credentials.recentLimit !== undefined) {
        // Override the provided limit with the admin-set limit
        limit = credentials.recentLimit;
      }
    }

    try {
      // Construct the URL for getting watch history for TV shows
      const url = `${this.baseUrl}/Users/${this.userId}/Items?IncludeItemTypes=Series,Episode&Recursive=true&SortBy=DatePlayed&SortOrder=Descending&Filters=IsPlayed&Limit=${limit}`;
      
      const response = await apiService.proxyRequest({
        url: url,
        method: 'GET',
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });

      // Filter by date if daysAgo is specified
      const cutoffDate = daysAgo ? new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)) : null;
      
      // Process and deduplicate shows
      const showMap = new Map();
      
      response.data.Items.forEach(item => {
        // Handle episode items
        if (item.Type === 'Episode' && item.SeriesName) {
          const seriesId = item.SeriesId;
          if (!showMap.has(seriesId)) {
            showMap.set(seriesId, {
              title: item.SeriesName,
              year: item.SeriesProductionYear,
              viewedAt: new Date(item.UserData.LastPlayedDate),
              ratingKey: seriesId
            });
          } else {
            // Update date if this episode was watched more recently
            const existingDate = showMap.get(seriesId).viewedAt;
            const currentDate = new Date(item.UserData.LastPlayedDate);
            if (currentDate > existingDate) {
              showMap.get(seriesId).viewedAt = currentDate;
            }
          }
        } 
        // Handle series items
        else if (item.Type === 'Series') {
          if (!showMap.has(item.Id) || 
              new Date(item.UserData.LastPlayedDate) > showMap.get(item.Id).viewedAt) {
            showMap.set(item.Id, {
              title: item.Name,
              year: item.ProductionYear,
              viewedAt: new Date(item.UserData.LastPlayedDate),
              ratingKey: item.Id
            });
          }
        }
      });

      // Convert to array and sort by date
      let watchedShows = Array.from(showMap.values());
      watchedShows.sort((a, b) => b.viewedAt - a.viewedAt);

      // Limit results
      watchedShows = watchedShows.slice(0, limit);

      // Filter by date if needed
      if (cutoffDate) {
        return watchedShows.filter(show => show.viewedAt > cutoffDate);
      }

      return watchedShows;
    } catch (error) {
      console.error('Error fetching Jellyfin watched shows:', error);
      return [];
    }
  }
}

// Create a singleton instance
const jellyfinService = new JellyfinService();
export default jellyfinService;
