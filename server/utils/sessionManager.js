const crypto = require('crypto');
const databaseService = require('./databaseService');

class SessionManager {
  constructor() {
    this.initialized = false;
    // Session expiration time (7 days in milliseconds)
    this.sessionExpiry = 7 * 24 * 60 * 60 * 1000;
  }
  
  // Initialize the session manager
  async init() {
    try {
      console.log('Initializing session manager...');
      
      // Ensure database is initialized
      if (!databaseService.initialized) {
        console.log('Database service not initialized, initializing now...');
        await databaseService.init();
      }
      
      this.initialized = true;
      console.log('Session manager initialized successfully');
    } catch (err) {
      console.error('Error initializing session manager:', err);
      throw err;
    }
  }
  
  // Create a new session for a user
  createSession(user) {
    console.log('Creating new session for user:', user.username);
    
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    console.log('Generated session token:', token.substring(0, 10) + '...');
    
    // Calculate expiry time
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + this.sessionExpiry);
    
    // Create session object
    const session = {
      token,
      userId: user.userId,
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      authProvider: user.authProvider || 'local'
    };
    
    // Store session in database
    databaseService.createSession(session);
    
    console.log('Session created with expiry:', expiresAt);
    
    return token;
  }
  
  // Validate a session token
  validateSession(token) {
    console.log('Validating session token:', token.substring(0, 10) + '...');
    
    // Ensure database is initialized
    if (!databaseService.initialized) {
      console.log('Session manager not initialized, initializing now...');
      this.init();
    }
    
    // Get session from database
    const session = databaseService.getSession(token);
    
    // Check if session exists
    if (!session) {
      console.log('Session not found');
      return null;
    }
    
    console.log('Session found for user:', session.username);
    
    // Check if session is expired
    const expiryDate = new Date(session.expiresAt);
    const now = new Date();
    
    console.log('Session expires at:', expiryDate);
    console.log('Current time:', now);
    
    if (expiryDate < now) {
      console.log('Session has expired');
      // Remove expired session
      databaseService.deleteSession(token);
      return null;
    }
    
    // Refresh session expiry
    const newExpiryDate = new Date(Date.now() + this.sessionExpiry);
    databaseService.updateSessionExpiry(token, newExpiryDate.toISOString());
    console.log('Session expiry extended to:', newExpiryDate);
    
    return session;
  }
  
  // Delete a session
  deleteSession(token) {
    return databaseService.deleteSession(token);
  }
  
  // Clean up expired sessions
  cleanupSessions() {
    return databaseService.cleanupSessions();
  }
  
  // Delete all sessions for a user
  deleteUserSessions(userId) {
    return databaseService.deleteUserSessions(userId);
  }
}

module.exports = new SessionManager();
