/* eslint-disable no-unused-vars */
import axios from 'axios';
/* eslint-enable no-unused-vars */
import credentialsService from './CredentialsService';
import apiService from './ApiService';
import AuthService from './AuthService';
import databaseStorageUtils from '../utils/DatabaseStorageUtils';

class PlexService {
constructor() {
    this.token = '';
    this.baseUrl = '';
    this.selectedUserId = '';
    // Flag to track if credentials have been loaded
    this.credentialsLoaded = false;
    // Initialize selectedUserId - keep this as it's using a synchronous method
    this.initSelectedUserId();
    // Removed automatic loading of credentials to prevent double loading
  }

  /**
   * Initialize selectedUserId from database
   */
  async initSelectedUserId() {
    try {
      this.selectedUserId = await databaseStorageUtils.getSync('selectedPlexUserId') || '';
    } catch (error) {
      console.error('Error initializing selectedPlexUserId:', error);
      this.selectedUserId = '';
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
    
    const credentials = await credentialsService.getCredentials('plex');
    if (credentials) {
      this.baseUrl = credentials.baseUrl || '';
      this.token = credentials.token || '';
      // selectedUserId is stored separately via DatabaseStorageUtils
      
      // Load recentLimit if available
      if (credentials.recentLimit) {
        await databaseStorageUtils.set('plexRecentLimit', credentials.recentLimit);
      }
      
      this.credentialsLoaded = true; // Set flag after successful load
    }
  }

  /**
   * Configure the Plex service with API details
   * @param {string} baseUrl - The base URL of your Plex instance (e.g., http://localhost:32400)
   * @param {string} token - Your Plex token
   * @param {string} selectedUserId - The ID of the selected Plex user for watch history
   */
  async configure(baseUrl, token, selectedUserId = '', recentLimit = null) {
    // Normalize the URL by removing trailing slashes
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    this.token = token;
    this.selectedUserId = selectedUserId;
    
    // Use individual setting API for selectedUserId
    await databaseStorageUtils.set('selectedPlexUserId', selectedUserId);
    
    const credentials = {
      baseUrl: this.baseUrl,
      token: this.token
    };
    
    // If recentLimit is provided, store it with the credentials
    if (recentLimit !== null) {
      credentials.recentLimit = recentLimit;
      // Also store in database using individual setting API
      await databaseStorageUtils.set('plexRecentLimit', recentLimit);
    }
    
    // Store credentials server-side (single set of credentials)
    await credentialsService.storeCredentials('plex', credentials);
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
    try {
      // Try to load credentials if not already configured
      if (!this.isConfigured()) {
        // Only load credentials if they haven't been loaded yet
        if (!this.credentialsLoaded) {
          await this.loadCredentials();
        }
        
        if (!this.isConfigured()) {
          throw new Error('Plex service is not configured. Please set baseUrl and token.');
        }
      }

      const response = await apiService.proxyRequest({
        url: `${this.baseUrl}/identity`,
        method: 'GET',
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
   * Get list of all Plex users that have access to the server
   * @returns {Promise<Array>} - List of Plex users
   */
  async getUsers() {
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('Plex service is not configured. Please set baseUrl and token.');
      }
    }

    try {
      // Get the owner/admin account info from the local server
      const meResponse = await apiService.proxyRequest({
        url: `${this.baseUrl}/`,
        method: 'GET',
        params: { 
          'X-Plex-Token': this.token 
        }
      });
      
      let users = [];
      let serverOwnerUsername = 'Owner';
      
      // Process the response to extract the server owner info
      if (typeof meResponse.data === 'object') {
        // JSON response
        if (meResponse.data.MediaContainer) {
          if (meResponse.data.MediaContainer.MyPlex) {
            const myPlex = meResponse.data.MediaContainer.MyPlex;
            serverOwnerUsername = myPlex.username || 'Owner';
          }
        }
      } else if (typeof meResponse.data === 'string') {
        // XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(meResponse.data, "text/xml");
        
        const mediaContainer = xmlDoc.querySelector('MediaContainer');
        if (mediaContainer) {
          const myPlex = mediaContainer.querySelector('MyPlex');
          if (myPlex) {
            serverOwnerUsername = myPlex.getAttribute('username') || 'Owner';
          }
        }
      }
      
      // Add the server owner/admin (special case for accountID=1)
      users.push({
        id: '1',
        username: serverOwnerUsername,
        name: serverOwnerUsername,
        isAdmin: true,
        isOwner: true
      });
      
      // Get users from the accounts endpoint
      try {
        const accountsResponse = await apiService.proxyRequest({
          url: `${this.baseUrl}/accounts`,
          method: 'GET',
          params: { 
            'X-Plex-Token': this.token
          }
        });
        
        const userMap = new Map();
        
        if (typeof accountsResponse.data === 'object') {
          // JSON response
          if (accountsResponse.data.MediaContainer && accountsResponse.data.MediaContainer.Account) {
            const accounts = accountsResponse.data.MediaContainer.Account;
            
            // Process each account to extract user information
            accounts.forEach(account => {
              if (account.id && !userMap.has(account.id.toString())) {
                userMap.set(account.id.toString(), {
                  id: account.id.toString(),
                  username: account.name || account.title || `User ${account.id}`,
                  name: account.name || account.title || `User ${account.id}`,
                  isAdmin: account.roles && account.roles.includes('admin'),
                  isOwner: false
                });
              }
            });
          }
        } else if (typeof accountsResponse.data === 'string') {
          // XML response
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(accountsResponse.data, "text/xml");
          
          const accountNodes = xmlDoc.querySelectorAll('Account');
          Array.from(accountNodes).forEach(node => {
            const accountID = node.getAttribute('id');
            const name = node.getAttribute('name') || node.getAttribute('title');
            const roles = node.getAttribute('roles') || '';
            
            if (accountID && !userMap.has(accountID)) {
              userMap.set(accountID, {
                id: accountID,
                username: name || `User ${accountID}`,
                name: name || `User ${accountID}`,
                isAdmin: roles.includes('admin'),
                isOwner: false
              });
            }
          });
        }
        
        // Add any found users to our users array
        userMap.forEach(user => {
          // Skip user ID 1 which we already added as the admin
          if (user.id !== '1') {
            users.push(user);
          }
        });
      } catch (error) {
        console.warn('Could not fetch user information from accounts endpoint:', error);
        
        // Fall back to trying to find users from watch history
        try {
          // Try to get history for all users which might show user-specific entries
          const historyResponse = await apiService.proxyRequest({
            url: `${this.baseUrl}/status/sessions/history/all`,
            method: 'GET',
            params: { 
              'X-Plex-Token': this.token,
              'sort': 'viewedAt:desc',
              'limit': 100
            }
          });
          
          // Parse the history data to extract user information
          const userMap = new Map();
          
          if (typeof historyResponse.data === 'object') {
            // JSON response
            if (historyResponse.data.MediaContainer && historyResponse.data.MediaContainer.Metadata) {
              const entries = historyResponse.data.MediaContainer.Metadata;
              
              // Process each history entry to extract user information
              entries.forEach(entry => {
                if (entry.accountID && !userMap.has(entry.accountID.toString())) {
                  userMap.set(entry.accountID.toString(), {
                    id: entry.accountID.toString(),
                    username: entry.Account ? entry.Account.title : `User ${entry.accountID}`,
                    name: entry.Account ? entry.Account.title : `User ${entry.accountID}`,
                    isAdmin: false,
                    isOwner: false
                  });
                }
              });
            }
          } else if (typeof historyResponse.data === 'string') {
            // XML response
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(historyResponse.data, "text/xml");
            
            const metadataNodes = xmlDoc.querySelectorAll('Metadata');
            Array.from(metadataNodes).forEach(node => {
              const accountID = node.getAttribute('accountID');
              const accountTitle = node.querySelector('Account')?.getAttribute('title');
              
              if (accountID && !userMap.has(accountID)) {
                userMap.set(accountID, {
                  id: accountID,
                  username: accountTitle || `User ${accountID}`,
                  name: accountTitle || `User ${accountID}`,
                  isAdmin: false,
                  isOwner: false
                });
              }
            });
          }
          
          // Add any found users to our users array
          userMap.forEach(user => {
            // Skip user ID 1 which we already added as the admin
            if (user.id !== '1') {
              users.push(user);
            }
          });
        } catch (historyError) {
          console.warn('Could not fetch user information from watch history:', historyError);
          // Continue with just the owner user
        }
      }
      
      // If we still only have the admin user, add a generic "All Users" option
      if (users.length === 1) {
        users.push({
          id: '0',
          username: 'All Users',
          name: 'All Users',
          isAdmin: false,
          isOwner: false
        });
      }
      
      return users;
    } catch (error) {
      console.error('Error fetching users from Plex:', error);
      throw error;
    }
  }

  /**
   * Get recently watched movies from Plex
   * @param {number} limit - Maximum number of items to return
   * @param {number} [daysAgo=0] - Only include movies watched within this many days (0 for all)
   * @param {string} [userId=''] - User ID to filter history by (defaults to selectedUserId)
   * @returns {Promise<Array>} - List of recently watched movies
   */
  async getRecentlyWatchedMovies(limit = 100, daysAgo = 0, userId = '') {
    // Try to load credentials if not already configured
    if (!this.isConfigured()) {
      // Only load credentials if they haven't been loaded yet
      if (!this.credentialsLoaded) {
        await this.loadCredentials();
      }
      
      if (!this.isConfigured()) {
        throw new Error('Plex service is not configured. Please set baseUrl and token.');
      }
    }
    
    // For non-admin users, reload credentials to get the admin-set limit
    if (!AuthService.isAdmin()) {
      const credentials = await credentialsService.getCredentials('plex');
      if (credentials && credentials.recentLimit !== undefined) {
        // Override the provided limit with the admin-set limit
        limit = credentials.recentLimit;
      }
    }

    try {
      // Use provided userId or fall back to the selectedUserId
      const userIdToUse = userId || this.selectedUserId;
      
      // Build params object
      const params = {
        'X-Plex-Token': this.token,
        'type': 1, // Type 1 is movie
        'sort': 'viewedAt:desc',
        'limit': limit * 2 // Request more items since we'll filter some out
      };
      
      // If we have a specific user ID, add it to the request
      if (userIdToUse) {
        params['accountID'] = userIdToUse;
      }
      
      // Get recently watched from the history endpoint through the proxy server
      const response = await apiService.proxyRequest({
        url: `${this.baseUrl}/status/sessions/history/all`,
        method: 'GET',
        params: params
      });

      // Log response type and structure for debugging
      console.log('Plex movie response type:', typeof response.data);
      
      // Try to handle both XML and JSON responses
      let movies = [];
      
      if (typeof response.data === 'object') {
        // Handle JSON response
        console.log('Processing Plex movie response as JSON');
        if (response.data.MediaContainer && response.data.MediaContainer.Metadata) {
          const metadata = response.data.MediaContainer.Metadata;
          console.log(`Found ${metadata.length} movies in Plex JSON response`);
          
          movies = metadata.map(item => {
            // For movies, we need to make sure we're not getting TV episodes
            // Check if this is actually a movie by checking for the absence of grandparentTitle
            // and parentIndex (which would indicate it's part of a TV series)
            const isMovie = !item.grandparentTitle && !item.parentIndex;
            
            if (isMovie) {
              return {
                title: item.title,
                year: item.year,
                viewedAt: item.lastViewedAt || item.viewedAt,
                ratingKey: item.ratingKey
              };
            } else {
              // If this is a TV episode, we'll filter it out later
              return {
                title: null // This will be filtered out
              };
            }
          });
        }
      } else if (typeof response.data === 'string') {
        // Handle XML response
        console.log('Processing Plex movie response as XML');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, "text/xml");
        
        // Look for MediaContainer first
        const mediaContainer = xmlDoc.querySelector('MediaContainer');
        if (mediaContainer) {
          // Try to find Metadata elements
          const metadataNodes = mediaContainer.querySelectorAll('Metadata');
          if (metadataNodes.length > 0) {
            console.log(`Found ${metadataNodes.length} movie Metadata nodes in XML`);
            movies = Array.from(metadataNodes).map(node => {
              // For movies, we need to make sure we're not getting TV episodes
              // Check if this is actually a movie by checking for the absence of grandparentTitle
              const hasGrandparentTitle = node.getAttribute('grandparentTitle');
              const hasParentIndex = node.getAttribute('parentIndex');
              const isMovie = !hasGrandparentTitle && !hasParentIndex;
              
              if (isMovie) {
                return {
                  title: node.getAttribute('title'),
                  year: node.getAttribute('year'),
                  viewedAt: node.getAttribute('lastViewedAt') || node.getAttribute('viewedAt'),
                  ratingKey: node.getAttribute('ratingKey')
                };
              } else {
                // If this is a TV episode, we'll filter it out later
                return {
                  title: null
                };
              }
            });
          } else {
            // Fall back to Video nodes
            const videoNodes = xmlDoc.querySelectorAll('Video');
            console.log(`Found ${videoNodes.length} movie Video nodes in XML`);
            movies = Array.from(videoNodes).map(node => {
              // For movies, check if this is actually a movie by looking for absence of TV show attributes
              const hasGrandparentTitle = node.getAttribute('grandparentTitle');
              const hasParentIndex = node.getAttribute('parentIndex');
              const isMovie = !hasGrandparentTitle && !hasParentIndex;
              
              if (isMovie) {
                return {
                  title: node.getAttribute('title'),
                  year: node.getAttribute('year'),
                  viewedAt: node.getAttribute('lastViewedAt') || node.getAttribute('viewedAt'),
                  ratingKey: node.getAttribute('ratingKey')
                };
              } else {
                // If this is a TV episode, return null title to filter it out
                return {
                  title: null
                };
              }
            });
          }
        }
      }
      
      // Filter out items without titles
      let validMovies = movies.filter(movie => movie.title);
      
      // Apply the daysAgo filter manually
      if (daysAgo > 0) {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const daysAgoInSeconds = daysAgo * 24 * 60 * 60;
        const cutoffTimestamp = nowInSeconds - daysAgoInSeconds;
        
        console.log(`Filtering movies watched in the last ${daysAgo} days (after timestamp ${cutoffTimestamp})`);
        
        validMovies = validMovies.filter(movie => {
          
          if (!movie.viewedAt) {
            return true;
          }
          
          const viewedAtTimestamp = parseInt(movie.viewedAt);
          const isRecent = viewedAtTimestamp >= cutoffTimestamp;
          
          return isRecent;
        });
      }
      
      // Remove duplicates
      const uniqueMovies = validMovies.filter((movie, index, self) => 
        index === self.findIndex((m) => m.title === movie.title)
      );
      
      // Apply the limit after filtering
      const limitedMovies = uniqueMovies.slice(0, limit);
      
      console.log(`Returning ${limitedMovies.length} unique recently watched movies`);
      return limitedMovies;
    } catch (error) {
      console.error('Error fetching recently watched movies from Plex:', error);
      throw error;
    }
  }

  /**
   * Get recently watched TV shows from Plex
   * @param {number} limit - Maximum number of items to return
   * @param {number} [daysAgo=0] - Only include shows watched within this many days (0 for all)
   * @param {string} [userId=''] - User ID to filter history by (defaults to selectedUserId)
   * @returns {Promise<Array>} - List of recently watched TV shows
   */
  async getRecentlyWatchedShows(limit = 100, daysAgo = 0, userId = '') {
    // Try to load credentials if not already configured
    if (!this.isConfigured()) {
      // Only load credentials if they haven't been loaded yet
      if (!this.credentialsLoaded) {
        await this.loadCredentials();
      }
      
      if (!this.isConfigured()) {
        throw new Error('Plex service is not configured. Please set baseUrl and token.');
      }
    }
    
    // For non-admin users, reload credentials to get the admin-set limit
    if (!AuthService.isAdmin()) {
      const credentials = await credentialsService.getCredentials('plex');
      if (credentials && credentials.recentLimit !== undefined) {
        // Override the provided limit with the admin-set limit
        limit = credentials.recentLimit;
      }
    }
    
    try {
      // Use provided userId or fall back to the selectedUserId
      const userIdToUse = userId || this.selectedUserId;
      
      // Build params object
      const params = {
        'X-Plex-Token': this.token,
        'type': 4, // Type 4 is TV episode
        'sort': 'viewedAt:desc',
        'limit': limit * 2 // Request more items since we'll filter some out
      };
      
      // If we have a specific user ID, add it to the request
      if (userIdToUse) {
        params['accountID'] = userIdToUse;
      }
      
      // Get recently watched from the history endpoint through the proxy server
      const response = await apiService.proxyRequest({
        url: `${this.baseUrl}/status/sessions/history/all`,
        method: 'GET',
        params: params
      });
      
      // Log response type and structure for debugging
      console.log('Plex TV response type:', typeof response.data);
      
      // Store episodes with their timestamps for filtering
      const episodes = [];
      
      if (typeof response.data === 'object') {
        // Handle JSON response
        console.log('Processing Plex TV response as JSON');
        if (response.data.MediaContainer && response.data.MediaContainer.Metadata) {
          const metadata = response.data.MediaContainer.Metadata;
          console.log(`Found ${metadata.length} episodes in Plex JSON response`);
          
          // Process each episode and extract show information
          metadata.forEach(item => {
            // Always prioritize grandparentTitle for TV shows, since that's the series name
            const showTitle = item.grandparentTitle;
            
            // Only proceed if we have a valid show title
            if (showTitle) {
              episodes.push({
                title: showTitle,
                year: item.parentYear || item.year,
                viewedAt: item.lastViewedAt || item.viewedAt,
                ratingKey: item.grandparentRatingKey || item.ratingKey
              });
            }
          });
        }
      } else if (typeof response.data === 'string') {
        // Handle XML response
        console.log('Processing Plex TV response as XML');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, "text/xml");
        
        // Look for MediaContainer first
        const mediaContainer = xmlDoc.querySelector('MediaContainer');
        if (mediaContainer) {
          // Try to find Metadata elements
          const metadataNodes = mediaContainer.querySelectorAll('Metadata');
          if (metadataNodes.length > 0) {
            console.log(`Found ${metadataNodes.length} episode Metadata nodes in XML`);
            
            // Process each episode metadata node
            Array.from(metadataNodes).forEach(node => {
              // Always prioritize grandparentTitle for TV shows
              const showTitle = node.getAttribute('grandparentTitle');
              
              // Only proceed if we have a valid show title
              if (showTitle) {
                episodes.push({
                  title: showTitle,
                  year: node.getAttribute('parentYear') || node.getAttribute('year'),
                  viewedAt: node.getAttribute('lastViewedAt') || node.getAttribute('viewedAt'),
                  ratingKey: node.getAttribute('grandparentRatingKey') || node.getAttribute('ratingKey')
                });
              }
            });
          } else {
            // Fall back to Video nodes
            const videoNodes = xmlDoc.querySelectorAll('Video');
            console.log(`Found ${videoNodes.length} episode Video nodes in XML`);
            
            // Process each video node
            Array.from(videoNodes).forEach(node => {
              const showTitle = node.getAttribute('grandparentTitle');
              if (showTitle) {
                episodes.push({
                  title: showTitle,
                  year: node.getAttribute('parentYear') || node.getAttribute('year'),
                  viewedAt: node.getAttribute('lastViewedAt') || node.getAttribute('viewedAt'),
                  ratingKey: node.getAttribute('grandparentRatingKey')
                });
              }
            });
          }
        }
      }
      
      // Apply the daysAgo filter manually
      let filteredEpisodes = episodes;
      if (daysAgo > 0) {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const daysAgoInSeconds = daysAgo * 24 * 60 * 60;
        const cutoffTimestamp = nowInSeconds - daysAgoInSeconds;
        
        console.log(`Filtering TV shows watched in the last ${daysAgo} days (after timestamp ${cutoffTimestamp})`);
        
        filteredEpisodes = episodes.filter(episode => {
          if (!episode.viewedAt) {
            return true;
          }
          
          const viewedAtTimestamp = parseInt(episode.viewedAt);
          const isRecent = viewedAtTimestamp >= cutoffTimestamp;
          
          return isRecent;
        });
      }
      
      // Store unique shows with a Map (using the filtered episodes)
      const showMap = new Map();
      filteredEpisodes.forEach(episode => {
        if (!showMap.has(episode.title)) {
          showMap.set(episode.title, episode);
        }
      });
      
      // Convert the Map to an array
      const shows = Array.from(showMap.values());
      
      // Apply the limit after filtering
      const limitedShows = shows.slice(0, limit);
      
      console.log(`Returning ${limitedShows.length} unique recently watched TV shows`);
      return limitedShows;
    } catch (error) {
      console.error('Error fetching recently watched shows from Plex:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const plexService = new PlexService();

export default plexService;
