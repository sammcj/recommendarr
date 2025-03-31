const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dns = require('dns').promises;
const fs = require('fs').promises;
const path = require('path');
const expressSession = require('express-session');
const encryptionService = require('./utils/encryption');
const databaseService = require('./utils/databaseService');
const authService = require('./utils/auth');
const sessionManager = require('./utils/sessionManager');
const userDataManager = require('./utils/userDataManager');
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

// Data directory path for reference
const DATA_DIR = path.join(__dirname, 'data');

// Initialize storage and services
async function initStorage() {
  try {
    console.log('Initializing storage and services...');
    
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
    
    // Initialize database service
    await databaseService.init();
    
    // Migrate data from JSON files to database
    await databaseService.migrateData();
    
    // Migrate settings from JSON to individual columns
    try {
      const migrateSettingsToColumns = require('./utils/migrateSettingsToColumns');
      const result = await migrateSettingsToColumns();
      console.log('Settings migration result:', result);
    } catch (err) {
      console.error('Error migrating settings to columns:', err);
    }
    
    // Initialize other services
    await authService.init();
    await userDataManager.init();
    await sessionManager.init();
    
    // Schedule periodic session cleanup (every hour)
    setInterval(() => {
      sessionManager.cleanupSessions();
    }, 60 * 60 * 1000);
    
    console.log('Storage and services initialized successfully');
  } catch (err) {
    console.error('Error initializing storage and services:', err);
  }
}

// Initialize storage on startup
initStorage();

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

// Parse JSON request body with increased size limit
app.use(express.json({ limit: '100mb' }));
// Increase URL-encoded payload size limit as well
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
    '/api/auth/github/callback',
    '/api/auth/custom',
    '/api/auth/custom/callback'
  ];
  
  // Also check if the path ends with these endpoints (for when the /api prefix is already in the path)
  if (publicEndpoints.some(endpoint => req.path === endpoint) || 
      req.path.endsWith('/auth/login') || 
      req.path.endsWith('/auth/register') ||
      req.path.endsWith('/auth/providers') ||
      req.path.endsWith('/health') ||
      req.path.includes('/auth/google') ||
      req.path.includes('/auth/github') ||
      req.path.includes('/auth/custom')) {
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
    
    // Check for legacy user data file and migrate if it exists
    const LEGACY_USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');
    fs.access(LEGACY_USER_DATA_FILE)
      .then(async () => {
        try {
          // Read and decrypt legacy user data
          const data = await fs.readFile(LEGACY_USER_DATA_FILE, 'utf8');
          const fileData = JSON.parse(data);
          
          let legacyUserData = {};
          if (fileData.encrypted && fileData.iv && fileData.authTag) {
            // Decrypt the data
            legacyUserData = encryptionService.decrypt(fileData);
          } else {
            // Legacy unencrypted data
            legacyUserData = fileData;
          }
          
          // Migrate to user account
          await userDataManager.migrateLegacyData(legacyUserData, req.user.userId);
          console.log(`Migrated legacy data to user: ${req.user.username}`);
        } catch (err) {
          console.error(`Error migrating legacy data: ${err.message}`);
        }
      })
      .catch(() => {
        // Legacy file doesn't exist, nothing to migrate
      });
    
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
    
    // Check for legacy user data file and migrate if it exists
    const LEGACY_USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');
    fs.access(LEGACY_USER_DATA_FILE)
      .then(async () => {
        try {
          // Read and decrypt legacy user data
          const data = await fs.readFile(LEGACY_USER_DATA_FILE, 'utf8');
          const fileData = JSON.parse(data);
          
          let legacyUserData = {};
          if (fileData.encrypted && fileData.iv && fileData.authTag) {
            // Decrypt the data
            legacyUserData = encryptionService.decrypt(fileData);
          } else {
            // Legacy unencrypted data
            legacyUserData = fileData;
          }
          
          // Migrate to user account
          await userDataManager.migrateLegacyData(legacyUserData, req.user.userId);
          console.log(`Migrated legacy data to user: ${req.user.username}`);
        } catch (err) {
          console.error(`Error migrating legacy data: ${err.message}`);
        }
      })
      .catch(() => {
        // Legacy file doesn't exist, nothing to migrate
      });
    
    // Redirect to home page after successful authentication
    res.redirect('/');
  }
);

