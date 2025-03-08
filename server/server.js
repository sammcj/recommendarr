const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dns = require('dns').promises;
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./utils/encryption');
const authService = require('./utils/auth');
const sessionManager = require('./utils/sessionManager');
const proxyService = require('./services/ProxyService');

const app = express();
const PORT = process.env.PORT || 3050;

// Global app configuration
let appConfig = {
  publicUrl: process.env.PUBLIC_URL || '',
  baseUrl: process.env.BASE_URL || '/',
  apiUrl: process.env.VUE_APP_API_URL || ''
};

// Simple logging message for startup
console.log(`API Server starting up in ${process.env.NODE_ENV || 'development'} mode`);

// Create a data directory for storing user credentials
const DATA_DIR = path.join(__dirname, 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
const USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');

// Initialize storage
let credentials = {};
let userData = {
  tvRecommendations: [],
  movieRecommendations: [],
  likedTV: [],
  dislikedTV: [],
  likedMovies: [],
  dislikedMovies: [],
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
    contentTypePreference: 'tv',
    isMovieMode: false,
    tvGenrePreferences: [],
    tvCustomVibe: '',
    tvLanguagePreference: 'en',
    movieGenrePreferences: [],
    movieCustomVibe: '',
    movieLanguagePreference: 'en'
  }
};

