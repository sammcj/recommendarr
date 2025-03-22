// User data manager module
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./encryption');

// Data storage location - use the same data directory as server.js uses
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
    this.userDataCache = new Map(); // In-memory cache of user data
  }
  
  // Initialize the user data directory
  async init() {
    try {
      console.log('Initializing user data manager...');
      
      // Ensure user data directory exists
      try {
        console.log(`Ensuring user data directory exists: ${USER_DATA_DIR}`);
        await fs.mkdir(USER_DATA_DIR, { recursive: true });
        console.log('User data directory ready');
      } catch (dirErr) {
        if (dirErr.code !== 'EEXIST') {
          console.error('Error creating user data directory:', dirErr);
          throw dirErr;
        }
      }
      
      console.log('User data manager initialized successfully');
    } catch (err) {
      console.error('Error initializing user data manager:', err);
      throw err;
    }
  }
  
  // Get the file path for a user's data
  getUserDataPath(userId) {
    return path.join(USER_DATA_DIR, `${userId}.json`);
  }
  
  // Load user data for a specific user
  async getUserData(userId) {
    // Return from cache if available
    if (this.userDataCache.has(userId)) {
      return this.userDataCache.get(userId);
    }
    
    const userDataPath = this.getUserDataPath(userId);
    try {
      console.log(`Loading user data for userId: ${userId}`);
      
      // Attempt to read the user data file
      const data = await fs.readFile(userDataPath, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is encrypted
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        console.log('Decrypting user data...');
        const userData = encryptionService.decrypt(fileData);
        
        // Cache the data
        this.userDataCache.set(userId, userData);
        return userData;
      } else {
        // Legacy unencrypted data - encrypt it now
        console.log('Found unencrypted user data, migrating to encrypted format...');
        const userData = fileData;
        await this.saveUserData(userId, userData);
        return userData;
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, create default user data
        console.log(`No user data found for userId: ${userId}, creating default data`);
        const defaultData = createDefaultUserData();
        
        // Save and return the default data
        await this.saveUserData(userId, defaultData);
        return defaultData;
      } else {
        console.error(`Error reading user data for userId: ${userId}:`, err);
        // Return default data in case of error
        const defaultData = createDefaultUserData();
        return defaultData;
      }
    }
  }
  
  // Save user data for a specific user
  async saveUserData(userId, userData) {
    const userDataPath = this.getUserDataPath(userId);
    
    try {
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
      
      // Update cache
      this.userDataCache.set(userId, userData);
      
      // Encrypt the user data
      console.log('Encrypting user data...');
      const encryptedData = encryptionService.encrypt(userData);
      
      // Write to file
      await fs.writeFile(userDataPath, JSON.stringify(encryptedData, null, 2), 'utf8');
      
      console.log(`User data saved successfully for userId: ${userId}`);
      return true;
    } catch (err) {
      console.error(`Error saving user data for userId: ${userId}:`, err);
      return false;
    }
  }
  
  // Delete user data
  async deleteUserData(userId) {
    const userDataPath = this.getUserDataPath(userId);
    
    try {
      console.log(`Deleting user data for userId: ${userId}`);
      
      // Remove from cache
      this.userDataCache.delete(userId);
      
      // Check if file exists
      try {
        await fs.access(userDataPath);
      } catch (err) {
        // File doesn't exist, nothing to delete
        console.log(`No user data file found for userId: ${userId}`);
        return true;
      }
      
      // Delete the file
      await fs.unlink(userDataPath);
      console.log(`User data deleted successfully for userId: ${userId}`);
      return true;
    } catch (err) {
      console.error(`Error deleting user data for userId: ${userId}:`, err);
      return false;
    }
  }
  
  // Migrate legacy data to per-user data
  async migrateLegacyData(legacyData, userId) {
    try {
      console.log(`Migrating legacy data to user: ${userId}`);
      
      // Load the user's current data (or create default)
      const userData = await this.getUserData(userId);
      
      // Transfer recommendations and preferences
      if (legacyData.tvRecommendations && legacyData.tvRecommendations.length > 0) {
        userData.tvRecommendations = [
          ...new Set([...userData.tvRecommendations, ...legacyData.tvRecommendations])
        ];
      }
      
      if (legacyData.movieRecommendations && legacyData.movieRecommendations.length > 0) {
        userData.movieRecommendations = [
          ...new Set([...userData.movieRecommendations, ...legacyData.movieRecommendations])
        ];
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
  
  // Clear cache for a specific user
  clearCache(userId) {
    if (userId) {
      this.userDataCache.delete(userId);
    } else {
      this.userDataCache.clear();
    }
  }
}

module.exports = new UserDataManager();