// Custom OAuth routes
app.get('/api/auth/custom', (req, res, next) => {
  // Get scope from environment variable or use default
  const scopeString = process.env.CUSTOM_OAUTH_SCOPE || 'openid profile email';
  const scope = scopeString.split(' ');
  
  passport.authenticate('custom', { scope: scope })(req, res, next);
});

app.get('/api/auth/custom/callback', 
  passport.authenticate('custom', { failureRedirect: '/login?error=auth-failed' }),
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
    
    // Check for legacy user data file and migrate if it exists
    const LEGACY_USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');
    fs.access(LEGACY_USER_DATA_FILE)
      .then(async () => {
        try {
          // Read and decrypt legacy user data
          const data = await fs.readFile(LEGACY_USER_DATA_FILE, 'utf8');
          const fileData = JSON.parse(data);
          
          let legacyUserData = {};
          if (fileData.encrypted && fileData.iv && fileData.authTag) {
            // Decrypt the data
            legacyUserData = encryptionService.decrypt(fileData);
          } else {
            // Legacy unencrypted data
            legacyUserData = fileData;
          }
          
          // Migrate to user account
          await userDataManager.migrateLegacyData(legacyUserData, req.user.userId);
          console.log(`Migrated legacy data to user: ${req.user.username}`);
        } catch (err) {
          console.error(`Error migrating legacy data: ${err.message}`);
        }
      })
      .catch(() => {
        // Legacy file doesn't exist, nothing to migrate
      });
    
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
      
      // Check for legacy user data file and migrate if it exists
      const LEGACY_USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');
      try {
        await fs.access(LEGACY_USER_DATA_FILE);
        
        // Read and decrypt legacy user data
        const data = await fs.readFile(LEGACY_USER_DATA_FILE, 'utf8');
        const fileData = JSON.parse(data);
        
        let legacyUserData = {};
        if (fileData.encrypted && fileData.iv && fileData.authTag) {
          // Decrypt the data
          legacyUserData = encryptionService.decrypt(fileData);
        } else {
          // Legacy unencrypted data
          legacyUserData = fileData;
        }
        
        // Migrate to user account
        await userDataManager.migrateLegacyData(legacyUserData, authResult.user.userId);
        console.log(`Migrated legacy data to user: ${username}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
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
  // Get credentials from database
  const credentials = databaseService.getAllCredentials();
  
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
  
  // Handle Trakt credentials differently - they should be user-specific
  if (service === 'trakt') {
    // Store user-specific Trakt credentials
    console.log(`Storing user-specific Trakt credentials for userId: ${req.user.userId}`);
    databaseService.saveUserCredentials(req.user.userId, service, serviceCredentials);
    return res.json({ success: true, service });
  }
  
  // For all other services, only admin users can update global credentials
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  // Get existing credentials
  const existingCredentials = databaseService.getCredentials(service) || {};
  
  // Update the credentials
  const updatedCredentials = {
    ...existingCredentials,
    ...serviceCredentials
  };
  
  // Save to database
  databaseService.saveCredentials(service, updatedCredentials);
  
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
  
  // Handle Trakt credentials differently - they should be user-specific
  if (service === 'trakt') {
    // For non-admin users, get user-specific Trakt credentials
    if (!req.user.isAdmin) {
      const userCredentials = databaseService.getUserCredentials(req.user.userId, service);
      
      if (!userCredentials) {
        return res.status(404).json({ error: `No credentials found for ${service}` });
      }
      
      return res.json(userCredentials);
    }
    
    // For admin users, check user-specific credentials first, then fall back to global
    const userCredentials = databaseService.getUserCredentials(req.user.userId, service);
    
    if (userCredentials) {
      return res.json(userCredentials);
    }
  }
  
  // For all other services, use global credentials
  const serviceCredentials = databaseService.getCredentials(service);
  
  if (!serviceCredentials) {
    return res.status(404).json({ error: `No credentials found for ${service}` });
  }
  
  res.json(serviceCredentials);
});

// Delete credentials for a service
app.delete('/api/credentials/:service', async (req, res) => {
  const { service } = req.params;
  
  // Handle Trakt credentials differently - they should be user-specific
  if (service === 'trakt') {
    // Delete user-specific Trakt credentials
    console.log(`Deleting user-specific Trakt credentials for userId: ${req.user.userId}`);
    const success = databaseService.deleteUserCredentials(req.user.userId, service);
    
    if (!success) {
      return res.status(404).json({ error: `No credentials found for ${service}` });
    }
    
    return res.json({ success: true, message: `Credentials for ${service} deleted` });
  }
  
  // For all other services, only admin users can delete global credentials
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  const success = databaseService.deleteCredentials(service);
  
  if (!success) {
    return res.status(404).json({ error: `No credentials found for ${service}` });
  }
  
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
  const { username } = req.query;
  
  // Use the authenticated user's ID by default, or look up the user ID by username if provided
  let userId = req.user.userId;
  
  // If a username is provided and it's not the current user, check if the user exists
  if (username && username !== req.user.username) {
    try {
      const user = await authService.getUserByUsername(username);
      if (user) {
        userId = user.userId;
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error(`Error looking up user by username: ${username}`, error);
      return res.status(500).json({ error: 'Error looking up user' });
    }
  }
  
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
  const { username } = req.query;
  const items = req.body;
  
  // Use the authenticated user's ID by default, or look up the user ID by username if provided
  let userId = req.user.userId;
  
  // If a username is provided and it's not the current user, check if the user exists
  if (username && username !== req.user.username) {
    try {
      const user = await authService.getUserByUsername(username);
      if (user) {
        userId = user.userId;
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error(`Error looking up user by username: ${username}`, error);
      return res.status(500).json({ error: 'Error looking up user' });
    }
  }
  
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

// Sonarr and Radarr library endpoints
// Get Sonarr library
app.get('/api/sonarr/library', async (req, res) => {
  const userId = req.user.userId;
  
  try {
    // Get library from database
    const library = await databaseService.getSonarrLibrary(userId);
    
    if (library) {
      res.json(library);
    } else {
      res.status(404).json({ error: 'No Sonarr library found' });
    }
  } catch (error) {
    console.error('Error getting Sonarr library:', error);
    res.status(500).json({ error: 'Error getting Sonarr library' });
  }
});

// Save Sonarr library
app.post('/api/sonarr/library', async (req, res) => {
  const userId = req.user.userId;
  const library = req.body;
  
  if (!Array.isArray(library)) {
    return res.status(400).json({ error: 'Library must be an array' });
  }
  
  try {
    // Save library to database
    const success = await databaseService.saveSonarrLibrary(userId, library);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Error saving Sonarr library' });
    }
  } catch (error) {
    console.error('Error saving Sonarr library:', error);
    res.status(500).json({ error: 'Error saving Sonarr library' });
  }
});

// Refresh Sonarr library for all users
app.post('/api/sonarr/library/refresh-all', async (req, res) => {
  // Only admin users can refresh library for all users
  if (!req.user.isAdmin) {
    // For non-admin users, we'll still allow the operation but log it
    console.log(`Non-admin user ${req.user.username} (${req.user.userId}) is refreshing Sonarr library for all users`);
  }
  
  const library = req.body;
  
  if (!Array.isArray(library)) {
    return res.status(400).json({ error: 'Library must be an array' });
  }
  
  try {
    // Get all users
    const users = await authService.getAllUsers();
    
    // Save library for each user
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        const success = await databaseService.saveSonarrLibrary(user.userId, library);
        if (success) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to save Sonarr library for user: ${user.username} (${user.userId})`);
        }
      } catch (userError) {
        errorCount++;
        console.error(`Error saving Sonarr library for user: ${user.username} (${user.userId})`, userError);
      }
    }
    
    console.log(`Sonarr library refreshed for all users: ${successCount} successful, ${errorCount} failed`);
    
    if (errorCount === 0) {
      res.json({ success: true, message: `Library updated for all ${successCount} users` });
    } else {
      res.status(207).json({ 
        partialSuccess: true, 
        message: `Library updated for ${successCount} users, failed for ${errorCount} users` 
      });
    }
  } catch (error) {
    console.error('Error refreshing Sonarr library for all users:', error);
    res.status(500).json({ error: 'Error refreshing Sonarr library for all users' });
  }
});