// Create data directory if it doesn't exist and load credentials and user data
async function initStorage() {
  try {
    // Initialize encryption service first
    await encryptionService.init();
    
    // Ensure data directory exists
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log(`Created data directory: ${DATA_DIR}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating data directory:', err);
      }
    }

    // Try to load existing credentials
    try {
      const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is already encrypted
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt the data
        credentials = encryptionService.decrypt(fileData);
        console.log('Loaded and decrypted existing credentials');
        
        // App-config feature has been removed - use environment vars only
        console.log('Using environment variables for application configuration');
      } else {
        // Legacy unencrypted data - encrypt it now
        credentials = fileData;
        await saveCredentials();
        console.log('Migrated unencrypted credentials to encrypted format');
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, initialize with empty object
        credentials = {};
        await saveCredentials();
        console.log('Created new encrypted credentials file');
      } else {
        console.error('Error reading credentials file:', err);
      }
    }

    // Try to load existing user data
    try {
      const data = await fs.readFile(USER_DATA_FILE, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is already encrypted
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt the data
        userData = encryptionService.decrypt(fileData);
        console.log('Loaded and decrypted existing user data');
      } else {
        // Legacy unencrypted data - encrypt it now
        userData = fileData;
        await saveUserData();
        console.log('Migrated unencrypted user data to encrypted format');
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, initialize with default values
        await saveUserData();
        console.log('Created new encrypted user data file');
      } else {
        console.error('Error reading user data file:', err);
      }
    }
  } catch (err) {
    console.error('Error initializing data storage:', err);
  }
}

// Save credentials to file with encryption
async function saveCredentials() {
  try {
    // Encrypt the credentials object
    const encryptedData = encryptionService.encrypt(credentials);
    
    // Write encrypted data to file
    await fs.writeFile(CREDENTIALS_FILE, JSON.stringify(encryptedData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving credentials:', err);
  }
}

// Save user data to file with encryption
async function saveUserData() {
  try {
    console.log(`Saving userData (${userData.tvRecommendations.length} TV recommendations, ${userData.movieRecommendations.length} movie recommendations)`);
    
    // Encrypt the user data object
    const encryptedData = encryptionService.encrypt(userData);
    
    // Convert to string with pretty formatting
    const dataToWrite = JSON.stringify(encryptedData, null, 2);
    
    console.log(`Writing ${dataToWrite.length} bytes to ${USER_DATA_FILE}`);
    
    // Force a more direct approach - try to make sure the file is closed and reopened
    try {
      // First try to unlink/delete the file, ignoring errors if it doesn't exist
      try {
        await fs.unlink(USER_DATA_FILE);
        console.log(`Deleted existing ${USER_DATA_FILE}`);
      } catch (unlinkErr) {
        console.log(`No existing file to delete: ${unlinkErr.message}`);
      }
      
      // Write new file
      await fs.writeFile(USER_DATA_FILE, dataToWrite, 'utf8');
      console.log(`Successfully wrote new ${USER_DATA_FILE}`);
    } catch (writeErr) {
      console.error(`Error with direct file write approach: ${writeErr.message}`);
      throw writeErr;
    }
    
    // Wait a moment to ensure the write completes
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the file was written
    try {
      const fileStats = await fs.stat(USER_DATA_FILE);
      console.log(`✓ ${USER_DATA_FILE} exists, size=${fileStats.size} bytes, modified=${fileStats.mtime}`);
      
      // Read the file back to verify content
      const savedContent = await fs.readFile(USER_DATA_FILE, 'utf8');
      console.log(`✓ Read back file, content length: ${savedContent.length} bytes`);
      
      // Verify the content is valid JSON and has proper encryption fields
      const parsedContent = JSON.parse(savedContent);
      if (!parsedContent.encrypted || !parsedContent.iv || !parsedContent.authTag) {
        console.error('❌ FILE ERROR: Saved file does not contain proper encryption fields');
        throw new Error('Saved file is missing encryption fields');
      } else {
        console.log('✓ Verified file contains properly encrypted data');
      }
      
      // Try to decrypt the saved content
      const decryptedData = encryptionService.decrypt(parsedContent);
      
      // Check if decrypted data has the expected properties
      if (!decryptedData.hasOwnProperty('tvRecommendations')) {
        console.error('❌ DECRYPT ERROR: Decrypted data does not have tvRecommendations property');
        throw new Error('Decrypted data missing expected properties');
      }
      
      // Check if the arrays are correct lengths
      console.log(`✓ Decrypted data has ${decryptedData.tvRecommendations.length} TV recommendations`);
      console.log(`✓ Decrypted data has ${decryptedData.movieRecommendations.length} movie recommendations`);
      
      return true;
    } catch (verifyErr) {
      console.error(`❌ Error verifying saved file: ${verifyErr.message}`);
      throw verifyErr;
    }
  } catch (err) {
    console.error('❌ CRITICAL ERROR saving user data:', err);
    throw err; // Rethrow to allow caller to handle the error
  }
}

// Add migration function to move recommendation data from credentials to userData
async function migrateRecommendationsFromCredentials() {
  const recommendationKeys = [
    'movie-recommendations',
    'tv-recommendations', 
    'liked-movies',
    'disliked-movies', 
    'liked-tv',
    'disliked-tv'
  ];
  
  let migrationNeeded = false;
  
  // Check if any recommendation data exists in credentials
  for (const key of recommendationKeys) {
    if (credentials[key] && credentials[key].titles && credentials[key].titles.length > 0) {
      migrationNeeded = true;
      break;
    }
  }
  
  if (migrationNeeded) {
    console.log('Found recommendation data in credentials, migrating to user_data...');
    
    // Migrate movie recommendations
    if (credentials['movie-recommendations'] && credentials['movie-recommendations'].titles) {
      userData.movieRecommendations = [
        ...new Set([...userData.movieRecommendations, ...credentials['movie-recommendations'].titles])
      ];
      console.log(`Migrated ${credentials['movie-recommendations'].titles.length} movie recommendations`);
    }
    
    // Migrate TV recommendations
    if (credentials['tv-recommendations'] && credentials['tv-recommendations'].titles) {
      userData.tvRecommendations = [
        ...new Set([...userData.tvRecommendations, ...credentials['tv-recommendations'].titles])
      ];
      console.log(`Migrated ${credentials['tv-recommendations'].titles.length} TV recommendations`);
    }
    
    // Migrate liked/disliked movies
    if (credentials['liked-movies'] && credentials['liked-movies'].titles) {
      userData.likedMovies = [
        ...new Set([...userData.likedMovies, ...credentials['liked-movies'].titles])
      ];
      console.log(`Migrated ${credentials['liked-movies'].titles.length} liked movies`);
    }
    
    if (credentials['disliked-movies'] && credentials['disliked-movies'].titles) {
      userData.dislikedMovies = [
        ...new Set([...userData.dislikedMovies, ...credentials['disliked-movies'].titles])
      ];
      console.log(`Migrated ${credentials['disliked-movies'].titles.length} disliked movies`);
    }
    
    // Migrate liked/disliked TV shows
    if (credentials['liked-tv'] && credentials['liked-tv'].titles) {
      userData.likedTV = [
        ...new Set([...userData.likedTV, ...credentials['liked-tv'].titles])
      ];
      console.log(`Migrated ${credentials['liked-tv'].titles.length} liked TV shows`);
    }
    
    if (credentials['disliked-tv'] && credentials['disliked-tv'].titles) {
      userData.dislikedTV = [
        ...new Set([...userData.dislikedTV, ...credentials['disliked-tv'].titles])
      ];
      console.log(`Migrated ${credentials['disliked-tv'].titles.length} disliked TV shows`);
    }
    
    // Save the updated user data
    await saveUserData();
    console.log('Migration complete. Recommendations merged into user_data.');
  }
}

// Initialize storage on startup
initStorage().then(async () => {
  // After initializing storage, migrate any recommendation data
  await migrateRecommendationsFromCredentials();
  
  // Initialize auth service
  await authService.init();
  
  // Schedule periodic session cleanup (every hour)
  setInterval(() => {
    sessionManager.cleanupSessions();
  }, 60 * 60 * 1000);
});

// Enable CORS
app.use(cors());

// Parse JSON request body
app.use(express.json());

// Authentication middleware
const authenticateUser = (req, res, next) => {
  console.log(`Authentication check for path: ${req.path}`);
  console.log('Request headers:', req.headers);
  
  // Skip authentication for public endpoints
  const publicEndpoints = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register'
  ];
  
  // Also check if the path ends with these endpoints (for when the /api prefix is already in the path)
  if (publicEndpoints.some(endpoint => req.path === endpoint) || 
      req.path.endsWith('/auth/login') || 
      req.path.endsWith('/auth/register') ||
      req.path.endsWith('/health')) {
    console.log('Skipping auth for public endpoint');
    return next();
  }
  
  // Check for auth token in headers
  console.log('Authorization header:', req.headers.authorization);
  const authToken = req.headers.authorization?.split('Bearer ')[1];
  
  if (!authToken) {
    console.log('No auth token found in request');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  console.log('Auth token found:', authToken.substring(0, 10) + '...');
  
  // Validate the session
  const session = sessionManager.validateSession(authToken);
  
  if (!session) {
    console.log('Session validation failed');
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  console.log('Session validated for user:', session.username);
  
  // Set user info in request object
  req.user = {
    username: session.username,
    isAdmin: session.isAdmin
  };
  
  console.log('Authentication successful, proceeding with request');
  next();
};

// Apply authentication middleware to all API routes
app.use('/api', authenticateUser);

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    config: {
      // Return a safe subset of config - never return sensitive data
      publicUrl: appConfig.publicUrl || '',
    }
  });
});

// Authentication routes
// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log('Login request received');
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Login failed: Missing username or password');
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  console.log(`Login attempt for user: ${username}`);
  
  try {
    // Authenticate user
    console.log('Authenticating user...');
    const authResult = await authService.authenticate(username, password);
    
    if (authResult.success) {
      console.log(`User ${username} authenticated successfully`);
      
      // Create session
      console.log('Creating session...');
      const token = sessionManager.createSession(authResult.user);
      console.log('Session created with token:', token.substring(0, 10) + '...');
      
      // Prepare response
      const response = {
        success: true,
        token,
        user: {
          username: authResult.user.username,
          isAdmin: authResult.user.isAdmin
        }
      };
      
      console.log('Sending successful login response with token and user info');
      res.json(response);
    } else {
      console.log(`Authentication failed for user ${username}: ${authResult.message}`);
      res.status(401).json({ error: authResult.message });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    // Create new user
    const result = await authService.createUser(username, password);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const authToken = req.headers.authorization?.split('Bearer ')[1];
  
  if (authToken) {
    sessionManager.deleteSession(authToken);
  }
  
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user info
app.get('/api/auth/user', async (req, res) => {
  res.json({
    user: req.user
  });
});

// Change password endpoint
app.post('/api/auth/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  
  try {
    // Update password
    const result = await authService.updatePassword(req.user.username, currentPassword, newPassword);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'An error occurred while changing password' });
  }
});

// Admin endpoints
// Get all users (admin only)
app.get('/api/auth/users', async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  try {
    const users = await authService.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'An error occurred while retrieving users' });
  }
});

// Create user (admin only)
app.post('/api/auth/users', async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  const { username, password, isAdmin } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    // Create new user
    const result = await authService.createUser(username, password, isAdmin);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'An error occurred while creating user' });
  }
});

// Delete user (admin only)
app.delete('/api/auth/users/:username', async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  const { username } = req.params;
  
  try {
    // Delete user
    const result = await authService.deleteUser(username);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'An error occurred while deleting user' });
  }
});

// API endpoints for credentials management
// Get all credentials (service IDs only, no secrets)
app.get('/api/credentials', (req, res) => {
  // Return just the service names and their existence, not the actual keys
  const services = {};
  for (const [service, creds] of Object.entries(credentials)) {
    // Skip app-config as it's been removed
    if (service !== 'app-config') {
      services[service] = Object.keys(creds).reduce((acc, key) => {
        // Don't send the actual API keys or sensitive data to the client
        acc[key] = creds[key] ? true : false;
        return acc;
      }, {});
    }
  }
  res.json({ services });
});

// Store credentials for a service
app.post('/api/credentials/:service', async (req, res) => {
  const { service } = req.params;
  const serviceCredentials = req.body;
  
  // Reject attempts to store app-config since the feature is removed
  if (service === 'app-config') {
    return res.status(400).json({ error: 'App configuration via API is not supported' });
  }
  
  // Reject attempts to store recommendation data in credentials
  const recommendationServices = [
    'movie-recommendations', 
    'tv-recommendations', 
    'liked-movies', 
    'disliked-movies', 
    'liked-tv', 
    'disliked-tv'
  ];
  
  if (recommendationServices.includes(service)) {
    console.log(`Rejected attempt to store recommendation data '${service}' in credentials. Use /api/recommendations or /api/preferences instead.`);
    return res.status(400).json({ 
      error: 'Recommendation data should not be stored in credentials', 
      message: 'Please use the appropriate API endpoints for recommendations and preferences' 
    });
  }
  
  if (!serviceCredentials) {
    return res.status(400).json({ error: 'No credentials provided' });
  }
  
  // Initialize the service if it doesn't exist
  if (!credentials[service]) {
    credentials[service] = {};
  }
  
  // Update the credentials
  credentials[service] = {
    ...credentials[service],
    ...serviceCredentials
  };
  
  // Save to file
  await saveCredentials();
  
  // Return success, but don't echo back the credentials
  res.json({ success: true, service });
});

// Retrieve credentials for a service
app.get('/api/credentials/:service', (req, res) => {
  const { service } = req.params;
  
  // Return empty response for app-config as it's been removed
  if (service === 'app-config') {
    return res.json({});
  }
  
  if (!credentials[service]) {
    return res.status(404).json({ error: `No credentials found for ${service}` });
  }
  
  res.json(credentials[service]);
});

// Delete credentials for a service
app.delete('/api/credentials/:service', async (req, res) => {
  const { service } = req.params;
  
  if (!credentials[service]) {
    return res.status(404).json({ error: `No credentials found for ${service}` });
  }
  
  delete credentials[service];
  await saveCredentials();
  
  res.json({ success: true, message: `Credentials for ${service} deleted` });
});

// User data endpoints
// Get all recommendations
app.get('/api/recommendations/:type', async (req, res) => {
  const { type } = req.params;
  
  console.log(`GET /api/recommendations/${type} requested`);
  
  // Force reload from disk to ensure we're using the latest data
  // This is only needed because we're having issues with the reset functionality
  try {
    const reloadUserDataSuccess = await reloadUserDataFromDisk();
    const reloadCredentialsSuccess = await reloadCredentialsFromDisk();
    
    if (reloadUserDataSuccess) {
      console.log(`Reloaded user_data.json from disk`);
    } else {
      console.warn(`Failed to reload user_data.json - using in-memory data`);
    }
    
    if (reloadCredentialsSuccess) {
      console.log(`Reloaded credentials.json from disk`);
    } else {
      console.warn(`Failed to reload credentials.json - using in-memory data`);
    }
  } catch (reloadError) {
    console.error(`Error reloading data: ${reloadError.message}`);
  }
  
  if (type === 'tv') {
    console.log(`Returning ${userData.tvRecommendations ? userData.tvRecommendations.length : 0} TV recommendations`);
    
    // Deep copy to ensure we're not sending a reference to the original
    const recommendations = Array.isArray(userData.tvRecommendations) 
      ? [...userData.tvRecommendations] 
      : [];
      
    res.json(recommendations);
  } else if (type === 'movie') {
    console.log(`Returning ${userData.movieRecommendations ? userData.movieRecommendations.length : 0} movie recommendations`);
    
    // Deep copy to ensure we're not sending a reference to the original
    const recommendations = Array.isArray(userData.movieRecommendations) 
      ? [...userData.movieRecommendations] 
      : [];
      
    res.json(recommendations);
  } else {
    console.log(`Invalid recommendation type: ${type}`);
    res.status(400).json({ error: 'Invalid recommendation type' });
  }
});

// Save recommendations
app.post('/api/recommendations/:type', async (req, res) => {
  const { type } = req.params;
  const recommendations = req.body;
  
  if (!Array.isArray(recommendations)) {
    return res.status(400).json({ error: 'Recommendations must be an array' });
  }
  
  console.log(`Saving ${recommendations.length} ${type} recommendations to server`);
  
  // Normalize recommendations to always be an array of strings (titles)
  // This ensures consistent storage format regardless of what client sends
  const normalizedRecommendations = recommendations.map(rec => {
    if (rec === null || rec === undefined) return '';
    if (typeof rec === 'string') return rec;
    if (typeof rec === 'object' && rec.title) return rec.title;
    return String(rec);
  });
  
  // Filter out empty strings and store only the normalized array
  const filteredRecommendations = normalizedRecommendations.filter(title => title.trim() !== '');
  
  if (type === 'tv') {
    userData.tvRecommendations = filteredRecommendations;
    // Clear any legacy full recommendation objects that might exist
    if (userData.tvRecommendationsDetails) {
      delete userData.tvRecommendationsDetails;
    }
  } else if (type === 'movie') {
    userData.movieRecommendations = filteredRecommendations;
    // Clear any legacy full recommendation objects that might exist
    if (userData.movieRecommendationsDetails) {
      delete userData.movieRecommendationsDetails;
    }
  } else {
    return res.status(400).json({ error: 'Invalid recommendation type' });
  }
  
  await saveUserData();
  res.json({ success: true });
});

// Get liked/disliked items
app.get('/api/preferences/:type/:preference', (req, res) => {
  const { type, preference } = req.params;
  
  if (type === 'tv' && preference === 'liked') {
    res.json(userData.likedTV || []);
  } else if (type === 'tv' && preference === 'disliked') {
    res.json(userData.dislikedTV || []);
  } else if (type === 'movie' && preference === 'liked') {
    res.json(userData.likedMovies || []);
  } else if (type === 'movie' && preference === 'disliked') {
    res.json(userData.dislikedMovies || []);
  } else {
    res.status(400).json({ error: 'Invalid parameters' });
  }
});

// Save liked/disliked items
app.post('/api/preferences/:type/:preference', async (req, res) => {
  const { type, preference } = req.params;
  const items = req.body;
  
  if (type === 'tv' && preference === 'liked') {
    userData.likedTV = items;
  } else if (type === 'tv' && preference === 'disliked') {
    userData.dislikedTV = items;
  } else if (type === 'movie' && preference === 'liked') {
    userData.likedMovies = items;
  } else if (type === 'movie' && preference === 'disliked') {
    userData.dislikedMovies = items;
  } else {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  
  await saveUserData();
  res.json({ success: true });
});

// Get settings
app.get('/api/settings', (req, res) => {
  res.json(userData.settings || {});
});

// Save settings
app.post('/api/settings', async (req, res) => {
  userData.settings = {...userData.settings, ...req.body};
  await saveUserData();
  res.json({ success: true });
});

// Get watch history
app.get('/api/watch-history/:type', (req, res) => {
  const { type } = req.params;
  
  // Initialize watchHistory if it doesn't exist
  if (!userData.watchHistory) {
    userData.watchHistory = { movies: [], shows: [] };
  }
  
  if (type === 'movies') {
    res.json(userData.watchHistory.movies || []);
  } else if (type === 'shows') {
    res.json(userData.watchHistory.shows || []);
  } else {
    res.status(400).json({ error: 'Invalid watch history type. Use "movies" or "shows".' });
  }
});

// Save watch history
app.post('/api/watch-history/:type', async (req, res) => {
  const { type } = req.params;
  const items = req.body;
  
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Watch history must be an array' });
  }
  
  console.log(`Saving ${items.length} ${type} watch history items to server`);
  
  // Initialize watchHistory if it doesn't exist
  if (!userData.watchHistory) {
    userData.watchHistory = { movies: [], shows: [] };
  }
  
  if (type === 'movies') {
    userData.watchHistory.movies = items;
  } else if (type === 'shows') {
    userData.watchHistory.shows = items;
  } else {
    return res.status(400).json({ error: 'Invalid watch history type. Use "movies" or "shows".' });
  }
  
  await saveUserData();
  res.json({ success: true });
});

// Force reload userData from disk
async function reloadUserDataFromDisk() {
  console.log('⚠️ Force reloading userData from disk');
  try {
    // First check if the file exists
    const fileExists = await fs.access(USER_DATA_FILE).then(() => true).catch(() => false);
    
    if (!fileExists) {
      console.log(`File ${USER_DATA_FILE} doesn't exist, nothing to reload`);
      return false;
    }
    
    // Read the file
    const data = await fs.readFile(USER_DATA_FILE, 'utf8');
    
    // Parse the file content
    let fileData;
    try {
      fileData = JSON.parse(data);
    } catch (parseError) {
      console.error(`Error parsing ${USER_DATA_FILE} as JSON:`, parseError);
      return false;
    }
    
    // Check if the data is properly encrypted
    if (!fileData.encrypted || !fileData.iv || !fileData.authTag) {
      console.error(`File ${USER_DATA_FILE} is not properly encrypted`);
      return false;
    }
    
    // Decrypt the data
    try {
      const decryptedData = encryptionService.decrypt(fileData);
      userData = decryptedData;
      console.log(`✓ Reloaded user data from disk: ${userData.tvRecommendations.length} TV recommendations, ${userData.movieRecommendations.length} movie recommendations`);
      return true;
    } catch (decryptError) {
      console.error(`Error decrypting ${USER_DATA_FILE}:`, decryptError);
      return false;
    }
  } catch (err) {
    console.error('❌ Error reloading user data from disk:', err);
    return false;
  }
}

