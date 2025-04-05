const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./encryption');
const databaseService = require('./databaseService');

// User data storage location - used only for migration
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

class AuthService {
  constructor() {
    this.initialized = false;
  }

  // Initialize the auth service
  async init() {
    try {
      console.log('Initializing auth service...');
      
      // Ensure database is initialized
      if (!databaseService.initialized) {
        console.log('Database service not initialized, initializing now...');
        await databaseService.init();
      }
      
      // Check if we need to create a default admin user
      const users = databaseService.getAllUsers();
      
      if (users.length === 0) {
        console.log('No users found in database, creating default admin user...');
        try {
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.pbkdf2Sync('1234', salt, 1000, 64, 'sha512').toString('hex');
          
          const adminUser = {
            userId: 'admin',
            username: 'admin',
            salt,
            hash,
            isAdmin: true,
            createdAt: new Date().toISOString(),
            authProvider: 'local'
          };
          
          databaseService.saveUser(adminUser);
          console.log('Created default admin user with password "1234"');
          
          // Also create default user data for the admin user
          const userDataManager = require('./userDataManager');
          console.log('Creating default user data entry for admin...');
          await userDataManager.getUserData('admin'); // This will create default data if none exists
        } catch (createErr) {
          console.error('Error creating default admin user:', createErr);
        }
      }
      
      console.log('Auth service initialization complete');
      this.initialized = true;
    } catch (err) {
      console.error('Error initializing auth service:', err);
      this.initialized = true; // Set to true anyway to prevent repeated init attempts
    }
  }
  
  // Create a password hash using PBKDF2
  hashPassword(password) {
    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Generate hash using PBKDF2 (reduced iterations for better performance)
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    
    // Return both salt and hash for storage
    return {
      salt,
      hash
    };
  }
  
  // Verify a password against stored hash
  verifyPassword(password, storedSalt, storedHash) {
    // Generate hash using the stored salt (with same iteration count as hash creation)
    const hash = crypto.pbkdf2Sync(password, storedSalt, 1000, 64, 'sha512').toString('hex');
    
    // Compare with stored hash
    return hash === storedHash;
  }
  
  // Create a new user
  async createUser(username, password, isAdmin = false) {
    console.log(`Creating user: ${username}, isAdmin: ${isAdmin}`);
    
    try {
      // Ensure the service is initialized
      if (!this.initialized) {
        console.log('Auth service not initialized, initializing now...');
        await this.init();
      }
      
      // Check if username already exists
      if (this.getUserByUsername(username)) {
        console.log(`Username ${username} already exists`);
        return { success: false, message: 'Username already exists' };
      }
      
      // Hash the password
      console.log('Hashing password...');
      const { salt, hash } = this.hashPassword(password);
      
      // Generate a userId
      const userId = crypto.randomBytes(16).toString('hex');
      
      // Create user object
      console.log('Creating user object...');
      const user = {
        userId,
        username,
        salt,
        hash,
        isAdmin,
        createdAt: new Date().toISOString(),
        authProvider: 'local'
      };
      
      // Save user to database
      console.log('Saving user to database...');
      databaseService.saveUser(user);
      
      // Create default user data entry for this user
      const userDataManager = require('./userDataManager');
      console.log('Creating default user data entry...');
      await userDataManager.getUserData(userId); // This will create default data if none exists
      
      console.log(`User ${username} created successfully`);
      return { 
        success: true, 
        message: 'User created successfully',
        user: {
          userId,
          username, 
          isAdmin,
          createdAt: new Date().toISOString(),
          authProvider: 'local'
        }
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, message: `Error creating user: ${error.message}` };
    }
  }
  
  // Find a user by username
  getUserByUsername(username) {
    return databaseService.getUserByUsername(username);
  }
  
  // Find or create user from OAuth profile
  async findOrCreateOAuthUser(profile, provider) {
    console.log(`Finding or creating user from ${provider} OAuth profile:`, profile.id);
    
    // Ensure the service is initialized
    if (!this.initialized) {
      console.log('Auth service not initialized, initializing now...');
      await this.init();
    }
    
    // Look for an existing user with this OAuth ID
    const oauthKey = `${provider}:${profile.id}`;
    let user = databaseService.getUserByOAuthId(oauthKey);
    
    // If not found, check by email if available
    if (!user && profile.emails && profile.emails.length > 0) {
      const email = profile.emails[0].value;
      const users = databaseService.getAllUsers();
      
      for (const existingUser of users) {
        if (existingUser.email === email) {
          console.log(`Found existing user by email: ${existingUser.username}`);
          
          // Update the user with OAuth info
          existingUser.oauthId = oauthKey;
          existingUser.authProvider = provider;
          user = existingUser;
          
          // Save the updated user
          databaseService.saveUser(user);
          break;
        }
      }
    }
    
    let isNewUser = false;
    // If user doesn't exist, create a new one
    if (!user) {
      isNewUser = true;
      console.log(`Creating new user from ${provider} OAuth profile`);
      
      // Generate a username from the profile
      let username = '';
      if (profile.displayName) {
        username = profile.displayName.replace(/\s+/g, '').toLowerCase();
      } else if (profile.username) {
        username = profile.username.toLowerCase();
      } else if (profile.emails && profile.emails.length > 0) {
        username = profile.emails[0].value.split('@')[0].toLowerCase();
      } else {
        username = `${provider}user${Date.now()}`;
      }
      
      // Make sure username is unique by adding a random suffix if needed
      let uniqueUsername = username;
      let counter = 1;
      while (this.getUserByUsername(uniqueUsername)) {
        uniqueUsername = `${username}${counter++}`;
      }
      username = uniqueUsername;
      
      // Get email if available
      const email = profile.emails && profile.emails.length > 0 
        ? profile.emails[0].value 
        : null;
      
      // Generate a userId
      const userId = crypto.randomBytes(16).toString('hex');
      
      // Create the user
      const newUser = {
        userId,
        username,
        email,
        oauthId: oauthKey,
        authProvider: provider,
        isAdmin: false, // OAuth users are not admins by default
        createdAt: new Date().toISOString(),
        profile: {
          name: profile.displayName || '',
          photo: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
        }
      };
      
      // Save to database
      databaseService.saveUser(newUser);
      
      console.log(`Created new OAuth user: ${username}`);
      user = newUser;
    }
    
    // If this is a new user, create default user data entry
    if (isNewUser) {
      const userDataManager = require('./userDataManager');
      console.log('Creating default user data entry for new OAuth user...');
      await userDataManager.getUserData(user.userId); // This will create default data if none exists
    }
    
    return user;
  }
  
