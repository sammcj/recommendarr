const path = require('path');
const fs = require('fs').promises;
const Database = require('better-sqlite3');
const encryptionService = require('./encryption');

// Database file location
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'reccommendarr.db');

class DatabaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }
  
  // Initialize the database
  async init() {
    try {
      console.log('Initializing database service...');
      
      // Ensure data directory exists
      try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log(`Created data directory: ${DATA_DIR}`);
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error('Error creating data directory:', err);
          throw err;
        }
      }
      
      // Create database connection
      this.db = new Database(DB_FILE);
      console.log(`Connected to database: ${DB_FILE}`);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Create tables if they don't exist
      this.createTables();
      
      this.initialized = true;
      console.log('Database initialized successfully');
      
      return true;
    } catch (err) {
      console.error('Error initializing database:', err);
      throw err;
    }
  }
  
  // Create database tables
  createTables() {
    console.log('Creating database tables if they don\'t exist...');
    
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        salt TEXT,
        hash TEXT,
        isAdmin INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        authProvider TEXT NOT NULL DEFAULT 'local',
        email TEXT,
        profile TEXT,
        oauthId TEXT
      )
    `);
    
    // User data table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_data (
        userId TEXT PRIMARY KEY,
        tvRecommendations TEXT DEFAULT '[]',
        movieRecommendations TEXT DEFAULT '[]',
        likedTV TEXT DEFAULT '[]',
        dislikedTV TEXT DEFAULT '[]',
        hiddenTV TEXT DEFAULT '[]',
        likedMovies TEXT DEFAULT '[]',
        dislikedMovies TEXT DEFAULT '[]',
        hiddenMovies TEXT DEFAULT '[]',
        watchHistory TEXT DEFAULT '{"movies":[],"shows":[]}',
        settings TEXT DEFAULT '{}',
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);
    
    // Credentials table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        service TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);
    
    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        username TEXT NOT NULL,
        isAdmin INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        authProvider TEXT NOT NULL DEFAULT 'local',
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);
    
    // User service selections table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_service_selections (
        userId TEXT NOT NULL,
        serviceName TEXT NOT NULL,
        selectedUserId TEXT NOT NULL,
        PRIMARY KEY (userId, serviceName),
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);
    
    console.log('Database tables created successfully');
  }
  
  // Migrate data from JSON files to database
  async migrateData() {
    try {
      console.log('Starting data migration from JSON files to database...');
      
      // Migrate users
      await this.migrateUsers();
      
      // Migrate credentials
      await this.migrateCredentials();
      
      // Migrate user data
      await this.migrateUserData();
      
      // Delete JSON files after successful migration
      await this.deleteJSONFiles();
      
      console.log('Data migration completed successfully');
      return true;
    } catch (err) {
      console.error('Error migrating data:', err);
      return false;
    }
  }
  
  // Delete JSON files after successful migration
  async deleteJSONFiles() {
    try {
      console.log('Deleting JSON files after successful migration...');
      
      const USERS_FILE = path.join(DATA_DIR, 'users.json');
      const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
      const LEGACY_USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');
      const USER_DATA_DIR = path.join(DATA_DIR, 'user_data');
      
      // Delete users.json if it exists
      try {
        await fs.access(USERS_FILE);
        await fs.unlink(USERS_FILE);
        console.log(`Deleted ${USERS_FILE}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error deleting ${USERS_FILE}:`, err);
        }
      }
      
      // Delete credentials.json if it exists
      try {
        await fs.access(CREDENTIALS_FILE);
        await fs.unlink(CREDENTIALS_FILE);
        console.log(`Deleted ${CREDENTIALS_FILE}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error deleting ${CREDENTIALS_FILE}:`, err);
        }
      }
      
      // Delete legacy user_data.json if it exists
      try {
        await fs.access(LEGACY_USER_DATA_FILE);
        await fs.unlink(LEGACY_USER_DATA_FILE);
        console.log(`Deleted ${LEGACY_USER_DATA_FILE}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error deleting ${LEGACY_USER_DATA_FILE}:`, err);
        }
      }
      
      // Delete user_data directory and its contents if it exists
      try {
        await fs.access(USER_DATA_DIR);
        
        // Get all files in the user_data directory
        const files = await fs.readdir(USER_DATA_DIR);
        
        // Delete each file in the directory
        for (const file of files) {
          const filePath = path.join(USER_DATA_DIR, file);
          await fs.unlink(filePath);
          console.log(`Deleted ${filePath}`);
        }
        
        // Delete the directory itself
        await fs.rmdir(USER_DATA_DIR);
        console.log(`Deleted ${USER_DATA_DIR} directory`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error deleting ${USER_DATA_DIR}:`, err);
        }
      }
      
      console.log('JSON files deleted successfully');
    } catch (err) {
      console.error('Error deleting JSON files:', err);
    }
  }
  
  // Migrate users from JSON file to database
  async migrateUsers() {
    const USERS_FILE = path.join(DATA_DIR, 'users.json');
    
    try {
      // Check if users file exists
      try {
        await fs.access(USERS_FILE);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log('No users file found, skipping user migration');
          return;
        }
        throw err;
      }
      
      console.log('Migrating users from JSON file to database...');
      
      // Read users file
      const data = await fs.readFile(USERS_FILE, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is encrypted
      let users = {};
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt the data
        users = encryptionService.decrypt(fileData);
      } else {
        // Legacy unencrypted data
        users = fileData;
      }
      
      // Prepare insert statement
      const insertUser = this.db.prepare(`
        INSERT OR REPLACE INTO users (
          userId, username, salt, hash, isAdmin, createdAt, authProvider, email, profile, oauthId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Begin transaction
      const transaction = this.db.transaction((users) => {
        for (const [userId, user] of Object.entries(users)) {
          insertUser.run(
            userId,
            user.username,
            user.salt || null,
            user.hash || null,
            user.isAdmin ? 1 : 0,
            user.createdAt || new Date().toISOString(),
            user.authProvider || 'local',
            user.email || null,
            user.profile ? JSON.stringify(user.profile) : null,
            user.oauthId || null
          );
        }
      });
      
      // Execute transaction
      transaction(users);
      
      console.log(`Migrated ${Object.keys(users).length} users to database`);
    } catch (err) {
      console.error('Error migrating users:', err);
      throw err;
    }
  }
  
  // Migrate credentials from JSON file to database
  async migrateCredentials() {
    const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
    
    try {
      // Check if credentials file exists
      try {
        await fs.access(CREDENTIALS_FILE);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log('No credentials file found, skipping credentials migration');
          return;
        }
        throw err;
      }
      
      console.log('Migrating credentials from JSON file to database...');
      
      // Read credentials file
      const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is encrypted
      let credentials = {};
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt the data
        credentials = encryptionService.decrypt(fileData);
      } else {
        // Legacy unencrypted data
        credentials = fileData;
      }
      
      // Prepare insert statement
      const insertCredential = this.db.prepare(`
        INSERT OR REPLACE INTO credentials (service, data)
        VALUES (?, ?)
      `);
      
      // Begin transaction
      const transaction = this.db.transaction((credentials) => {
        for (const [service, data] of Object.entries(credentials)) {
          // Skip app-config as it's been removed
          if (service !== 'app-config') {
            insertCredential.run(service, JSON.stringify(data));
          }
        }
      });
      
      // Execute transaction
      transaction(credentials);
      
      console.log(`Migrated ${Object.keys(credentials).length} credential services to database`);
    } catch (err) {
      console.error('Error migrating credentials:', err);
      throw err;
    }
  }
  
  // Migrate user data from JSON files to database
  async migrateUserData() {
    const USER_DATA_DIR = path.join(DATA_DIR, 'user_data');
    const LEGACY_USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');
    
    try {
      // Check if user data directory exists
      try {
        await fs.access(USER_DATA_DIR);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log('No user data directory found, checking for legacy user data file');
          
          // Check if legacy user data file exists
          try {
            await fs.access(LEGACY_USER_DATA_FILE);
            
            // Migrate legacy user data
            await this.migrateLegacyUserData(LEGACY_USER_DATA_FILE);
          } catch (legacyErr) {
            if (legacyErr.code === 'ENOENT') {
              console.log('No legacy user data file found, skipping user data migration');
              return;
            }
            throw legacyErr;
          }
          
          return;
        }
        throw err;
      }
      
      console.log('Migrating user data from JSON files to database...');
      
      // Get all user data files
      const files = await fs.readdir(USER_DATA_DIR);
      const userDataFiles = files.filter(file => file.endsWith('.json'));
      
      // Prepare insert statement
      const insertUserData = this.db.prepare(`
        INSERT OR REPLACE INTO user_data (
          userId, tvRecommendations, movieRecommendations, likedTV, dislikedTV, hiddenTV,
          likedMovies, dislikedMovies, hiddenMovies, watchHistory, settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Process each user data file
      for (const file of userDataFiles) {
        const userId = path.basename(file, '.json');
        const filePath = path.join(USER_DATA_DIR, file);
        
        // Read user data file
        const data = await fs.readFile(filePath, 'utf8');
        const fileData = JSON.parse(data);
        
        // Check if data is encrypted
        let userData = {};
        if (fileData.encrypted && fileData.iv && fileData.authTag) {
          // Decrypt the data
          userData = encryptionService.decrypt(fileData);
        } else {
          // Legacy unencrypted data
          userData = fileData;
        }
        
        // Insert user data into database
        insertUserData.run(
          userId,
          JSON.stringify(userData.tvRecommendations || []),
          JSON.stringify(userData.movieRecommendations || []),
          JSON.stringify(userData.likedTV || []),
          JSON.stringify(userData.dislikedTV || []),
          JSON.stringify(userData.hiddenTV || []),
          JSON.stringify(userData.likedMovies || []),
          JSON.stringify(userData.dislikedMovies || []),
          JSON.stringify(userData.hiddenMovies || []),
          JSON.stringify(userData.watchHistory || { movies: [], shows: [] }),
          JSON.stringify(userData.settings || {})
        );
      }
      
      console.log(`Migrated ${userDataFiles.length} user data files to database`);
    } catch (err) {
      console.error('Error migrating user data:', err);
      throw err;
    }
  }
  
  // Migrate legacy user data from JSON file to database
  async migrateLegacyUserData(legacyFilePath) {
    try {
      console.log('Migrating legacy user data from JSON file to database...');
      
      // Read legacy user data file
      const data = await fs.readFile(legacyFilePath, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is encrypted
      let legacyUserData = {};
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt the data
        legacyUserData = encryptionService.decrypt(fileData);
      } else {
        // Legacy unencrypted data
        legacyUserData = fileData;
      }
      
      // Get all users from database
      const users = this.db.prepare('SELECT userId FROM users').all();
      
      if (users.length === 0) {
        console.log('No users found in database, skipping legacy user data migration');
        return;
      }
      
      // Prepare insert statement
      const insertUserData = this.db.prepare(`
        INSERT OR REPLACE INTO user_data (
          userId, tvRecommendations, movieRecommendations, likedTV, dislikedTV, hiddenTV,
          likedMovies, dislikedMovies, hiddenMovies, watchHistory, settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Migrate legacy data to the first user (usually admin)
      const adminUserId = users[0].userId;
      
      // Insert legacy user data into database
      insertUserData.run(
        adminUserId,
        JSON.stringify(legacyUserData.tvRecommendations || []),
        JSON.stringify(legacyUserData.movieRecommendations || []),
        JSON.stringify(legacyUserData.likedTV || []),
        JSON.stringify(legacyUserData.dislikedTV || []),
        JSON.stringify(legacyUserData.hiddenTV || []),
        JSON.stringify(legacyUserData.likedMovies || []),
        JSON.stringify(legacyUserData.dislikedMovies || []),
        JSON.stringify(legacyUserData.hiddenMovies || []),
        JSON.stringify(legacyUserData.watchHistory || { movies: [], shows: [] }),
        JSON.stringify(legacyUserData.settings || {})
      );
      
      console.log(`Migrated legacy user data to user: ${adminUserId}`);
    } catch (err) {
      console.error('Error migrating legacy user data:', err);
      throw err;
    }
  }
  
  // User methods
  
  // Get all users
  getAllUsers() {
    try {
      const users = this.db.prepare('SELECT * FROM users').all();
      
      // Format user data
      return users.map(user => ({
        userId: user.userId,
        username: user.username,
        isAdmin: Boolean(user.isAdmin),
        createdAt: user.createdAt,
        authProvider: user.authProvider,
        email: user.email,
        profile: user.profile ? JSON.parse(user.profile) : null
      }));
    } catch (err) {
      console.error('Error getting all users:', err);
      throw err;
    }
  }
  
  // Get user by ID
  getUserById(userId) {
    try {
      const user = this.db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
      
      if (!user) {
        return null;
      }
      
      // Format user data
      return {
        userId: user.userId,
        username: user.username,
        isAdmin: Boolean(user.isAdmin),
        createdAt: user.createdAt,
        authProvider: user.authProvider,
        email: user.email,
        profile: user.profile ? JSON.parse(user.profile) : null
      };
    } catch (err) {
      console.error(`Error getting user by ID: ${userId}`, err);
      throw err;
    }
  }
  
  // Get user by username
  getUserByUsername(username) {
    try {
      const user = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      
      if (!user) {
        return null;
      }
      
      // Return full user object including sensitive data for authentication
      return {
        userId: user.userId,
        username: user.username,
        salt: user.salt,
        hash: user.hash,
        isAdmin: Boolean(user.isAdmin),
        createdAt: user.createdAt,
        authProvider: user.authProvider,
        email: user.email,
        profile: user.profile ? JSON.parse(user.profile) : null,
        oauthId: user.oauthId
      };
    } catch (err) {
      console.error(`Error getting user by username: ${username}`, err);
      throw err;
    }
  }
  
  // Get user by OAuth ID
  getUserByOAuthId(oauthId) {
    try {
      const user = this.db.prepare('SELECT * FROM users WHERE oauthId = ?').get(oauthId);
      
      if (!user) {
        return null;
      }
      
      // Return full user object
      return {
        userId: user.userId,
        username: user.username,
        salt: user.salt,
        hash: user.hash,
        isAdmin: Boolean(user.isAdmin),
        createdAt: user.createdAt,
        authProvider: user.authProvider,
        email: user.email,
        profile: user.profile ? JSON.parse(user.profile) : null,
        oauthId: user.oauthId
      };
    } catch (err) {
      console.error(`Error getting user by OAuth ID: ${oauthId}`, err);
      throw err;
    }
  }
  
  // Create or update user
  saveUser(user) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO users (
          userId, username, salt, hash, isAdmin, createdAt, authProvider, email, profile, oauthId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        user.userId,
        user.username,
        user.salt || null,
        user.hash || null,
        user.isAdmin ? 1 : 0,
        user.createdAt || new Date().toISOString(),
        user.authProvider || 'local',
        user.email || null,
        user.profile ? JSON.stringify(user.profile) : null,
        user.oauthId || null
      );
      
      return true;
    } catch (err) {
      console.error('Error saving user:', err);
      throw err;
    }
  }
  
  // Delete user
  deleteUser(userId) {
    try {
      // Delete user (cascade will delete related data)
      const result = this.db.prepare('DELETE FROM users WHERE userId = ?').run(userId);
      
      return result.changes > 0;
    } catch (err) {
      console.error(`Error deleting user: ${userId}`, err);
      throw err;
    }
  }
  
  // User data methods
  
  // Get user data
  getUserData(userId) {
    try {
      const userData = this.db.prepare('SELECT * FROM user_data WHERE userId = ?').get(userId);
      
      if (!userData) {
        // Return default user data
        return {
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
      }
      
      // Parse JSON fields
      return {
        tvRecommendations: JSON.parse(userData.tvRecommendations || '[]'),
        movieRecommendations: JSON.parse(userData.movieRecommendations || '[]'),
        likedTV: JSON.parse(userData.likedTV || '[]'),
        dislikedTV: JSON.parse(userData.dislikedTV || '[]'),
        hiddenTV: JSON.parse(userData.hiddenTV || '[]'),
        likedMovies: JSON.parse(userData.likedMovies || '[]'),
        dislikedMovies: JSON.parse(userData.dislikedMovies || '[]'),
        hiddenMovies: JSON.parse(userData.hiddenMovies || '[]'),
        watchHistory: JSON.parse(userData.watchHistory || '{"movies":[],"shows":[]}'),
        settings: JSON.parse(userData.settings || '{}')
      };
    } catch (err) {
      console.error(`Error getting user data: ${userId}`, err);
      throw err;
    }
  }
  
  // Save user data
  saveUserData(userId, userData) {
    try {
      // Ensure required properties exist
      if (!Array.isArray(userData.tvRecommendations)) userData.tvRecommendations = [];
      if (!Array.isArray(userData.movieRecommendations)) userData.movieRecommendations = [];
      if (!Array.isArray(userData.likedTV)) userData.likedTV = [];
      if (!Array.isArray(userData.dislikedTV)) userData.dislikedTV = [];
      if (!Array.isArray(userData.hiddenTV)) userData.hiddenTV = [];
      if (!Array.isArray(userData.likedMovies)) userData.likedMovies = [];
      if (!Array.isArray(userData.dislikedMovies)) userData.dislikedMovies = [];
      if (!Array.isArray(userData.hiddenMovies)) userData.hiddenMovies = [];
      if (!userData.watchHistory) userData.watchHistory = { movies: [], shows: [] };
      if (!userData.settings) userData.settings = {};
      
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_data (
          userId, tvRecommendations, movieRecommendations, likedTV, dislikedTV, hiddenTV,
          likedMovies, dislikedMovies, hiddenMovies, watchHistory, settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        userId,
        JSON.stringify(userData.tvRecommendations),
        JSON.stringify(userData.movieRecommendations),
        JSON.stringify(userData.likedTV),
        JSON.stringify(userData.dislikedTV),
        JSON.stringify(userData.hiddenTV),
        JSON.stringify(userData.likedMovies),
        JSON.stringify(userData.dislikedMovies),
        JSON.stringify(userData.hiddenMovies),
        JSON.stringify(userData.watchHistory),
        JSON.stringify(userData.settings)
      );
      
      return true;
    } catch (err) {
      console.error(`Error saving user data: ${userId}`, err);
      return false;
    }
  }
  
  // Delete user data
  deleteUserData(userId) {
    try {
      const result = this.db.prepare('DELETE FROM user_data WHERE userId = ?').run(userId);
      
      return result.changes > 0;
    } catch (err) {
      console.error(`Error deleting user data: ${userId}`, err);
      return false;
    }
  }
  
  // Credentials methods
  
  // Get all credentials
  getAllCredentials() {
    try {
      const credentials = {};
      const rows = this.db.prepare('SELECT service, data FROM credentials').all();
      
      for (const row of rows) {
        credentials[row.service] = JSON.parse(row.data);
      }
      
      return credentials;
    } catch (err) {
      console.error('Error getting all credentials:', err);
      return {};
    }
  }
  
  // Get credentials for a service
  getCredentials(service) {
    try {
      const row = this.db.prepare('SELECT data FROM credentials WHERE service = ?').get(service);
      
      if (!row) {
        return null;
      }
      
      return JSON.parse(row.data);
    } catch (err) {
      console.error(`Error getting credentials for service: ${service}`, err);
      return null;
    }
  }
  
  // Save credentials for a service
  saveCredentials(service, data) {
    try {
      const stmt = this.db.prepare('INSERT OR REPLACE INTO credentials (service, data) VALUES (?, ?)');
      
      stmt.run(service, JSON.stringify(data));
      
      return true;
    } catch (err) {
      console.error(`Error saving credentials for service: ${service}`, err);
      return false;
    }
  }
  
  // Delete credentials for a service
  deleteCredentials(service) {
    try {
      const result = this.db.prepare('DELETE FROM credentials WHERE service = ?').run(service);
      
      return result.changes > 0;
    } catch (err) {
      console.error(`Error deleting credentials for service: ${service}`, err);
      return false;
    }
  }
  
  // Session methods
  
  // Create session
  createSession(session) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (token, userId, username, isAdmin, createdAt, expiresAt, authProvider)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        session.token,
        session.userId,
        session.username,
        session.isAdmin ? 1 : 0,
        session.createdAt,
        session.expiresAt,
        session.authProvider || 'local'
      );
      
      return true;
    } catch (err) {
      console.error('Error creating session:', err);
      return false;
    }
  }
  
  // Get session by token
  getSession(token) {
    try {
      const session = this.db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
      
      if (!session) {
        return null;
      }
      
      return {
        token: session.token,
        userId: session.userId,
        username: session.username,
        isAdmin: Boolean(session.isAdmin),
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        authProvider: session.authProvider
      };
    } catch (err) {
      console.error(`Error getting session: ${token}`, err);
      return null;
    }
  }
  
  // Update session expiry
  updateSessionExpiry(token, expiresAt) {
    try {
      const stmt = this.db.prepare('UPDATE sessions SET expiresAt = ? WHERE token = ?');
      
      stmt.run(expiresAt, token);
      
      return true;
    } catch (err) {
      console.error(`Error updating session expiry: ${token}`, err);
      return false;
    }
  }
  
  // Delete session
  deleteSession(token) {
    try {
      const result = this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      
      return result.changes > 0;
    } catch (err) {
      console.error(`Error deleting session: ${token}`, err);
      return false;
    }
  }
  
  // Delete all sessions for a user
  deleteUserSessions(userId) {
    try {
      const result = this.db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
      
      return result.changes;
    } catch (err) {
      console.error(`Error deleting sessions for user: ${userId}`, err);
      return 0;
    }
  }
  
  // Clean up expired sessions
  cleanupSessions() {
    try {
      const now = new Date().toISOString();
      const result = this.db.prepare('DELETE FROM sessions WHERE expiresAt < ?').run(now);
      
      return result.changes;
    } catch (err) {
      console.error('Error cleaning up sessions:', err);
      return 0;
    }
  }
  
  // User service selection methods
  
  // Get user service selection
  getUserServiceSelection(userId, serviceName) {
    try {
      const row = this.db.prepare(
        'SELECT selectedUserId FROM user_service_selections WHERE userId = ? AND serviceName = ?'
      ).get(userId, serviceName);
      
      return row ? row.selectedUserId : null;
    } catch (err) {
      console.error(`Error getting user service selection: ${userId}, ${serviceName}`, err);
      return null;
    }
  }
  
  // Set user service selection
  setUserServiceSelection(userId, serviceName, selectedUserId) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_service_selections (userId, serviceName, selectedUserId)
        VALUES (?, ?, ?)
      `);
      
      stmt.run(userId, serviceName, selectedUserId);
      
      return true;
    } catch (err) {
      console.error(`Error setting user service selection: ${userId}, ${serviceName}`, err);
      return false;
    }
  }
}

module.exports = new DatabaseService();