// Force reload credentials from disk
async function reloadCredentialsFromDisk() {
  console.log('⚠️ Force reloading credentials from disk');
  try {
    // First check if the file exists
    const fileExists = await fs.access(CREDENTIALS_FILE).then(() => true).catch(() => false);
    
    if (!fileExists) {
      console.log(`File ${CREDENTIALS_FILE} doesn't exist, nothing to reload`);
      credentials = {}; // Reset to empty object
      return true;
    }
    
    // Read the file
    const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
    
    // Parse the file content
    let fileData;
    try {
      fileData = JSON.parse(data);
    } catch (parseError) {
      console.error(`Error parsing ${CREDENTIALS_FILE} as JSON:`, parseError);
      return false;
    }
    
    // Check if the data is properly encrypted
    if (!fileData.encrypted || !fileData.iv || !fileData.authTag) {
      console.error(`File ${CREDENTIALS_FILE} is not properly encrypted`);
      return false;
    }
    
    // Decrypt the data
    try {
      const decryptedData = encryptionService.decrypt(fileData);
      credentials = decryptedData;
      const numServices = Object.keys(credentials).length;
      console.log(`✓ Reloaded credentials from disk: ${numServices} services`);
      return true;
    } catch (decryptError) {
      console.error(`Error decrypting ${CREDENTIALS_FILE}:`, decryptError);
      return false;
    }
  } catch (err) {
    console.error('❌ Error reloading credentials from disk:', err);
    return false;
  }
}

