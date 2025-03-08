const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./encryption');

// User data storage location
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

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
          
          // Create default admin user if no users exist
          console.log('Creating default admin user...');
          try {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync('admin', salt, 1000, 64, 'sha512').toString('hex');
            
            this.users['admin'] = {
              username: 'admin',
              salt,
              hash,
              isAdmin: true,
              createdAt: new Date().toISOString()
            };
            
            await this.saveUsers();
            console.log('Created default admin user and saved to file');
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
      if (this.users[username]) {
        console.log(`Username ${username} already exists`);
        return { success: false, message: 'Username already exists' };
      }
      
      // Hash the password
      console.log('Hashing password...');
      const { salt, hash } = this.hashPassword(password);
      
      // Create user object
      console.log('Creating user object...');
      this.users[username] = {
        username,
        salt,
        hash,
        isAdmin,
        createdAt: new Date().toISOString()
      };
      
      // Save users to file
      console.log('Saving users to file...');
      await this.saveUsers();
      
      console.log(`User ${username} created successfully`);
      return { success: true, message: 'User created successfully' };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, message: `Error creating user: ${error.message}` };
    }
  }
  
  // Authenticate a user
  async authenticate(username, password) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if user exists
    const user = this.users[username];
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    // Verify password
    if (this.verifyPassword(password, user.salt, user.hash)) {
      // Return user info (excluding sensitive data)
      return {
        success: true,
        user: {
          username: user.username,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt
        }
      };
    } else {
      return { success: false, message: 'Invalid username or password' };
    }
  }
  
  // Check if a user exists
  async userExists(username) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    return !!this.users[username];
  }
  
  // Get a user by username
  async getUser(username) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    const user = this.users[username];
    if (!user) {
      return null;
    }
    
    // Return user info (excluding sensitive data)
    return {
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt
    };
  }
  
  // Update user password
  async updatePassword(username, currentPassword, newPassword) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if user exists
    const user = this.users[username];
    if (!user) {
      return { success: false, message: 'User not found' };
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
  
  // Get all users (admin function)
  async getAllUsers() {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Return all users excluding sensitive data
    const userList = Object.values(this.users).map(user => ({
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt
    }));
    
    return userList;
  }
  
  // Delete a user
  async deleteUser(username) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.init();
    }
    
    // Check if user exists
    if (!this.users[username]) {
      return { success: false, message: 'User not found' };
    }
    
    // Delete user
    delete this.users[username];
    
    // Save users to file
    await this.saveUsers();
    
    return { success: true, message: 'User deleted successfully' };
  }
}

module.exports = new AuthService();