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
      
      
      // Ensure database is initialized
      if (!databaseService.initialized) {
        
        await databaseService.init();
      }
      
      this.initialized = true;
      
    } catch (err) {
      console.error('Error initializing session manager:', err);
      throw err;
    }
  }
  
  // Create a new session for a user
  createSession(user) {
    
    
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    
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
    
    
    
    return token;
  }
  
  // Validate a session token
  validateSession(token) {
    if (!token) {
      
      return null;
    }
    
    
    
    try {
      // Ensure database is initialized
      if (!databaseService.initialized) {
        
        this.init();
      }
      
      // Get session from database
      const session = databaseService.getSession(token);
      
      // Check if session exists
      if (!session) {
        
        return null;
      }
      
      
      
      // Check if session is expired
      const expiryDate = new Date(session.expiresAt);
      const now = new Date();
      
      
      
      
      if (expiryDate < now) {
        
        // Remove expired session
        databaseService.deleteSession(token);
        return null;
      }
      
      // Also verify user exists in database (to catch deleted users)
      const userExists = databaseService.getUserById(session.userId);
      if (!userExists) {
        
        databaseService.deleteSession(token);
        return null;
      }
      
      // Refresh session expiry
      const newExpiryDate = new Date(Date.now() + this.sessionExpiry);
      databaseService.updateSessionExpiry(token, newExpiryDate.toISOString());
      
      
      return session;
    } catch (error) {
      console.error('Error validating session:', error);
      return null; // Return null on any error to be safe
    }
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
