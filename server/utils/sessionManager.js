const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.sessions = {};
    // Session expiration time (24 hours in milliseconds)
    this.sessionExpiry = 24 * 60 * 60 * 1000;
  }
  
  // Create a new session for a user
  createSession(user) {
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store session data
    this.sessions[token] = {
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.sessionExpiry).toISOString()
    };
    
    return token;
  }
  
  // Validate a session token
  validateSession(token) {
    const session = this.sessions[token];
    
    // Check if session exists
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    const expiryDate = new Date(session.expiresAt);
    if (expiryDate < new Date()) {
      // Remove expired session
      delete this.sessions[token];
      return null;
    }
    
    // Refresh session expiry
    session.expiresAt = new Date(Date.now() + this.sessionExpiry).toISOString();
    
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
}

module.exports = new SessionManager();