const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dns = require('dns').promises;
const fs = require('fs').promises;
const path = require('path');
const expressSession = require('express-session');
const encryptionService = require('./utils/encryption');
const authService = require('./utils/auth');
const sessionManager = require('./utils/sessionManager');
const userDataManager = require('./utils/userDataManager');
const proxyService = require('./services/ProxyService');
const { setupPassport } = require('./utils/oauth');

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3050;

// Path to the frontend dist directory
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Global app configuration
let appConfig = {
  publicUrl: process.env.PUBLIC_URL || '',
  baseUrl: process.env.BASE_URL || '/',
  apiUrl: process.env.VUE_APP_API_URL || ''
};

// Simple logging message for startup
console.log(`API Server starting up in ${process.env.NODE_ENV || 'development'} mode`);

// Create a data directory for storing credentials
const DATA_DIR = path.join(__dirname, 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
const LEGACY_USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');

// Initialize storage
let credentials = {};
let legacyUserData = {
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

    // Try to load existing legacy user data
    try {
      const data = await fs.readFile(LEGACY_USER_DATA_FILE, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is already encrypted
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt the data
        legacyUserData = encryptionService.decrypt(fileData);
        console.log('Loaded and decrypted existing legacy user data');
      } else {
        // Legacy unencrypted data - encrypt it now
        legacyUserData = fileData;
        await saveLegacyUserData();
        console.log('Migrated unencrypted legacy user data to encrypted format');
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, initialize with default values
        await saveLegacyUserData();
        console.log('Created new encrypted legacy user data file');
      } else {
        console.error('Error reading legacy user data file:', err);
      }
    }
    
    // Initialize the new user data manager
    await userDataManager.init();
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

// Save legacy user data to file with encryption
async function saveLegacyUserData() {
  try {
    // Make sure userData is valid before saving
    if (!legacyUserData || typeof legacyUserData !== 'object') {
      throw new Error('Invalid userData object');
    }
    
    // Ensure required properties exist
    if (!Array.isArray(legacyUserData.tvRecommendations)) legacyUserData.tvRecommendations = [];
    if (!Array.isArray(legacyUserData.movieRecommendations)) legacyUserData.movieRecommendations = [];
    if (!Array.isArray(legacyUserData.likedTV)) legacyUserData.likedTV = [];
    if (!Array.isArray(legacyUserData.dislikedTV)) legacyUserData.dislikedTV = [];
    if (!Array.isArray(legacyUserData.hiddenTV)) legacyUserData.hiddenTV = [];
    if (!Array.isArray(legacyUserData.likedMovies)) legacyUserData.likedMovies = [];
    if (!Array.isArray(legacyUserData.dislikedMovies)) legacyUserData.dislikedMovies = [];
    if (!Array.isArray(legacyUserData.hiddenMovies)) legacyUserData.hiddenMovies = [];
    if (!legacyUserData.watchHistory) legacyUserData.watchHistory = { movies: [], shows: [] };
    if (!legacyUserData.settings) legacyUserData.settings = {};
    
    // Ensure historyHideHidden setting exists
    if (legacyUserData.settings.historyHideHidden === undefined) legacyUserData.settings.historyHideHidden = true;
    
    console.log(`Saving legacy userData (${legacyUserData.tvRecommendations.length} TV recommendations, ${legacyUserData.movieRecommendations.length} movie recommendations)`);
    
    // Encrypt the user data object
    const encryptedData = encryptionService.encrypt(legacyUserData);
    
    // Convert to string with pretty formatting
    const dataToWrite = JSON.stringify(encryptedData, null, 2);
    
    if (!dataToWrite || dataToWrite.length < 10) {
      throw new Error('Generated data is too small, possible encryption error');
    }
    
    console.log(`Writing ${dataToWrite.length} bytes to ${LEGACY_USER_DATA_FILE}`);
    
    // Simple direct file write approach
    try {
      // Write directly to the file - no deleting, no temp files
      await fs.writeFile(LEGACY_USER_DATA_FILE, dataToWrite, 'utf8');
      console.log(`Successfully wrote to ${LEGACY_USER_DATA_FILE}`);
    } catch (writeErr) {
      console.error(`Error writing to ${LEGACY_USER_DATA_FILE}: ${writeErr.message}`);
      throw writeErr;
    }
    
    // Wait a moment to ensure the write completes
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple verification - just check if the file exists and has content
    try {
      const fileStats = await fs.stat(LEGACY_USER_DATA_FILE);
      console.log(`✓ ${LEGACY_USER_DATA_FILE} exists, size=${fileStats.size} bytes, modified=${fileStats.mtime}`);
      return true;
    } catch (verifyErr) {
      console.error(`❌ Error verifying saved file: ${verifyErr.message}`);
      return false; // Return false instead of throwing to allow operation to continue
    }
  } catch (err) {
    console.error('❌ ERROR saving legacy user data:', err);
    return false; // Return false instead of throwing to allow operation to continue
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
    console.log('Found recommendation data in credentials, migrating to legacy user_data...');
    
    // Migrate movie recommendations
    if (credentials['movie-recommendations'] && credentials['movie-recommendations'].titles) {
      legacyUserData.movieRecommendations = [
        ...new Set([...legacyUserData.movieRecommendations, ...credentials['movie-recommendations'].titles])
      ];
      console.log(`Migrated ${credentials['movie-recommendations'].titles.length} movie recommendations`);
    }
    
    // Migrate TV recommendations
    if (credentials['tv-recommendations'] && credentials['tv-recommendations'].titles) {
      legacyUserData.tvRecommendations = [
        ...new Set([...legacyUserData.tvRecommendations, ...credentials['tv-recommendations'].titles])
      ];
      console.log(`Migrated ${credentials['tv-recommendations'].titles.length} TV recommendations`);
    }
    
    // Migrate liked/disliked movies
    if (credentials['liked-movies'] && credentials['liked-movies'].titles) {
      legacyUserData.likedMovies = [
        ...new Set([...legacyUserData.likedMovies, ...credentials['liked-movies'].titles])
      ];
      console.log(`Migrated ${credentials['liked-movies'].titles.length} liked movies`);
    }
    
    if (credentials['disliked-movies'] && credentials['disliked-movies'].titles) {
      legacyUserData.dislikedMovies = [
        ...new Set([...legacyUserData.dislikedMovies, ...credentials['disliked-movies'].titles])
      ];
      console.log(`Migrated ${credentials['disliked-movies'].titles.length} disliked movies`);
    }
    
    // Migrate liked/disliked TV shows
    if (credentials['liked-tv'] && credentials['liked-tv'].titles) {
      legacyUserData.likedTV = [
        ...new Set([...legacyUserData.likedTV, ...credentials['liked-tv'].titles])
      ];
      console.log(`Migrated ${credentials['liked-tv'].titles.length} liked TV shows`);
    }
    
    if (credentials['disliked-tv'] && credentials['disliked-tv'].titles) {
      legacyUserData.dislikedTV = [
        ...new Set([...legacyUserData.dislikedTV, ...credentials['disliked-tv'].titles])
      ];
      console.log(`Migrated ${credentials['disliked-tv'].titles.length} disliked TV shows`);
    }
    
    // Save the updated user data
    await saveLegacyUserData();
    console.log('Migration complete. Recommendations merged into legacy user_data.');
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

// Enable CORS with credentials
app.use(cors({
  origin: true, // Allow request origin
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'User-Agent']
}));

// Add cookie parser middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Add session middleware for OAuth
app.use(expressSession({
  secret: process.env.SESSION_SECRET || Math.random().toString(36).substring(2, 15),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Set up OAuth
const { passport, getEnabledProviders } = setupPassport(app);

// Parse JSON request body
app.use(express.json());

// Verify session endpoint
app.get('/api/auth/verify', async (req, res) => {
  // Check for auth token in cookies
  const authToken = req.cookies.auth_token;
  
  if (!authToken) {
    return res.status(401).json({ error: 'No session token found' });
  }

  // Validate the session
  const session = sessionManager.validateSession(authToken);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Get user data
  try {
    const user = await authService.getUserById(session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json({ 
      user: {
        id: user.userId,
        username: user.username,
        isAdmin: user.isAdmin,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    return res.status(500).json({ error: 'Error verifying session' });
  }
});

// Authentication middleware
const authenticateUser = (req, res, next) => {
  console.log(`Authentication check for path: ${req.path}`);
  console.log('Request headers:', req.headers);
  
  // Skip authentication for public endpoints
  const publicEndpoints = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/providers',
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/github',
    '/api/auth/github/callback'
  ];
  
  // Also check if the path ends with these endpoints (for when the /api prefix is already in the path)
  if (publicEndpoints.some(endpoint => req.path === endpoint) || 
      req.path.endsWith('/auth/login') || 
      req.path.endsWith('/auth/register') ||
      req.path.endsWith('/auth/providers') ||
      req.path.endsWith('/health') ||
      req.path.includes('/auth/google') ||
      req.path.includes('/auth/github')) {
    console.log('Skipping auth for public endpoint');
    return next();
  }
  
  // Check for auth token in cookies first (preferred), then fall back to headers
  console.log('Authorization header:', req.headers.authorization);
  console.log('Cookies:', req.cookies);
  
  // Get token from cookie or header
  const cookieToken = req.cookies.auth_token;
  const headerToken = req.headers.authorization?.split('Bearer ')[1];
  const authToken = cookieToken || headerToken;
  
  if (!authToken) {
    console.log('No auth token found in request (checked both cookies and headers)');
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
    userId: session.userId,
    username: session.username,
    isAdmin: session.isAdmin,
    authProvider: session.authProvider || 'local'
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

// Get enabled authentication providers
app.get('/api/auth/providers', (req, res) => {
  const providers = getEnabledProviders();
  
  res.json({
    providers,
    localAuth: true
  });
});

// OAuth routes
// Google OAuth routes
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=auth-failed' }),
  (req, res) => {
    // Create session after successful OAuth login
    if (!req.user) {
      return res.redirect('/login?error=auth-failed');
    }
    
    // Create session
    const token = sessionManager.createSession(req.user);
    
    // Set auth cookie
    const isSecureConnection = req.secure || 
                               req.headers['x-forwarded-proto'] === 'https' || 
                               process.env.FORCE_SECURE_COOKIES === 'true';
    
    res.cookie('auth_token', token, {
      httpOnly: true,          // Prevents JavaScript access
      secure: isSecureConnection, // Only set secure flag on HTTPS connections
      sameSite: 'lax',         // Provides some CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'                // Available across the site
    });
    
    // If we have legacy user data, migrate it to the user's account
    if (legacyUserData && Object.keys(legacyUserData).length > 0) {
      userDataManager.migrateLegacyData(legacyUserData, req.user.userId)
        .then(() => {
          console.log(`Migrated legacy data to user: ${req.user.username}`);
        })
        .catch(err => {
          console.error(`Error migrating legacy data: ${err.message}`);
        });
    }
    
    // Redirect to home page after successful authentication
    res.redirect('/');
  }
);

// GitHub OAuth routes
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/api/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login?error=auth-failed' }),
  (req, res) => {
    // Create session after successful OAuth login
    if (!req.user) {
      return res.redirect('/login?error=auth-failed');
    }
    
    // Create session
    const token = sessionManager.createSession(req.user);
    
    // Set auth cookie
    const isSecureConnection = req.secure || 
                               req.headers['x-forwarded-proto'] === 'https' || 
                               process.env.FORCE_SECURE_COOKIES === 'true';
    
    res.cookie('auth_token', token, {
      httpOnly: true,          // Prevents JavaScript access
      secure: isSecureConnection, // Only set secure flag on HTTPS connections
      sameSite: 'lax',         // Provides some CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'                // Available across the site
    });
    
    // If we have legacy user data, migrate it to the user's account
    if (legacyUserData && Object.keys(legacyUserData).length > 0) {
      userDataManager.migrateLegacyData(legacyUserData, req.user.userId)
        .then(() => {
          console.log(`Migrated legacy data to user: ${req.user.username}`);
        })
        .catch(err => {
          console.error(`Error migrating legacy data: ${err.message}`);
        });
    }
    
    // Redirect to home page after successful authentication
    res.redirect('/');
  }
);

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
    // First clear any existing auth cookie to prevent issues with stale session
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0)
    });
    console.log('Cleared any existing auth cookie');
    
    // Authenticate user
    console.log('Authenticating user...');
    const authResult = await authService.authenticate(username, password);
    
    if (authResult.success) {
      console.log(`User ${username} authenticated successfully`);
      
      // Create session
      console.log('Creating session...');
      const token = sessionManager.createSession(authResult.user);
      console.log('Session created with token:', token.substring(0, 10) + '...');
      
      // Determine if we should use secure cookies based on the request's protocol or a config flag
      const isSecureConnection = req.secure || 
                               req.headers['x-forwarded-proto'] === 'https' || 
                               process.env.FORCE_SECURE_COOKIES === 'true';
      
      console.log(`Setting cookie with secure=${isSecureConnection} based on connection protocol`);
      
      // Set token in an HttpOnly cookie
      res.cookie('auth_token', token, {
        httpOnly: true,          // Prevents JavaScript access
        secure: isSecureConnection, // Only set secure flag on HTTPS connections
        sameSite: 'lax',         // Provides some CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'                // Available across the site
      });
      
      // If we have legacy user data, migrate it to the user's account
      if (legacyUserData && Object.keys(legacyUserData).length > 0) {
        try {
          await userDataManager.migrateLegacyData(legacyUserData, authResult.user.userId);
          console.log(`Migrated legacy data to user: ${username}`);
        } catch (err) {
          console.error(`Error migrating legacy data: ${err.message}`);
        }
      }
      
      // Prepare response (token now sent via cookie, not in response body)
      const response = {
        success: true,
        user: {
          userId: authResult.user.userId,
          username: authResult.user.username,
          isAdmin: authResult.user.isAdmin,
          authProvider: authResult.user.authProvider || 'local'
        }
      };
      
      console.log('Sending successful login response with user info (token set in HttpOnly cookie)');
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
  // Get auth token from cookie or headers
  const cookieToken = req.cookies.auth_token;
  const headerToken = req.headers.authorization?.split('Bearer ')[1];
  const authToken = cookieToken || headerToken;
  
  if (authToken) {
    sessionManager.deleteSession(authToken);
  }
  
  // Determine if we should use secure cookies based on the request's protocol or a config flag
  const isSecureConnection = req.secure || 
                           req.headers['x-forwarded-proto'] === 'https' || 
                           process.env.FORCE_SECURE_COOKIES === 'true';
  
  // Clear the auth cookie - ensure correct path and domain settings
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: isSecureConnection, // Only set secure flag on HTTPS connections
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Immediately expire the cookie
    expires: new Date(0) // Set expiration date in the past
  });
  
  console.log('Auth cookie cleared during logout');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Verify session endpoint (used after OAuth redirect)
app.get('/api/auth/verify', async (req, res) => {
  // Get auth token from cookie
  const authToken = req.cookies.auth_token;
  
  if (!authToken) {
    return res.status(401).json({ error: 'No session token found' });
  }

  // Validate the session
  const session = sessionManager.validateSession(authToken);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  res.json({
    user: {
      userId: session.userId,
      username: session.username,
      isAdmin: session.isAdmin,
      authProvider: session.authProvider || 'local'
    }
  });
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
    const result = await authService.updatePassword(req.user.userId, currentPassword, newPassword);
    
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

// Update user profile endpoint
app.post('/api/auth/profile', async (req, res) => {
  try {
    // Only allow updating the current user's profile, unless admin
    const userId = req.user.userId;
    
    // Filter updates to only allow changing certain fields
    const updates = {};
    if (req.body.email) updates.email = req.body.email;
    if (req.body.profile) updates.profile = req.body.profile;
    
    // Check if user is admin for admin-only updates
    if (req.user.isAdmin && req.body.isAdmin !== undefined) {
      updates.isAdmin = !!req.body.isAdmin;
    }
    
    const result = await authService.updateUserProfile(userId, updates);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'An error occurred while updating profile' });
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
      res.json({ success: true, message: result.message, user: result.user });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'An error occurred while creating user' });
  }
});

// Update user (admin only)
app.put('/api/auth/users/:userId', async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  const { userId } = req.params;
  
  try {
    // Filter updates to only allow changing certain fields
    const updates = {};
    if (req.body.email) updates.email = req.body.email;
    if (req.body.isAdmin !== undefined) updates.isAdmin = !!req.body.isAdmin;
    if (req.body.profile) updates.profile = req.body.profile;
    
    const result = await authService.updateUserProfile(userId, updates);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'An error occurred while updating user' });
  }
});

