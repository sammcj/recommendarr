/* eslint-disable no-unused-vars */
import axios from 'axios';
/* eslint-enable no-unused-vars */
import credentialsService from './CredentialsService';
import apiService from './ApiService';
import databaseStorageUtils from '../utils/DatabaseStorageUtils';

class JellyfinService {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.userId = '';
    this.username = ''; // Add username property
    // Flag to track if credentials have been loaded
    this.credentialsLoaded = false;


    // Load userId asynchronously if not already loaded
    this.loadUserId();
  }
  
  /**
   * Load userId from database
   */
  async loadUserId() {
    try {
      this.userId = await databaseStorageUtils.get('selectedJellyfinUserId') || '';
    } catch (error) {
      console.error('Error loading selectedJellyfinUserId:', error);
      this.userId = '';
    }
  }
  
  /**
   * Load credentials from server-side storage
   */
  async loadCredentials() {
    // Skip if already loaded to prevent double loading
    if (this.credentialsLoaded) {
      return;
    }
    
    const credentials = await credentialsService.getCredentials('jellyfin');
    if (credentials) {
      this.baseUrl = credentials.baseUrl || '';
      this.apiKey = credentials.apiKey || '';
      this.username = credentials.username || ''; // Load username
      // userId is now stored separately via DatabaseStorageUtils
      
      // Load recentLimit if available
      if (credentials.recentLimit) {
        await databaseStorageUtils.set('jellyfinRecentLimit', credentials.recentLimit);
      }
      
      this.credentialsLoaded = true; // Set flag after successful load
    }
  }
  
  /**
   * Update the last history refresh timestamp
   * @returns {Promise<boolean>} Success status
   */
  async updateLastHistoryRefresh() {
    try {
      const now = new Date().toISOString();
      
      // Use individual setting API to update the timestamp
      await databaseStorageUtils.set('lastJellyfinHistoryRefresh', now);
      
      
      return true;
    } catch (error) {
      console.error('Error updating lastJellyfinHistoryRefresh:', error);
      return false;
    }
  }

  async configure(baseUrl, apiKey, userId, username, recentLimit = null) { // Add username parameter
    // Ensure baseUrl doesn't end with a slash
    this.baseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : '';
    this.apiKey = apiKey || '';
    this.username = username || ''; // Set username
    this.userId = userId || '';
    await databaseStorageUtils.set('selectedJellyfinUserId', this.userId);

    const credentials = {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      username: this.username // Add username to credentials object
    };
    
    // If recentLimit is provided, store it with the credentials
    if (recentLimit !== null) {
      credentials.recentLimit = recentLimit;
      // Also store in databaseStorageUtils for client-side access
      await databaseStorageUtils.set('jellyfinRecentLimit', recentLimit);
    }
    
    // Store credentials server-side (single set of credentials)
    await credentialsService.storeCredentials('jellyfin', credentials);
  }

  isConfigured() {
    // Only check for base URL and API key, as userId can be looked up
    return !!this.baseUrl && !!this.apiKey;
  }
  
  async getUsers() {
    // Try to load credentials if not already configured
    if (!this.isConfigured()) {
      // Only load credentials if they haven't been loaded yet
      if (!this.credentialsLoaded) {
        await this.loadCredentials();
      }
      
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
    // Ensure credentials are loaded if not already
    if (!this.credentialsLoaded) {
      await this.loadCredentials();
    }
    
    // Check basic configuration (URL and API Key)
    if (!this.isConfigured()) {
      return { success: false, message: 'Jellyfin URL and API key are required.' };
    }

    try {
      // 1. Basic System Info Check
      const systemResponse = await apiService.proxyRequest({
        url: `${this.baseUrl}/System/Info`,
        method: 'GET',
        headers: { 'X-Emby-Token': this.apiKey }
      });
      
      if (systemResponse.status !== 200) {
        return { success: false, message: `Error connecting to Jellyfin server: ${systemResponse.status}` };
      }

      // 2. Ensure userId is loaded
      if (!this.userId) {
        await this.loadUserId(); // Wait for userId to load if it wasn't already
      }

      // 3. Primary User Validation (if userId exists)
      let userValid = false;
      let userName = '';
      if (this.userId) {
        try {
          const userResponse = await apiService.proxyRequest({
            url: `${this.baseUrl}/Users/${this.userId}`,
            method: 'GET',
            headers: { 'X-Emby-Token': this.apiKey }
          });
          if (userResponse.status === 200) {
            userValid = true;
            userName = userResponse.data.Name;
          }
        } catch (userError) {
          console.warn(`Initial validation for userId ${this.userId} failed. Will attempt username lookup.`);
          userValid = false;
        }
      }

      // 4. Fallback: Lookup userId by username if primary validation failed or userId was missing
      if (!userValid && this.username) {
        console.log(`Attempting to find userId for username: ${this.username}`);
        const foundUserId = await this.getUserIdByUsername(this.username);
        
        if (foundUserId) {
          console.log(`Found userId ${foundUserId} for username ${this.username}. Validating...`);
          // Store the found ID and try validation again
          this.userId = foundUserId;
          await databaseStorageUtils.set('selectedJellyfinUserId', this.userId);
          
          try {
            const userResponse = await apiService.proxyRequest({
              url: `${this.baseUrl}/Users/${this.userId}`,
              method: 'GET',
              headers: { 'X-Emby-Token': this.apiKey }
            });
            if (userResponse.status === 200) {
              userValid = true;
              userName = userResponse.data.Name;
            }
          } catch (fallbackUserError) {
            console.error(`Validation failed even after username lookup for userId ${this.userId}.`);
            userValid = false;
          }
        } else {
          console.warn(`Could not find userId for username: ${this.username}`);
        }
      }

      // 5. Final Result
      if (userValid) {
        return { 
          success: true, 
          message: `Connected to Jellyfin successfully! User: ${userName}`
        };
      } else if (!this.username && !this.userId) {
        // Connected to server, but no user info available to check
        return { success: true, message: 'Connected to Jellyfin server, but no user specified.' };
      } else {
        // Connected to server, but user validation failed
        return { 
          success: false, 
          message: 'Connected to Jellyfin server, but failed to validate the specified user.' 
        };
      }
      
    } catch (error) {
      // Catch errors from the initial /System/Info call or other unexpected issues
      return { 
        success: false, 
        message: `Error connecting to Jellyfin: ${error.message || 'Unknown error'}`
      };
    }
  }

  async getRecentlyWatchedMovies(limit = 50, daysAgo = null) {
    // Try to load credentials if not already configured
    if (!this.isConfigured() || !this.userId) {
      // Only load credentials if they haven't been loaded yet
      if (!this.credentialsLoaded) {
        await this.loadCredentials();
      }
      
      if (!this.isConfigured() || !this.userId) {
        return [];
      }
    }
    
    // Try to get the limit from database first
    const storedLimit = await databaseStorageUtils.get('jellyfinRecentLimit');
    if (storedLimit !== null) {
      limit = storedLimit;
    } else {
      // Fall back to credentials if not in database
      const credentials = await credentialsService.getCredentials('jellyfin');
      if (credentials && credentials.recentLimit !== undefined) {
        // Override the provided limit with the stored limit
        limit = credentials.recentLimit;
        // Store it in the database for next time
        await databaseStorageUtils.set('jellyfinRecentLimit', limit);
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
    // Try to load credentials if not already configured
    if (!this.isConfigured() || !this.userId) {
      // Only load credentials if they haven't been loaded yet
      if (!this.credentialsLoaded) {
        await this.loadCredentials();
      }
      
      if (!this.isConfigured() || !this.userId) {
        return [];
      }
    }
    
    // Try to get the limit from database first
    const storedLimit = await databaseStorageUtils.get('jellyfinRecentLimit');
    if (storedLimit !== null) {
      limit = storedLimit;
    } else {
      // Fall back to credentials if not in database
      const credentials = await credentialsService.getCredentials('jellyfin');
      if (credentials && credentials.recentLimit !== undefined) {
        // Override the provided limit with the stored limit
        limit = credentials.recentLimit;
        // Store it in the database for next time
        await databaseStorageUtils.set('jellyfinRecentLimit', limit);
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