// Reset all user data (recommendations, preferences, etc.) AND credentials
app.post('/api/reset', async (req, res) => {
  console.log('🔄 RESET ENDPOINT CALLED - Clearing ALL DATA (both user_data.json and credentials.json)');
  
  try {
    // PART 1: CLEAR USER_DATA.JSON
    console.log('PHASE 1: Clearing user_data.json...');
    
    // First try direct file deletion to ensure we're not dealing with any caching issues
    try {
      await fs.unlink(USER_DATA_FILE);
      console.log(`✓ Directly deleted ${USER_DATA_FILE}`);
      // Wait a moment for the filesystem
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (unlinkError) {
      console.log(`Could not delete user_data.json directly: ${unlinkError.message}`);
    }
    
    // Backup the current user data just in case
    try {
      const currentData = await fs.readFile(USER_DATA_FILE, 'utf8');
      const backupPath = `${USER_DATA_FILE}.backup-${Date.now()}`;
      await fs.writeFile(backupPath, currentData, 'utf8');
      console.log(`Current user_data.json backed up to ${backupPath}`);
    } catch (backupError) {
      // Only log the error, don't stop the reset process
      console.log('No existing user_data.json to back up or backup failed:', backupError.message);
    }
    
    // Reset user data to default values with empty arrays
    userData = {
      tvRecommendations: [],
      movieRecommendations: [],
      likedTV: [],
      dislikedTV: [],
      likedMovies: [],
      dislikedMovies: [],
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
        contentTypePreference: 'tv',
        isMovieMode: false,
        tvGenrePreferences: [],
        tvCustomVibe: '',
        tvLanguagePreference: 'en',
        movieGenrePreferences: [],
        movieCustomVibe: '',
        movieLanguagePreference: 'en'
      }
    };
    
    // Save the reset user data to the file
    console.log('Saving empty userData to user_data.json');
    const saveUserDataSuccess = await saveUserData();
    if (!saveUserDataSuccess) {
      throw new Error('saveUserData returned false - file may not have been written');
    }
    
    // Verification for user data
    try {
      const savedData = await fs.readFile(USER_DATA_FILE, 'utf8');
      console.log(`✓ user_data.json exists and is ${savedData.length} bytes`);
      
      const fileData = JSON.parse(savedData);
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt to verify contents are empty
        const decryptedData = encryptionService.decrypt(fileData);
        if (decryptedData.tvRecommendations.length === 0 && decryptedData.movieRecommendations.length === 0) {
          console.log('✓ Verified user_data.json has empty recommendation arrays');
        } else {
          console.error(`❌ user_data.json still has data after reset! TV: ${decryptedData.tvRecommendations.length}, Movie: ${decryptedData.movieRecommendations.length}`);
        }
      }
    } catch (verifyError) {
      console.error('❌ Error verifying user_data.json:', verifyError);
    }
    
    // PART 2: RESET CREDENTIALS.JSON
    console.log('PHASE 2: Clearing credentials.json...');
    
    // First try direct file deletion to ensure we're not dealing with any caching issues
    try {
      await fs.unlink(CREDENTIALS_FILE);
      console.log(`✓ Directly deleted ${CREDENTIALS_FILE}`);
      // Wait a moment for the filesystem
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (unlinkError) {
      console.log(`Could not delete credentials.json directly: ${unlinkError.message}`);
    }
    
    // Backup the current credentials just in case
    try {
      const currentCredentials = await fs.readFile(CREDENTIALS_FILE, 'utf8');
      const backupPath = `${CREDENTIALS_FILE}.backup-${Date.now()}`;
      await fs.writeFile(backupPath, currentCredentials, 'utf8');
      console.log(`Current credentials.json backed up to ${backupPath}`);
    } catch (backupError) {
      // Only log the error, don't stop the reset process
      console.log('No existing credentials.json to back up or backup failed:', backupError.message);
    }
    
    // Reset credentials to an empty object
    credentials = {};
    
    // Save the reset credentials to the file
    console.log('Saving empty credentials to credentials.json');
    await saveCredentials();
    
    // Verification for credentials
    try {
      const savedCredentials = await fs.readFile(CREDENTIALS_FILE, 'utf8');
      console.log(`✓ credentials.json exists and is ${savedCredentials.length} bytes`);
      
      const fileData = JSON.parse(savedCredentials);
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt to verify contents are empty
        const decryptedCredentials = encryptionService.decrypt(fileData);
        const numServices = Object.keys(decryptedCredentials).length;
        console.log(`✓ Verified credentials.json has ${numServices} services after reset`);
      }
    } catch (verifyError) {
      console.error('❌ Error verifying credentials.json:', verifyError);
    }
    
    // PART 3: FINAL VERIFICATION
    console.log('PHASE 3: Final verification...');
    
    // Force reload both files from disk
    await reloadUserDataFromDisk();
    await reloadCredentialsFromDisk();
    
    // Check that userData is empty
    if (userData.tvRecommendations.length === 0 && userData.movieRecommendations.length === 0) {
      console.log('✓ Final verification: userData is properly reset in memory');
    } else {
      console.error('❌ Final verification failed: userData still has data in memory!');
      console.log('Forcing userData reset in memory');
      userData.tvRecommendations = [];
      userData.movieRecommendations = [];
      userData.likedTV = [];
      userData.dislikedTV = [];
      userData.likedMovies = [];
      userData.dislikedMovies = [];
      await saveUserData();
    }
    
    // Verify credentials is empty
    const credsCount = Object.keys(credentials).length;
    console.log(`✓ Final verification: credentials has ${credsCount} services in memory`);
    
    console.log('✅ COMPLETE RESET SUCCESSFUL - Both user_data.json and credentials.json have been cleared');
    res.json({ 
      success: true, 
      message: 'All data reset successfully',
      details: {
        userData: {
          tvCount: userData.tvRecommendations.length,
          movieCount: userData.movieRecommendations.length
        },
        credentials: {
          serviceCount: Object.keys(credentials).length
        }
      }
    });
  } catch (error) {
    console.error('❌ ERROR DURING COMPLETE RESET:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset data', 
      details: error.message 
    });
  }
});

