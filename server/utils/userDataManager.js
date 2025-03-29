// User data manager module
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./encryption');
const databaseService = require('./databaseService');

// Data storage location - used only for migration
const DATA_DIR = path.join(__dirname, '..', 'data');
const USER_DATA_DIR = path.join(DATA_DIR, 'user_data');

// Default user data template
const createDefaultUserData = () => ({
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
  settings: {
    numRecommendations: 6,
    columnsCount: 3,
    historyColumnsCount: 3,
    historyHideExisting: true,
    historyHideLiked: false,
    historyHideDisliked: false,
    historyHideHidden: true,
    contentTypePreference: 'tv',
    isMovieMode: false,
    tvGenrePreferences: [],
    tvCustomVibe: '',
    tvLanguagePreference: 'en',
    movieGenrePreferences: [],
    movieCustomVibe: '',
    movieLanguagePreference: 'en'
  }
});

class UserDataManager {
  constructor() {
    this.initialized = false;
  }
  
  // Initialize the user data manager
  async init() {
    try {
      console.log('Initializing user data manager...');
      
      // Ensure database is initialized
      if (!databaseService.initialized) {
        console.log('Database service not initialized, initializing now...');
        await databaseService.init();
      }
      
      this.initialized = true;
      console.log('User data manager initialized successfully');
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
        console.log('User data manager not initialized, initializing now...');
        await this.init();
      }
      
      console.log(`Loading user data for userId: ${userId}`);
      
      // Get user data from database
      const userData = databaseService.getUserData(userId);
      
      // If no user data found, return default data
      if (!userData) {
        console.log(`No user data found for userId: ${userId}, creating default data`);
        const defaultData = createDefaultUserData();
        
        // Save and return the default data
        await this.saveUserData(userId, defaultData);
        return defaultData;
      }
      
      return userData;
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
        console.log('User data manager not initialized, initializing now...');
        await this.init();
      }
      
      console.log(`Saving user data for userId: ${userId}`);
      
      // Make sure userData is valid before saving
      if (!userData || typeof userData !== 'object') {
        throw new Error('Invalid userData object');
      }
      
      // Ensure required properties exist
      if (!Array.isArray(userData.tvRecommendations)) userData.tvRecommendations = [];
      if (!Array.isArray(userData.movieRecommendations)) userData.movieRecommendations = [];
      if (!Array.isArray(userData.likedTV)) userData.likedTV = [];
      if (!Array.isArray(userData.dislikedTV)) userData.dislikedTV = [];
      if (!Array.isArray(userData.hiddenTV)) userData.hiddenTV = [];
      if (!Array.isArray(userData.likedMovies)) userData.likedMovies = [];
      if (!Array.isArray(userData.dislikedMovies)) userData.dislikedMovies = [];
      if (!Array.isArray(userData.hiddenMovies)) userData.hiddenMovies = [];
      if (!userData.watchHistory) userData.watchHistory = { movies: [], shows: [] };
      if (!userData.settings) userData.settings = {};
      
      // Ensure settings has default values
      const defaultData = createDefaultUserData();
      userData.settings = { ...defaultData.settings, ...userData.settings };
      
      // Save to database
      const success = databaseService.saveUserData(userId, userData);
      
      console.log(`User data saved successfully for userId: ${userId}`);
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
        console.log('User data manager not initialized, initializing now...');
        await this.init();
      }
      
      console.log(`Deleting user data for userId: ${userId}`);
      
      // Delete from database
      const success = databaseService.deleteUserData(userId);
      
      console.log(`User data deleted successfully for userId: ${userId}`);
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
        console.log('User data manager not initialized, initializing now...');
        await this.init();
      }
      
      console.log(`Migrating legacy data to user: ${userId}`);
      
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
      
      // Transfer settings (but keep user-specific settings if they exist)
      if (legacyData.settings) {
        userData.settings = {
          ...legacyData.settings,
          ...userData.settings
        };
      }
      
      // Save the updated user data
      await this.saveUserData(userId, userData);
      console.log(`Legacy data migration complete for userId: ${userId}`);
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
        console.log('User data manager not initialized, initializing now...');
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
        console.log('User data manager not initialized, initializing now...');
        await this.init();
      }
      
      return databaseService.setUserServiceSelection(userId, serviceName, selectedUserId);
    } catch (err) {
      console.error(`Error setting user service selection for userId: ${userId}, service: ${serviceName}:`, err);
      return false;
    }
  }
}

module.exports = new UserDataManager();
