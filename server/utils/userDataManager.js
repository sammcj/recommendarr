// User data manager module
const databaseService = require('./databaseService');

// Default user data template
const createDefaultUserData = () => ({
  // Basic recommendation arrays
  tvRecommendations: [],
  movieRecommendations: [],
  likedTV: [],
  dislikedTV: [],
  hiddenTV: [],
  likedMovies: [],
  dislikedMovies: [],
  hiddenMovies: [],
  watchHistory: {
    movies: [],
    shows: []
  },
  
  // Basic UI settings
  numRecommendations: 6,
  columnsCount: 3,
  historyColumnsCount: 3,
  darkTheme: false,
  
  // History display settings
  historyHideExisting: true,
  historyHideLiked: false,
  historyHideDisliked: false,
  historyHideHidden: true,
  
  // Content preferences
  contentTypePreference: 'tv',
  
  // Library settings
  useSampledLibrary: false,
  librarySampleSize: 100,
  useStructuredOutput: false,
  useCustomPromptOnly: false,
  
  // Plex-specific settings
  selectedPlexUserId: '',
  plexRecentLimit: 6500,
  plexHistoryMode: 'recent',
  plexCustomHistoryDays: 30,
  plexOnlyMode: false,
  
  // Jellyfin-specific settings
  selectedJellyfinUserId: '',
  jellyfinRecentLimit: 100,
  jellyfinHistoryMode: 'all',
  jellyfinOnlyMode: false,
  
  // Tautulli-specific settings
  selectedTautulliUserId: '',
  tautulliRecentLimit: 50,
  tautulliHistoryMode: 'all',
  tautulliOnlyMode: false,
  
  // Trakt-specific settings
  traktRecentLimit: 50,
  traktHistoryMode: 'all',
  traktOnlyMode: false,
  
  // Watch history refresh timestamps
  lastPlexHistoryRefresh: null,
  lastJellyfinHistoryRefresh: null,
  lastTautulliHistoryRefresh: null,
  lastTraktHistoryRefresh: null,
  
  // Watch history
  watchHistoryMovies: [],
  watchHistoryShows: [],
  
  // Service-specific watch history
  jellyfinWatchHistoryMovies: [],
  jellyfinWatchHistoryShows: [],
  tautulliWatchHistoryMovies: [],
  tautulliWatchHistoryShows: [],
  traktWatchHistoryMovies: [],
  traktWatchHistoryShows: [],
  
  // General preferences
  genrePreferences: [],
  languagePreference: 'en',
  customVibe: '',
  
  // AI model settings
  openaiModel: 'google/gemini-2.0-flash-exp:free',
  temperature: 0.8,
  
  // Recommendation history
  previousTVRecommendations: [],
  currentTVRecommendations: [],
  
  // Migration flags
  fullDatabaseStorageMigrationComplete: false,
  
  // Individual settings are now stored in separate columns in the database
  // This empty settings object is kept for backward compatibility
  settings: {}
});

class UserDataManager {
  constructor() {
    this.initialized = false;
  }
  
  // Initialize the user data manager
  async init() {
    try {
      
      
      // Ensure database is initialized
      if (!databaseService.initialized) {
        
        await databaseService.init();
      }
      
      this.initialized = true;
      
    } catch (err) {
      console.error('Error initializing user data manager:', err);
      throw err;
    }
  }
  
  // Load user data for a specific user
  async getUserData(userId) {
    try {
      // Ensure the service is initialized
      if (!this.initialized) {
        
        await this.init();
      }
      
      
      
      // Get user data from database
      const userData = databaseService.getUserData(userId);
      
      // If no user data found, return default data
      if (!userData) {
        
        const defaultData = createDefaultUserData();
        
        // Save and return the default data
        await this.saveUserData(userId, defaultData);
        return defaultData;
      }
      
      // Ensure all properties exist with default values if not present
      const defaultData = createDefaultUserData();
      const mergedData = { ...defaultData, ...userData };
      
      return mergedData;
    } catch (err) {
      console.error(`Error reading user data for userId: ${userId}:`, err);
      // Return default data in case of error
      const defaultData = createDefaultUserData();
      return defaultData;
    }
  }
  