// Generic proxy endpoint for all services
// Endpoint to help diagnose network connectivity issues
app.get('/api/net-test', async (req, res) => {
  const target = req.query.target;
  
  if (!target) {
    return res.status(400).json({ error: 'Target IP or hostname required' });
  }
  
  const results = {
    target,
    checks: {}
  };
  
  try {
    // Try to ping via DNS lookup
    const dnsStartTime = Date.now();
    try {
      const dnsResult = await dns.lookup(target);
      results.checks.dns = {
        success: true,
        ip: dnsResult.address,
        time: Date.now() - dnsStartTime
      };
    } catch (error) {
      results.checks.dns = {
        success: false,
        error: error.message
      };
    }
    
    // Try HTTP connection if port specified
    const port = req.query.port;
    if (port) {
      const httpTarget = `http://${target}:${port}`;
      try {
        const httpStartTime = Date.now();
        const response = await axios.get(httpTarget, { timeout: 30000 });
        results.checks.http = {
          success: true,
          status: response.status,
          time: Date.now() - httpStartTime
        };
      } catch (error) {
        results.checks.http = {
          success: false,
          error: error.message,
          code: error.code
        };
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/proxy', async (req, res) => {
  const { url, method = 'GET', data = null, params = null, headers = {} } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  console.log(`Proxy request to: ${url} (${method})`);
  
  // Debug headers for OpenAI requests
  if (url.includes('openai.com')) {
    const sanitizedHeaders = {...headers};
    // Mask the API key for security but show format
    if (sanitizedHeaders.Authorization) {
      const authHeader = sanitizedHeaders.Authorization;
      sanitizedHeaders.Authorization = authHeader.substring(0, 15) + '...';
      console.log('OpenAI request headers:', JSON.stringify(sanitizedHeaders));
    } else {
      console.warn('OpenAI request missing Authorization header');
    }
  }

  // Process URL to handle local network services
  let processedUrl = url;
  
  // In Docker environment, we need to handle local network references 
  if (process.env.DOCKER_ENV === 'true') {
    console.log(`Docker environment detected, processing URL: ${url}`);
    
    try {
      // Parse the URL to extract hostname properly
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      
      // Only modify localhost/127.0.0.1 URLs
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        processedUrl = url.replace(/(localhost|127\.0\.0\.1)/, 'host.docker.internal');
        console.log(`Converted localhost URL to Docker-friendly format: ${processedUrl}`);
      } 
      // Handle references to the same host as the server
      else if (hostname === req.hostname) {
        // Extract the port if present
        const port = parsedUrl.port;
        
        if (port) {
          // If it's a different port on the same host, access via host.docker.internal
          processedUrl = url.replace(req.hostname, 'host.docker.internal');
          console.log(`Converted same-host URL to Docker-friendly format: ${processedUrl}`);
        }
      }
      // For all external URLs (including API providers)
      else {
        console.log(`External API call detected, using original URL: ${url}`);
        processedUrl = url;
      }
    } catch (error) {
      console.error(`Error parsing URL ${url}:`, error.message);
      // If URL parsing fails, use the original URL
      processedUrl = url;
    }
  }
  
  try {
    // Add request timeout to prevent hanging connections
    const response = await axios({
      url: processedUrl,
      method,
      data,
      params,
      headers,
      // Removed timeout to allow model generation time
      validateStatus: function (status) {
        // Accept all status codes to handle them in our response
        return true;
      }
    });
    
    console.log(`Proxy response from: ${processedUrl}, status: ${response.status}`);
    
    // Log detailed information for OpenAI API errors
    if (processedUrl.includes('openai.com') && response.status >= 400) {
      console.error('OpenAI API error response:', JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: {
          ...response.headers,
          // Redact any sensitive headers
          authorization: response.headers.authorization ? '[REDACTED]' : undefined
        }
      }));
    }
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Provide more detailed error information
    const errorDetails = {
      error: error.message,
      code: error.code,
      data: error.response?.data || null
    };
    
    // Handle network connectivity errors with more helpful messages
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
      const isLocalNetworkIP = /https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)\d+\.\d+/.test(url);
      
      let message = 'Could not connect to the service.';
      
      if (isLocalhost) {
        message += ' The server cannot access your localhost address. Please ensure the Sonarr/Radarr service is running on your host machine.';
      } else if (isLocalNetworkIP) {
        message += ` Could not connect to ${url}. Please verify:
         1. The service is running on that IP
         2. The port is correct and open
         3. Any firewalls allow the connection
         4. The server has network access to that IP`;
      }
      
      console.error(`Connection error (${error.code}): ${message} Attempted URL: ${processedUrl}`);
      return res.status(502).json({
        ...errorDetails,
        message
      });
    }
    
    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ETIME') {
      console.error(`Timeout error: Request to ${processedUrl} timed out`);
      return res.status(504).json({
        ...errorDetails,
        message: 'The request timed out. This may happen if the service is not accessible from the server.'
      });
    }
    
    res.status(error.response?.status || 500).json(errorDetails);
  }
});

// Image proxy endpoint (make sure this exactly matches the client request path)
app.get('/api/image-proxy', async (req, res) => {
  console.log('Image proxy request received:', req.query.url);
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }
  
  console.log(`Proxying image request for: ${imageUrl}`);
  
  try {
    // Process URL to handle local network services in Docker
    let processedUrl = imageUrl;
    
    // In Docker environment, handle localhost references
    if (process.env.DOCKER_ENV === 'true') {
      try {
        const parsedUrl = new URL(imageUrl);
        if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
          processedUrl = imageUrl.replace(/(localhost|127\.0\.0\.1)/, 'host.docker.internal');
          console.log(`Converted localhost URL to Docker-friendly format: ${processedUrl}`);
        }
      } catch (error) {
        console.error(`Error parsing image URL ${imageUrl}:`, error.message);
      }
    }
    
    // Fetch the image
    const response = await axios({
      url: processedUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      }
    });
    
    // If error, return 404
    if (response.status >= 400) {
      console.error(`Error fetching image: ${response.status}`);
      return res.status(404).send('Image not found');
    }
    
    // Set content type and send image
    const contentType = response.headers['content-type'];
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(response.data);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(500).send('Error fetching image');
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});