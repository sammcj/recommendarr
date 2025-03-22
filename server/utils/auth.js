const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./encryption');

// User data storage location - use the same data directory as server.js uses
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

class AuthService {
  constructor() {
    this.users = {};
    this.initialized = false;
  }

  // Initialize the auth service - load or create users file
  async init() {
    try {
      console.log('Initializing auth service...');
      
      // Ensure data directory exists
      const dataDir = path.dirname(USERS_FILE);
      try {
        console.log(`Ensuring data directory exists: ${dataDir}`);
        await fs.mkdir(dataDir, { recursive: true });
      } catch (dirErr) {
        if (dirErr.code !== 'EEXIST') {
          console.error('Error creating data directory:', dirErr);
        }
      }
      
      // Try to load existing users
      try {
        console.log(`Attempting to read users file: ${USERS_FILE}`);
        const data = await fs.readFile(USERS_FILE, 'utf8');
        
        console.log('Parsing user file data...');
        const fileData = JSON.parse(data);
        
        // Check if data is already encrypted
        if (fileData.encrypted && fileData.iv && fileData.authTag) {
          console.log('Decrypting user data...');
          // Decrypt the data
          this.users = encryptionService.decrypt(fileData);
          console.log('Loaded and decrypted existing users');
        } else {
          // Legacy unencrypted data - encrypt it now
          console.log('Found unencrypted user data, migrating to encrypted format...');
          this.users = fileData;
          await this.saveUsers();
          console.log('Migrated unencrypted users to encrypted format');
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log('Users file does not exist, creating new file with default admin user');
          // File doesn't exist yet, initialize with empty object
          this.users = {};
          
          // Create default admin user with password "1234"
          console.log('Creating default admin user...');
          try {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync('1234', salt, 1000, 64, 'sha512').toString('hex');
            
            this.users['admin'] = {
              userId: 'admin',
              username: 'admin',
              salt,
              hash,
              isAdmin: true,
              createdAt: new Date().toISOString(),
              authProvider: 'local'
            };
            
            await this.saveUsers();
            console.log('Created default admin user with password "1234" and saved to file');
          } catch (createErr) {
            console.error('Error creating default admin user:', createErr);
            this.users = {}; // Ensure we at least have an empty users object
          }
        } else {
          console.error('Error reading users file:', err);
          // Initialize with empty object instead of throwing error
          this.users = {};
        }
      }
      
      // If we have an empty users object, create a default admin user
      if (Object.keys(this.users).length === 0) {
        console.log('No users found, creating default admin user...');
        try {
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.pbkdf2Sync('1234', salt, 1000, 64, 'sha512').toString('hex');
          
          this.users['admin'] = {
            userId: 'admin',
            username: 'admin',
            salt,
            hash,
            isAdmin: true,
            createdAt: new Date().toISOString(),
            authProvider: 'local'
          };
          
          await this.saveUsers();
          console.log('Created default admin user with password "1234" and saved to file');
        } catch (createErr) {
          console.error('Error creating default admin user:', createErr);
        }
      } else {
        // Migrate existing users to the new format with authProvider field
        let needsMigration = false;
        for (const [userId, user] of Object.entries(this.users)) {
          if (!user.authProvider) {
            this.users[userId].authProvider = 'local';
            if (!user.userId) this.users[userId].userId = userId;
            needsMigration = true;
          }
        }
        
        // Save migrated users if needed
        if (needsMigration) {
          console.log('Migrating existing users to include authProvider field');
          await this.saveUsers();
        }
      }
      
      console.log('Auth service initialization complete');
      this.initialized = true;
    } catch (err) {
      console.error('Error initializing auth service:', err);
      // Initialize with empty object instead of throwing error
      this.users = {};
      this.initialized = true;
    }
  }
  