// Delete user (admin only)
app.delete('/api/auth/users/:userId', async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  const { userId } = req.params;
  
  // Don't allow deleting your own account
  if (userId === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  try {
    // Delete user
    const result = await authService.deleteUser(userId);
    
    if (result.success) {
      // Also delete user's data
      await userDataManager.deleteUserData(userId);
      
      // Delete user's sessions
      const deletedSessions = sessionManager.deleteUserSessions(userId);
      console.log(`Deleted ${deletedSessions} sessions for userId: ${userId}`);
      
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
  // Only admin users can update global credentials
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
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
  
  // For non-admin users, only allow access to shared services (all except trakt)
  // Trakt should be user-specific, while other services are shared among all users
  if (!req.user.isAdmin && service === 'trakt') {
    return res.status(403).json({ error: 'Admin privileges required for Trakt credentials' });
  }
  
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
  // Only admin users can delete global credentials
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  const { service } = req.params;
  
  if (!credentials[service]) {
    return res.status(404).json({ error: `No credentials found for ${service}` });
  }
  
  delete credentials[service];
  await saveCredentials();
  
  res.json({ success: true, message: `Credentials for ${service} deleted` });
});

// Service user selection endpoints
app.post('/api/user-services/:serviceName/selected-user', async (req, res) => {
  const { serviceName } = req.params;
  const { userId } = req.user;
  const selectedUserId = req.body.userId;

  try {
    await userDataManager.setUserServiceSelection(userId, serviceName, selectedUserId);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error saving ${serviceName} user selection:`, error);
    res.status(500).json({ error: 'Failed to save user selection' });
  }
});

app.get('/api/user-services/:serviceName/selected-user', async (req, res) => {
  const { serviceName } = req.params;
  const { userId } = req.user;

  try {
    const selectedUserId = await userDataManager.getUserServiceSelection(userId, serviceName);
    res.json({ userId: selectedUserId });
  } catch (error) {
    console.error(`Error getting ${serviceName} user selection:`, error);
    res.status(500).json({ error: 'Failed to get user selection' });
  }
});

// User data endpoints
// Get all recommendations
// Add a special endpoint for read-only recommendations
app.get('/api/recommendations-readonly/:type', async (req, res) => {
  const { type } = req.params;
  const userId = req.user.userId;
  
  console.log(`GET /api/recommendations-readonly/${type} requested by userId: ${userId} (safe read-only mode)`);
  
  // Load user data
  const userData = await userDataManager.getUserData(userId);
  
  // Return the recommendations without any side effects
  if (type === 'tv') {
    console.log(`Returning ${userData.tvRecommendations ? userData.tvRecommendations.length : 0} TV recommendations (readonly)`);
    
    // Deep copy to ensure we're not sending a reference to the original
    const recommendations = Array.isArray(userData.tvRecommendations) 
      ? [...userData.tvRecommendations] 
      : [];
      
    res.json(recommendations);
  } else if (type === 'movie') {
    console.log(`Returning ${userData.movieRecommendations ? userData.movieRecommendations.length : 0} movie recommendations (readonly)`);
    
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

// Regular endpoint
app.get('/api/recommendations/:type', async (req, res) => {
  const { type } = req.params;
  const userId = req.user.userId;
  
  console.log(`GET /api/recommendations/${type} requested by userId: ${userId}`);
  
  // Load user data
  const userData = await userDataManager.getUserData(userId);
  
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
  const userId = req.user.userId;
  
  if (!Array.isArray(recommendations)) {
    return res.status(400).json({ error: 'Recommendations must be an array' });
  }
  
  console.log(`Saving ${recommendations.length} ${type} recommendations for userId: ${userId}`);
  
  // Normalize recommendations to always be an array of strings (titles)
  // This ensures consistent storage format regardless of what client sends
  const normalizedRecommendations = recommendations.map(rec => {
    if (rec === null || rec === undefined) return '';
    if (typeof rec === 'string') return rec;
    if (typeof rec === 'object' && rec.title) return rec.title;
    return String(rec);
  });
  
  // Filter out empty strings and store only the normalized array
  const filteredRecommendations = normalizedRecommendations
    .filter(title => title !== null && title !== undefined && title.trim && typeof title.trim === 'function' && title.trim() !== '')
    .map(item => String(item)); // Ensure everything is a string
  
  try {
    // Load current user data
    const userData = await userDataManager.getUserData(userId);
    
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
    
    // Save the updated user data
    const saveResult = await userDataManager.saveUserData(userId, userData);
    
    if (saveResult) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save user data' });
    }
  } catch (error) {
    console.error(`Unexpected error handling recommendations: ${error.message}`);
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message });
  }
});

// Get liked/disliked/hidden items
app.get('/api/preferences/:type/:preference', async (req, res) => {
  const { type, preference } = req.params;
  const userId = req.user.userId;
  
  // Load user data
  const userData = await userDataManager.getUserData(userId);
  
  if (type === 'tv' && preference === 'liked') {
    res.json(userData.likedTV || []);
  } else if (type === 'tv' && preference === 'disliked') {
    res.json(userData.dislikedTV || []);
  } else if (type === 'tv' && preference === 'hidden') {
    res.json(userData.hiddenTV || []);
  } else if (type === 'movie' && preference === 'liked') {
    res.json(userData.likedMovies || []);
  } else if (type === 'movie' && preference === 'disliked') {
    res.json(userData.dislikedMovies || []);
  } else if (type === 'movie' && preference === 'hidden') {
    res.json(userData.hiddenMovies || []);
  } else {
    res.status(400).json({ error: 'Invalid parameters' });
  }
});

// Save liked/disliked/hidden items
app.post('/api/preferences/:type/:preference', async (req, res) => {
  const { type, preference } = req.params;
  const items = req.body;
  const userId = req.user.userId;
  
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Preferences must be an array' });
  }
  
  // Load user data
  const userData = await userDataManager.getUserData(userId);
  
  if (type === 'tv' && preference === 'liked') {
    userData.likedTV = items;
  } else if (type === 'tv' && preference === 'disliked') {
    userData.dislikedTV = items;
  } else if (type === 'tv' && preference === 'hidden') {
    userData.hiddenTV = items;
  } else if (type === 'movie' && preference === 'liked') {
    userData.likedMovies = items;
  } else if (type === 'movie' && preference === 'disliked') {
    userData.dislikedMovies = items;
  } else if (type === 'movie' && preference === 'hidden') {
    userData.hiddenMovies = items;
  } else {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  
  // Save the updated user data
  await userDataManager.saveUserData(userId, userData);
  res.json({ success: true });
});

// Get settings
app.get('/api/settings', async (req, res) => {
  const userId = req.user.userId;
  
  // Load user data
  const userData = await userDataManager.getUserData(userId);
  
  res.json(userData.settings || {});
});

// Save settings
app.post('/api/settings', async (req, res) => {
  const userId = req.user.userId;
  
  // Load user data
  const userData = await userDataManager.getUserData(userId);
  
  userData.settings = {...userData.settings, ...req.body};
  
  // Save the updated user data
  await userDataManager.saveUserData(userId, userData);
  res.json({ success: true });
});

// Get watch history
app.get('/api/watch-history/:type', async (req, res) => {
  const { type } = req.params;
  const userId = req.user.userId;
  
  // Load user data
  const userData = await userDataManager.getUserData(userId);
  
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
  const userId = req.user.userId;
  
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Watch history must be an array' });
  }
  
  console.log(`Saving ${items.length} ${type} watch history items for userId: ${userId}`);
  
  // Load user data
  const userData = await userDataManager.getUserData(userId);
  
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
  
  // Save the updated user data
  await userDataManager.saveUserData(userId, userData);
  res.json({ success: true });
});

// Reset all user data (recommendations, preferences, etc.) - User specific
app.post('/api/reset', async (req, res) => {
  const userId = req.user.userId;
  console.log(`🔄 RESET ENDPOINT CALLED - Clearing user data for userId: ${userId}`);
  
  try {
    // Reset user data to default values
    const defaultUserData = {
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
    };
    
    // Save the reset user data
    const saveResult = await userDataManager.saveUserData(userId, defaultUserData);
    
    if (saveResult) {
      console.log(`✅ Reset successful for userId: ${userId}`);
      res.json({ 
        success: true, 
        message: 'User data reset successfully' 
      });
    } else {
      console.error(`❌ Failed to save reset data for userId: ${userId}`);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to reset user data'
      });
    }
  } catch (error) {
    console.error('❌ ERROR DURING USER RESET:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset user data', 
      details: error.message 
    });
  }
});

// Clear all data - Admin only
app.post('/api/admin/reset-all', async (req, res) => {
  // Only admin users can reset all data
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  console.log('🔄 ADMIN RESET ALL ENDPOINT CALLED - Clearing ALL DATA');
  
  try {
    // Reset credentials
    credentials = {};
    await saveCredentials();
    
    // Reset legacy user data
    legacyUserData = {
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
    };
    await saveLegacyUserData();
    
    // Get all users
    const users = await authService.getAllUsers();
    
    // Reset user data for all users
    for (const user of users) {
      await userDataManager.deleteUserData(user.userId);
    }
    
    console.log('✅ COMPLETE ADMIN RESET SUCCESSFUL');
    res.json({ 
      success: true, 
      message: 'All data reset successfully'
    });
  } catch (error) {
    console.error('❌ ERROR DURING COMPLETE ADMIN RESET:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset all data', 
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
    // Ensure proper headers are set for LMStudio API requests
    if (processedUrl.includes('/v1/models')) {
      console.log('Adding headers for LMStudio models API request');
      
      // Set Accept header to tell server what response format we want
      headers['Accept'] = 'application/json';
      
      // Ensure user-agent is set
      if (!headers['User-Agent']) {
        headers['User-Agent'] = 'Mozilla/5.0 (compatible; Reccommendarr/1.0)';
      }
      
      console.log('Final headers for LMStudio request:', JSON.stringify(headers));
    }
    
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
    
    // Log detailed information for API errors (OpenAI or LLM-related endpoints)
    if ((processedUrl.includes('openai.com') || processedUrl.includes('/v1/models')) && response.status >= 400) {
      console.error('API error response:', JSON.stringify({
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

// Serve static files from the dist directory
// This needs to come after all API routes
const serveStatic = express.static(DIST_DIR, {
  maxAge: '1d',  // Cache static assets for 1 day
  etag: true     // Enable ETag header
});

// Serve static files
app.use(serveStatic);

// For any other requests, serve index.html (for SPA routing)
app.get('*', (req, res) => {
  // Skip API routes - they've already been handled above
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Serve the main index.html for all other routes (for SPA client-side routing)
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Unified server running on port ${PORT}`);
  console.log(`- API available at http://localhost:${PORT}/api`);
  console.log(`- Frontend available at http://localhost:${PORT}`);
});