  // Authenticate a user
  async authenticate(username, password) {
    console.log(`Authenticating user: ${username}`);
    
    // Ensure the service is initialized
    if (!this.initialized) {
      console.log('Auth service not initialized, initializing now...');
      await this.init();
    }
    
    // Check if user exists
    const user = this.getUserByUsername(username);
    if (!user) {
      console.log(`User '${username}' not found`);
      return { success: false, message: 'Invalid username or password' };
    }
    
    // Check if this is an OAuth user without a password
    if (user.authProvider !== 'local' && !user.hash) {
      console.log(`User '${username}' is an OAuth user and cannot login with password`);
      return { success: false, message: 'This account uses social login. Please sign in with your social provider.' };
    }
    
    console.log(`User '${username}' found, verifying password...`);
    
    // Verify password
    const passwordValid = this.verifyPassword(password, user.salt, user.hash);
    console.log(`Password verification result: ${passwordValid ? 'success' : 'failed'}`);
    
    if (passwordValid) {
      // Return user info (excluding sensitive data)
      console.log(`Authentication successful for user: ${username}`);
      return {
        success: true,
        user: {
          userId: user.userId,
          username: user.username,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
          authProvider: user.authProvider,
          email: user.email
        }
      };
    } else {
      console.log(`Invalid password for user: ${username}`);
      return { success: false, message: 'Invalid username or password' };
    }
  }
  
  // Get a user by ID
  async getUserById(userId) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    return databaseService.getUserById(userId);
  }
  
  // Update user password
  async updatePassword(userId, currentPassword, newPassword) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if user exists
    const user = databaseService.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Get full user data for authentication
    const fullUser = databaseService.getUserByUsername(user.username);
    
    // Check if this is an OAuth user
    if (fullUser.authProvider !== 'local') {
      return { success: false, message: 'Cannot change password for social login accounts' };
    }
    
    // Verify current password
    if (!this.verifyPassword(currentPassword, fullUser.salt, fullUser.hash)) {
      return { success: false, message: 'Current password is incorrect' };
    }
    
    // Hash the new password
    const { salt, hash } = this.hashPassword(newPassword);
    
    // Update user's password
    fullUser.salt = salt;
    fullUser.hash = hash;
    
    // Save user to database
    databaseService.saveUser(fullUser);
    
    return { success: true, message: 'Password updated successfully' };
  }
  
  // Update user profile
  async updateUserProfile(userId, updates) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if user exists
    const user = databaseService.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Get full user data
    const fullUser = databaseService.getUserByUsername(user.username);
    
    // Update the fields
    if (updates.email) fullUser.email = updates.email;
    
    // Only admins can change admin status
    if (updates.hasOwnProperty('isAdmin') && updates.isAdmin !== undefined) {
      // This will be checked in the route handler
      fullUser.isAdmin = !!updates.isAdmin;
    }
    
    // Initialize profile if it doesn't exist
    if (!fullUser.profile) fullUser.profile = {};
    
    // Update profile fields
    if (updates.profile) {
      fullUser.profile = {
        ...fullUser.profile,
        ...updates.profile
      };
    }
    
    // Save user to database
    databaseService.saveUser(fullUser);
    
    return { 
      success: true, 
      message: 'Profile updated successfully',
      user: {
        userId: fullUser.userId,
        username: fullUser.username,
        isAdmin: fullUser.isAdmin,
        email: fullUser.email,
        profile: fullUser.profile,
        authProvider: fullUser.authProvider,
        createdAt: fullUser.createdAt
      }
    };
  }
  
  // Get all users (admin function)
  async getAllUsers() {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    return databaseService.getAllUsers();
  }
  
  // Delete a user
  async deleteUser(userId) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if user exists
    const user = databaseService.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    const username = user.username;
    
    // Delete user from database
    const success = databaseService.deleteUser(userId);
    
    if (success) {
      return { success: true, message: `User ${username} deleted successfully` };
    } else {
      return { success: false, message: `Failed to delete user ${username}` };
    }
  }
}

module.exports = new AuthService();