// Get Radarr library
app.get('/api/radarr/library', async (req, res) => {
  const userId = req.user.userId;
  
  try {
    // Get library from database
    const library = await databaseService.getRadarrLibrary(userId);
    
    if (library) {
      res.json(library);
    } else {
      res.status(404).json({ error: 'No Radarr library found' });
    }
  } catch (error) {
    console.error('Error getting Radarr library:', error);
    res.status(500).json({ error: 'Error getting Radarr library' });
  }
});

// Save Radarr library
app.post('/api/radarr/library', async (req, res) => {
  const userId = req.user.userId;
  const library = req.body;
  
  if (!Array.isArray(library)) {
    return res.status(400).json({ error: 'Library must be an array' });
  }
  
  try {
    // Save library to database
    const success = await databaseService.saveRadarrLibrary(userId, library);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Error saving Radarr library' });
    }
  } catch (error) {
    console.error('Error saving Radarr library:', error);
    res.status(500).json({ error: 'Error saving Radarr library' });
  }
});

// Refresh Radarr library for all users
app.post('/api/radarr/library/refresh-all', async (req, res) => {
  // Only admin users can refresh library for all users
  if (!req.user.isAdmin) {
    // For non-admin users, we'll still allow the operation but log it
    console.log(`Non-admin user ${req.user.username} (${req.user.userId}) is refreshing Radarr library for all users`);
  }
  
  const library = req.body;
  
  if (!Array.isArray(library)) {
    return res.status(400).json({ error: 'Library must be an array' });
  }
  
  try {
    // Get all users
    const users = await authService.getAllUsers();
    
    // Save library for each user
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        const success = await databaseService.saveRadarrLibrary(user.userId, library);
        if (success) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to save Radarr library for user: ${user.username} (${user.userId})`);
        }
      } catch (userError) {
        errorCount++;
        console.error(`Error saving Radarr library for user: ${user.username} (${user.userId})`, userError);
      }
    }
    
    console.log(`Radarr library refreshed for all users: ${successCount} successful, ${errorCount} failed`);
    
    if (errorCount === 0) {
      res.json({ success: true, message: `Library updated for all ${successCount} users` });
    } else {
      res.status(207).json({ 
        partialSuccess: true, 
        message: `Library updated for ${successCount} users, failed for ${errorCount} users` 
      });
    }
  } catch (error) {
    console.error('Error refreshing Radarr library for all users:', error);
    res.status(500).json({ error: 'Error refreshing Radarr library for all users' });
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
    // Get all users
    const users = await authService.getAllUsers();
    
    // Delete all credentials
    const credentials = databaseService.getAllCredentials();
    for (const service of Object.keys(credentials)) {
      databaseService.deleteCredentials(service);
    }
    
    // Delete all user data
    for (const user of users) {
      await userDataManager.deleteUserData(user.userId);
    }
    
    // Delete all sessions
    for (const user of users) {
      sessionManager.deleteUserSessions(user.userId);
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
      validateStatus: function () {
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
