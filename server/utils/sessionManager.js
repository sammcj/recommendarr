const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.sessions = {};
    // Session expiration time (7 days in milliseconds)
    this.sessionExpiry = 7 * 24 * 60 * 60 * 1000;
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
    
    // Store session data
    this.sessions[token] = {
      userId: user.userId,
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      authProvider: user.authProvider || 'local'
    };
    
    console.log('Session created with expiry:', expiresAt);
    console.log('Current active sessions:', Object.keys(this.sessions).length);
    
    return token;
  }
  
  // Validate a session token
  validateSession(token) {
    console.log('Validating session token:', token.substring(0, 10) + '...');
    console.log('Current sessions:', Object.keys(this.sessions).map(t => t.substring(0, 10) + '...'));
    
    const session = this.sessions[token];
    
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
      delete this.sessions[token];
      return null;
    }
    
    // Refresh session expiry
    session.expiresAt = new Date(Date.now() + this.sessionExpiry).toISOString();
    console.log('Session expiry extended to:', session.expiresAt);
    
    return session;
  }
  
  // Delete a session
  deleteSession(token) {
    delete this.sessions[token];
  }
  
  // Clean up expired sessions
  cleanupSessions() {
    const now = new Date();
    
    Object.keys(this.sessions).forEach(token => {
      const expiryDate = new Date(this.sessions[token].expiresAt);
      if (expiryDate < now) {
        delete this.sessions[token];
      }
    });
  }
  
  // Get all sessions for a specific user
  getUserSessions(userId) {
    const userSessions = {};
    
    Object.entries(this.sessions).forEach(([token, session]) => {
      if (session.userId === userId) {
        userSessions[token] = session;
      }
    });
    
    return userSessions;
  }
  
  // Delete all sessions for a user
  deleteUserSessions(userId) {
    let deletedCount = 0;
    
    Object.entries(this.sessions).forEach(([token, session]) => {
      if (session.userId === userId) {
        delete this.sessions[token];
        deletedCount++;
      }
    });
    
    return deletedCount;
  }
}

module.exports = new SessionManager();