  // Save user data for a specific user
  async saveUserData(userId, userData) {
    try {
      // Ensure the service is initialized
      if (!this.initialized) {
        
        await this.init();
      }
      
      
      
      // Make sure userData is valid before saving
      if (!userData || typeof userData !== 'object') {
        throw new Error('Invalid userData object');
      }
      
      // Check if settings contains any history refresh timestamps
      // These are now stored in individual columns, but we'll log them for debugging
      const hasHistoryRefreshTimestamps = 
        userData.lastPlexHistoryRefresh || 
        userData.lastJellyfinHistoryRefresh || 
        userData.lastTautulliHistoryRefresh || 
        userData.lastTraktHistoryRefresh;
      
      if (hasHistoryRefreshTimestamps) {
        console.log('userDataManager.saveUserData: Received data with history refresh timestamps:', {
          lastPlexHistoryRefresh: userData.lastPlexHistoryRefresh,
          lastJellyfinHistoryRefresh: userData.lastJellyfinHistoryRefresh,
          lastTautulliHistoryRefresh: userData.lastTautulliHistoryRefresh,
          lastTraktHistoryRefresh: userData.lastTraktHistoryRefresh
        });
      }
      
      // Ensure basic array properties exist
      if (!Array.isArray(userData.tvRecommendations)) userData.tvRecommendations = [];
      if (!Array.isArray(userData.movieRecommendations)) userData.movieRecommendations = [];
      if (!Array.isArray(userData.likedTV)) userData.likedTV = [];
      if (!Array.isArray(userData.dislikedTV)) userData.dislikedTV = [];
      if (!Array.isArray(userData.hiddenTV)) userData.hiddenTV = [];
      if (!Array.isArray(userData.likedMovies)) userData.likedMovies = [];
      if (!Array.isArray(userData.dislikedMovies)) userData.dislikedMovies = [];
      if (!Array.isArray(userData.hiddenMovies)) userData.hiddenMovies = [];
      if (!userData.watchHistory) userData.watchHistory = { movies: [], shows: [] };
      
      // Log arrays for debugging
      console.log(`userDataManager.saveUserData: arrays being saved:`, {
        tvCount: userData.tvRecommendations ? userData.tvRecommendations.length : 0,
        movieCount: userData.movieRecommendations ? userData.movieRecommendations.length : 0
      });
      
      // Ensure all other properties have default values if not present
      const defaultData = createDefaultUserData();
      
      // Merge with defaults for all properties except the basic arrays we already checked
      // and userId which shouldn't change and settings which is deprecated
      Object.keys(defaultData).forEach(key => {
        if (!['tvRecommendations', 'movieRecommendations', 'likedTV', 'dislikedTV', 
              'hiddenTV', 'likedMovies', 'dislikedMovies', 'hiddenMovies', 
              'watchHistory', 'settings'].includes(key) && 
            userData[key] === undefined) {
          userData[key] = defaultData[key];
        }
      });
      
      // Keep the empty settings object for backward compatibility
      if (!userData.settings) userData.settings = {};
      
      // Save to database
      const success = databaseService.saveUserData(userId, userData);
      
      if (hasHistoryRefreshTimestamps) {
        
      }
      
      
      return success;
    } catch (err) {
      console.error(`Error saving user data for userId: ${userId}:`, err);
      return false;
    }
  }
  
  // Delete user data
  async deleteUserData(userId) {
    try {
      // Ensure the service is initialized
      if (!this.initialized) {
        
        await this.init();
      }
      
      
      
      // Delete from database
      const success = databaseService.deleteUserData(userId);
      
      
      return success;
    } catch (err) {
      console.error(`Error deleting user data for userId: ${userId}:`, err);
      return false;
    }
  }
  