  // Save users to file with encryption
  async saveUsers() {
    try {
      console.log('Saving users to file...');
      
      // Ensure data directory exists
      const dataDir = path.dirname(USERS_FILE);
      try {
        console.log(`Ensuring data directory exists: ${dataDir}`);
        await fs.mkdir(dataDir, { recursive: true });
      } catch (dirErr) {
        if (dirErr.code !== 'EEXIST') {
          console.error('Error creating data directory:', dirErr);
          throw dirErr;
        }
      }
      
      // Encrypt the users object
      console.log('Encrypting user data...');
      const encryptedData = encryptionService.encrypt(this.users);
      
      // Write encrypted data to file
      console.log(`Writing encrypted data to file: ${USERS_FILE}`);
      await fs.writeFile(USERS_FILE, JSON.stringify(encryptedData, null, 2), 'utf8');
      
      console.log('Users saved successfully');
      return true;
    } catch (err) {
      console.error('Error saving users:', err);
      return false;
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
      this.users[userId] = {
        userId,
        username,
        salt,
        hash,
        isAdmin,
        createdAt: new Date().toISOString(),
        authProvider: 'local'
      };
      
      // Save users to file
      console.log('Saving users to file...');
      await this.saveUsers();
      
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
    for (const user of Object.values(this.users)) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
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
    let user = null;
    
    // First check by provider ID
    for (const existingUser of Object.values(this.users)) {
      if (existingUser.oauthId === oauthKey) {
        console.log(`Found existing OAuth user: ${existingUser.username}`);
        user = existingUser;
        break;
      }
    }
    
    // If not found, check by email if available
    if (!user && profile.emails && profile.emails.length > 0) {
      const email = profile.emails[0].value;
      for (const existingUser of Object.values(this.users)) {
        if (existingUser.email === email) {
          console.log(`Found existing user by email: ${existingUser.username}`);
          
          // Update the user with OAuth info
          existingUser.oauthId = oauthKey;
          existingUser.authProvider = provider;
          user = existingUser;
          
          // Save the updated user
          await this.saveUsers();
          break;
        }
      }
    }
    
    // If user doesn't exist, create a new one
    if (!user) {
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
      
      // Save to our users object
      this.users[userId] = newUser;
      await this.saveUsers();
      
      console.log(`Created new OAuth user: ${username}`);
      user = newUser;
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
    
    const user = this.users[userId];
    if (!user) {
      return null;
    }
    
    // Return user info (excluding sensitive data)
    return {
      userId: user.userId,
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      authProvider: user.authProvider,
      email: user.email,
      profile: user.profile
    };
  }
  
  // Update user password
  async updatePassword(userId, currentPassword, newPassword) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if user exists
    const user = this.users[userId];
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Check if this is an OAuth user
    if (user.authProvider !== 'local') {
      return { success: false, message: 'Cannot change password for social login accounts' };
    }
    
    // Verify current password
    if (!this.verifyPassword(currentPassword, user.salt, user.hash)) {
      return { success: false, message: 'Current password is incorrect' };
    }
    
    // Hash the new password
    const { salt, hash } = this.hashPassword(newPassword);
    
    // Update user's password
    user.salt = salt;
    user.hash = hash;
    
    // Save users to file
    await this.saveUsers();
    
    return { success: true, message: 'Password updated successfully' };
  }
  
  // Update user profile
  async updateUserProfile(userId, updates) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if user exists
    const user = this.users[userId];
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Update the fields
    if (updates.email) user.email = updates.email;
    
    // Only admins can change admin status
    if (updates.hasOwnProperty('isAdmin') && updates.isAdmin !== undefined) {
      // This will be checked in the route handler
      user.isAdmin = !!updates.isAdmin;
    }
    
    // Initialize profile if it doesn't exist
    if (!user.profile) user.profile = {};
    
    // Update profile fields
    if (updates.profile) {
      user.profile = {
        ...user.profile,
        ...updates.profile
      };
    }
    
    // Save users to file
    await this.saveUsers();
    
    return { 
      success: true, 
      message: 'Profile updated successfully',
      user: {
        userId: user.userId,
        username: user.username,
        isAdmin: user.isAdmin,
        email: user.email,
        profile: user.profile,
        authProvider: user.authProvider,
        createdAt: user.createdAt
      }
    };
  }
  
  // Get all users (admin function)
  async getAllUsers() {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Return all users excluding sensitive data
    const userList = Object.values(this.users).map(user => ({
      userId: user.userId,
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      authProvider: user.authProvider,
      email: user.email,
      profile: user.profile
    }));
    
    return userList;
  }
  
  // Delete a user
  async deleteUser(userId) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if user exists
    if (!this.users[userId]) {
      return { success: false, message: 'User not found' };
    }
    
    const username = this.users[userId].username;
    
    // Delete user
    delete this.users[userId];
    
    // Save users to file
    await this.saveUsers();
    
    return { success: true, message: `User ${username} deleted successfully` };
  }
}

module.exports = new AuthService();