  // Migrate legacy data to per-user data
  async migrateLegacyData(legacyData, userId) {
    try {
      // Ensure the service is initialized
      if (!this.initialized) {
        
        await this.init();
      }
      
      
      
      // Load the user's current data (or create default)
      const userData = await this.getUserData(userId);
      
      // Transfer recommendations and preferences
      // Only merge recommendations if user data is not explicitly empty
      // This respects when a user has cleared their history
      if (legacyData.tvRecommendations && legacyData.tvRecommendations.length > 0) {
        // Only merge if user hasn't explicitly cleared their history (empty array)
        if (userData.tvRecommendations.length > 0 || userData.tvRecommendations === undefined) {
          userData.tvRecommendations = [
            ...new Set([...userData.tvRecommendations, ...legacyData.tvRecommendations])
          ];
        }
      }
      
      if (legacyData.movieRecommendations && legacyData.movieRecommendations.length > 0) {
        // Only merge if user hasn't explicitly cleared their history (empty array)
        if (userData.movieRecommendations.length > 0 || userData.movieRecommendations === undefined) {
          userData.movieRecommendations = [
            ...new Set([...userData.movieRecommendations, ...legacyData.movieRecommendations])
          ];
        }
      }
      
      if (legacyData.likedTV && legacyData.likedTV.length > 0) {
        userData.likedTV = [
          ...new Set([...userData.likedTV, ...legacyData.likedTV])
        ];
      }
      
      if (legacyData.dislikedTV && legacyData.dislikedTV.length > 0) {
        userData.dislikedTV = [
          ...new Set([...userData.dislikedTV, ...legacyData.dislikedTV])
        ];
      }
      
      if (legacyData.hiddenTV && legacyData.hiddenTV.length > 0) {
        userData.hiddenTV = [
          ...new Set([...userData.hiddenTV, ...legacyData.hiddenTV])
        ];
      }
      
      if (legacyData.likedMovies && legacyData.likedMovies.length > 0) {
        userData.likedMovies = [
          ...new Set([...userData.likedMovies, ...legacyData.likedMovies])
        ];
      }
      
      if (legacyData.dislikedMovies && legacyData.dislikedMovies.length > 0) {
        userData.dislikedMovies = [
          ...new Set([...userData.dislikedMovies, ...legacyData.dislikedMovies])
        ];
      }
      
      if (legacyData.hiddenMovies && legacyData.hiddenMovies.length > 0) {
        userData.hiddenMovies = [
          ...new Set([...userData.hiddenMovies, ...legacyData.hiddenMovies])
        ];
      }
      
      // Transfer watch history
      if (legacyData.watchHistory) {
        if (legacyData.watchHistory.movies && legacyData.watchHistory.movies.length > 0) {
          userData.watchHistory.movies = [
            ...new Set([...userData.watchHistory.movies, ...legacyData.watchHistory.movies])
          ];
        }
        
        if (legacyData.watchHistory.shows && legacyData.watchHistory.shows.length > 0) {
          userData.watchHistory.shows = [
            ...new Set([...userData.watchHistory.shows, ...legacyData.watchHistory.shows])
          ];
        }
      }
      
      // For legacy data migration, we'll need to update individual settings
      // instead of merging the settings object
      if (legacyData.settings) {
        // Extract individual settings from legacyData.settings
        // and set them directly on userData
        // This will be handled by databaseService.saveUserData
        // which will update the individual columns
        
        // We'll keep the empty settings object for backward compatibility
        userData.settings = {};
      }
      
      // Save the updated user data
      await this.saveUserData(userId, userData);
      
      return true;
    } catch (err) {
      console.error(`Error migrating legacy data for userId: ${userId}:`, err);
      return false;
    }
  }
  
  // Get user service selection
  async getUserServiceSelection(userId, serviceName) {
    try {
      // Ensure the service is initialized
      if (!this.initialized) {
        
        await this.init();
      }
      
      return databaseService.getUserServiceSelection(userId, serviceName);
    } catch (err) {
      console.error(`Error getting user service selection for userId: ${userId}, service: ${serviceName}:`, err);
      return null;
    }
  }
  
  // Set user service selection
  async setUserServiceSelection(userId, serviceName, selectedUserId) {
    try {
      // Ensure the service is initialized
      if (!this.initialized) {
        
        await this.init();
      }
      
      return databaseService.setUserServiceSelection(userId, serviceName, selectedUserId);
    } catch (err) {
      console.error(`Error setting user service selection for userId: ${userId}, service: ${serviceName}:`, err);
      return false;
    }
  }
}

// Create a singleton instance
const userDataManager = new UserDataManager();

// Export both the instance and the createDefaultUserData function
module.exports = userDataManager;
module.exports.createDefaultUserData = createDefaultUserData;
