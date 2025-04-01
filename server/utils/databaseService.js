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
    
    // User data table with all columns
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
        
        -- Basic UI settings
        numRecommendations INTEGER DEFAULT 6,
        columnsCount INTEGER DEFAULT 3,
        historyColumnsCount INTEGER DEFAULT 3,
        darkTheme INTEGER DEFAULT 0,
        
        -- History display settings
        historyHideExisting INTEGER DEFAULT 1,
        historyHideLiked INTEGER DEFAULT 0,
        historyHideDisliked INTEGER DEFAULT 0,
        historyHideHidden INTEGER DEFAULT 1,
        
        -- Content preferences
        contentTypePreference TEXT DEFAULT 'tv',
        isMovieMode INTEGER DEFAULT 0,
        tvGenrePreferences TEXT DEFAULT '[]',
        tvCustomVibe TEXT DEFAULT '',
        tvLanguagePreference TEXT DEFAULT 'en',
        movieGenrePreferences TEXT DEFAULT '[]',
        movieCustomVibe TEXT DEFAULT '',
        movieLanguagePreference TEXT DEFAULT 'en',
        
        -- Library settings
        useSampledLibrary INTEGER DEFAULT 0,
        librarySampleSize INTEGER DEFAULT 100,
        
        -- Plex-specific settings
        selectedPlexUserId TEXT DEFAULT '',
        plexRecentLimit INTEGER DEFAULT 6500,
        plexHistoryMode TEXT DEFAULT 'recent',
        plexCustomHistoryDays INTEGER DEFAULT 30,
        plexOnlyMode INTEGER DEFAULT 0,
        
        -- Jellyfin-specific settings
        selectedJellyfinUserId TEXT DEFAULT '',
        jellyfinRecentLimit INTEGER DEFAULT 100,
        jellyfinHistoryMode TEXT DEFAULT 'all',
        jellyfinOnlyMode INTEGER DEFAULT 0,
        
        -- Tautulli-specific settings
        selectedTautulliUserId TEXT DEFAULT '',
        tautulliRecentLimit INTEGER DEFAULT 50,
        tautulliHistoryMode TEXT DEFAULT 'all',
        tautulliOnlyMode INTEGER DEFAULT 0,
        
        -- Trakt-specific settings
        traktRecentLimit INTEGER DEFAULT 50,
        traktHistoryMode TEXT DEFAULT 'all',
        traktOnlyMode INTEGER DEFAULT 0,
        
        -- Watch history refresh timestamps
        lastPlexHistoryRefresh TEXT DEFAULT NULL,
        lastJellyfinHistoryRefresh TEXT DEFAULT NULL,
        lastTautulliHistoryRefresh TEXT DEFAULT NULL,
        lastTraktHistoryRefresh TEXT DEFAULT NULL,
        
        -- Watch history
        watchHistoryMovies TEXT DEFAULT '[]',
        watchHistoryShows TEXT DEFAULT '[]',
        
        -- Service-specific watch history
        jellyfinWatchHistoryMovies TEXT DEFAULT '[]',
        jellyfinWatchHistoryShows TEXT DEFAULT '[]',
        tautulliWatchHistoryMovies TEXT DEFAULT '[]',
        tautulliWatchHistoryShows TEXT DEFAULT '[]',
        traktWatchHistoryMovies TEXT DEFAULT '[]',
        traktWatchHistoryShows TEXT DEFAULT '[]',
        
        -- General preferences
        genrePreferences TEXT DEFAULT '[]',
        languagePreference TEXT DEFAULT 'en',
        
        -- AI model settings
        openaiModel TEXT DEFAULT 'google/gemini-2.0-flash-exp:free',
        
        -- Recommendation history
        previousTVRecommendations TEXT DEFAULT '[]',
        currentTVRecommendations TEXT DEFAULT '[]',
        
        -- Migration flags
        fullDatabaseStorageMigrationComplete INTEGER DEFAULT 0,
        
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
    
    // User-specific credentials table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        userId TEXT NOT NULL,
        service TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (userId, service),
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
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
    
    // Sonarr libraries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sonarr_libraries (
        userId TEXT NOT NULL,
        data TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        PRIMARY KEY (userId),
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      )
    `);
    
    // Radarr libraries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS radarr_libraries (
        userId TEXT NOT NULL,
        data TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        PRIMARY KEY (userId),
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
            movieLanguagePreference: 'en',
            useSampledLibrary: false,
            librarySampleSize: 100,
            darkTheme: false,
            selectedPlexUserId: '',
            plexRecentLimit: 6500,
            plexHistoryMode: 'recent',
            plexCustomHistoryDays: 30,
            openaiModel: '',
            previousTVRecommendations: [],
            currentTVRecommendations: [],
            fullDatabaseStorageMigrationComplete: false
          }
        };
      }
      
      // Parse JSON fields
      const parsedData = {
        tvRecommendations: JSON.parse(userData.tvRecommendations || '[]'),
        movieRecommendations: JSON.parse(userData.movieRecommendations || '[]'),
        likedTV: JSON.parse(userData.likedTV || '[]'),
        dislikedTV: JSON.parse(userData.dislikedTV || '[]'),
        hiddenTV: JSON.parse(userData.hiddenTV || '[]'),
        likedMovies: JSON.parse(userData.likedMovies || '[]'),
        dislikedMovies: JSON.parse(userData.dislikedMovies || '[]'),
        hiddenMovies: JSON.parse(userData.hiddenMovies || '[]'),
        watchHistory: JSON.parse(userData.watchHistory || '{"movies":[],"shows":[]}')
      };
      
      // Construct settings object from individual columns
      parsedData.settings = {
        // Basic UI settings
        numRecommendations: userData.numRecommendations || 6,
        columnsCount: userData.columnsCount || 3,
        historyColumnsCount: userData.historyColumnsCount || 3,
        darkTheme: Boolean(userData.darkTheme),
        
        // History display settings
        historyHideExisting: Boolean(userData.historyHideExisting),
        historyHideLiked: Boolean(userData.historyHideLiked),
        historyHideDisliked: Boolean(userData.historyHideDisliked),
        historyHideHidden: Boolean(userData.historyHideHidden),
        
        // Content preferences
        contentTypePreference: userData.contentTypePreference || 'tv',
        isMovieMode: Boolean(userData.isMovieMode),
        tvGenrePreferences: JSON.parse(userData.tvGenrePreferences || '[]'),
        tvCustomVibe: userData.tvCustomVibe || '',
        tvLanguagePreference: userData.tvLanguagePreference || 'en',
        movieGenrePreferences: JSON.parse(userData.movieGenrePreferences || '[]'),
        movieCustomVibe: userData.movieCustomVibe || '',
        movieLanguagePreference: userData.movieLanguagePreference || 'en',
        
        // Library settings
        useSampledLibrary: Boolean(userData.useSampledLibrary),
        librarySampleSize: userData.librarySampleSize || 100,
        
        // Plex-specific settings
        selectedPlexUserId: userData.selectedPlexUserId || '',
        plexRecentLimit: userData.plexRecentLimit || 6500,
        plexHistoryMode: userData.plexHistoryMode || 'recent',
        plexCustomHistoryDays: userData.plexCustomHistoryDays || 30,
        plexOnlyMode: Boolean(userData.plexOnlyMode),
        
        // Jellyfin-specific settings
        selectedJellyfinUserId: userData.selectedJellyfinUserId || '',
        jellyfinRecentLimit: userData.jellyfinRecentLimit || 100,
        jellyfinHistoryMode: userData.jellyfinHistoryMode || 'all',
        jellyfinOnlyMode: Boolean(userData.jellyfinOnlyMode),
        
        // Tautulli-specific settings
        selectedTautulliUserId: userData.selectedTautulliUserId || '',
        tautulliRecentLimit: userData.tautulliRecentLimit || 50,
        tautulliHistoryMode: userData.tautulliHistoryMode || 'all',
        tautulliOnlyMode: Boolean(userData.tautulliOnlyMode),
        
        // Trakt-specific settings
        traktRecentLimit: userData.traktRecentLimit || 50,
        traktHistoryMode: userData.traktHistoryMode || 'all',
        traktOnlyMode: Boolean(userData.traktOnlyMode),
        
        // Watch history refresh timestamps
        lastPlexHistoryRefresh: userData.lastPlexHistoryRefresh || null,
        lastJellyfinHistoryRefresh: userData.lastJellyfinHistoryRefresh || null,
        lastTautulliHistoryRefresh: userData.lastTautulliHistoryRefresh || null,
        lastTraktHistoryRefresh: userData.lastTraktHistoryRefresh || null,
        
        // Watch history
        watchHistoryMovies: userData.watchHistoryMovies ? JSON.parse(userData.watchHistoryMovies) : [],
        watchHistoryShows: userData.watchHistoryShows ? JSON.parse(userData.watchHistoryShows) : [],
        
        // Service-specific watch history
        jellyfinWatchHistoryMovies: userData.jellyfinWatchHistoryMovies ? JSON.parse(userData.jellyfinWatchHistoryMovies) : [],
        jellyfinWatchHistoryShows: userData.jellyfinWatchHistoryShows ? JSON.parse(userData.jellyfinWatchHistoryShows) : [],
        tautulliWatchHistoryMovies: userData.tautulliWatchHistoryMovies ? JSON.parse(userData.tautulliWatchHistoryMovies) : [],
        tautulliWatchHistoryShows: userData.tautulliWatchHistoryShows ? JSON.parse(userData.tautulliWatchHistoryShows) : [],
        traktWatchHistoryMovies: userData.traktWatchHistoryMovies ? JSON.parse(userData.traktWatchHistoryMovies) : [],
        traktWatchHistoryShows: userData.traktWatchHistoryShows ? JSON.parse(userData.traktWatchHistoryShows) : [],
        
        // General preferences
        genrePreferences: userData.genrePreferences ? JSON.parse(userData.genrePreferences) : [],
        languagePreference: userData.languagePreference || 'en',
        
        // AI model settings
        openaiModel: userData.openaiModel || 'google/gemini-2.0-flash-exp:free',
        
        // Recommendation history
        previousTVRecommendations: JSON.parse(userData.previousTVRecommendations || '[]'),
        currentTVRecommendations: JSON.parse(userData.currentTVRecommendations || '[]'),
        
        // Migration flags
        fullDatabaseStorageMigrationComplete: Boolean(userData.fullDatabaseStorageMigrationComplete)
      };
      
      // Parse any remaining settings from the settings column for backward compatibility
      const legacySettings = JSON.parse(userData.settings || '{}');
      parsedData.settings = { ...parsedData.settings, ...legacySettings };
      
      return parsedData;
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
      
      // Extract settings from the settings object
      const settings = userData.settings || {};
      
      // Log watch history refresh timestamps
      console.log('Saving watch history refresh timestamps:', {
        lastPlexHistoryRefresh: settings.lastPlexHistoryRefresh,
        lastJellyfinHistoryRefresh: settings.lastJellyfinHistoryRefresh,
        lastTautulliHistoryRefresh: settings.lastTautulliHistoryRefresh,
        lastTraktHistoryRefresh: settings.lastTraktHistoryRefresh
      });
      
      // Get the table info to determine columns
      const tableInfo = this.db.prepare("PRAGMA table_info(user_data)").all();
      
      // Dynamically build the SQL statement based on the actual columns in the table
      const columnNames = tableInfo.map(col => col.name).filter(name => name !== 'rowid');
      const placeholders = columnNames.map(() => '?').join(', ');
      
      const sql = `
        INSERT OR REPLACE INTO user_data (
          ${columnNames.join(', ')}
        ) VALUES (
          ${placeholders}
        )
      `;
      
      // Prepare the statement with the dynamic SQL
      const stmt = this.db.prepare(sql);
      
      // Create an array of values in the same order as the columns
      const values = [];
      
      // Add values for each column in the correct order
      for (const col of columnNames) {
        switch (col) {
          case 'userId':
            values.push(userId);
            break;
          case 'tvRecommendations':
            values.push(JSON.stringify(userData.tvRecommendations));
            break;
          case 'movieRecommendations':
            values.push(JSON.stringify(userData.movieRecommendations));
            break;
          case 'likedTV':
            values.push(JSON.stringify(userData.likedTV));
            break;
          case 'dislikedTV':
            values.push(JSON.stringify(userData.dislikedTV));
            break;
          case 'hiddenTV':
            values.push(JSON.stringify(userData.hiddenTV));
            break;
          case 'likedMovies':
            values.push(JSON.stringify(userData.likedMovies));
            break;
          case 'dislikedMovies':
            values.push(JSON.stringify(userData.dislikedMovies));
            break;
          case 'hiddenMovies':
            values.push(JSON.stringify(userData.hiddenMovies));
            break;
          case 'watchHistory':
            values.push(JSON.stringify(userData.watchHistory));
            break;
          case 'settings':
            values.push(JSON.stringify(userData.settings));
            break;
          case 'numRecommendations':
            values.push(settings.numRecommendations || 6);
            break;
          case 'columnsCount':
            values.push(settings.columnsCount || 3);
            break;
          case 'historyColumnsCount':
            values.push(settings.historyColumnsCount || 3);
            break;
          case 'darkTheme':
            values.push(settings.darkTheme ? 1 : 0);
            break;
          case 'historyHideExisting':
            values.push(settings.historyHideExisting ? 1 : 0);
            break;
          case 'historyHideLiked':
            values.push(settings.historyHideLiked ? 1 : 0);
            break;
          case 'historyHideDisliked':
            values.push(settings.historyHideDisliked ? 1 : 0);
            break;
          case 'historyHideHidden':
            values.push(settings.historyHideHidden ? 1 : 0);
            break;
          case 'contentTypePreference':
            values.push(settings.contentTypePreference || 'tv');
            break;
          case 'isMovieMode':
            values.push(settings.isMovieMode ? 1 : 0);
            break;
          case 'tvGenrePreferences':
            values.push(JSON.stringify(settings.tvGenrePreferences || []));
            break;
          case 'tvCustomVibe':
            values.push(settings.tvCustomVibe || '');
            break;
          case 'tvLanguagePreference':
            values.push(settings.tvLanguagePreference || 'en');
            break;
          case 'movieGenrePreferences':
            values.push(JSON.stringify(settings.movieGenrePreferences || []));
            break;
          case 'movieCustomVibe':
            values.push(settings.movieCustomVibe || '');
            break;
          case 'movieLanguagePreference':
            values.push(settings.movieLanguagePreference || 'en');
            break;
          case 'useSampledLibrary':
            values.push(settings.useSampledLibrary ? 1 : 0);
            break;
          case 'librarySampleSize':
            values.push(settings.librarySampleSize || 100);
            break;
          case 'selectedPlexUserId':
            values.push(settings.selectedPlexUserId || '');
            break;
          case 'plexRecentLimit':
            values.push(settings.plexRecentLimit || 6500);
            break;
          case 'plexHistoryMode':
            values.push(settings.plexHistoryMode || 'recent');
            break;
          case 'plexCustomHistoryDays':
            values.push(settings.plexCustomHistoryDays || 30);
            break;
          case 'plexOnlyMode':
            values.push(settings.plexOnlyMode ? 1 : 0);
            break;
          case 'selectedJellyfinUserId':
            values.push(settings.selectedJellyfinUserId || '');
            break;
          case 'jellyfinRecentLimit':
            values.push(settings.jellyfinRecentLimit || 100);
            break;
          case 'jellyfinHistoryMode':
            values.push(settings.jellyfinHistoryMode || 'all');
            break;
          case 'jellyfinOnlyMode':
            values.push(settings.jellyfinOnlyMode ? 1 : 0);
            break;
          case 'selectedTautulliUserId':
            values.push(settings.selectedTautulliUserId || '');
            break;
          case 'tautulliRecentLimit':
            values.push(settings.tautulliRecentLimit || 50);
            break;
          case 'tautulliHistoryMode':
            values.push(settings.tautulliHistoryMode || 'all');
            break;
          case 'tautulliOnlyMode':
            values.push(settings.tautulliOnlyMode ? 1 : 0);
            break;
          case 'traktRecentLimit':
            values.push(settings.traktRecentLimit || 50);
            break;
          case 'traktHistoryMode':
            values.push(settings.traktHistoryMode || 'all');
            break;
          case 'traktOnlyMode':
            values.push(settings.traktOnlyMode ? 1 : 0);
            break;
          case 'lastPlexHistoryRefresh':
            values.push(settings.lastPlexHistoryRefresh ? String(settings.lastPlexHistoryRefresh) : null);
            break;
          case 'lastJellyfinHistoryRefresh':
            values.push(settings.lastJellyfinHistoryRefresh ? String(settings.lastJellyfinHistoryRefresh) : null);
            break;
          case 'lastTautulliHistoryRefresh':
            values.push(settings.lastTautulliHistoryRefresh ? String(settings.lastTautulliHistoryRefresh) : null);
            break;
          case 'lastTraktHistoryRefresh':
            values.push(settings.lastTraktHistoryRefresh ? String(settings.lastTraktHistoryRefresh) : null);
            break;
          case 'watchHistoryMovies':
            values.push(JSON.stringify(settings.watchHistoryMovies || []));
            break;
          case 'watchHistoryShows':
            values.push(JSON.stringify(settings.watchHistoryShows || []));
            break;
          case 'jellyfinWatchHistoryMovies':
            values.push(JSON.stringify(settings.jellyfinWatchHistoryMovies || []));
            break;
          case 'jellyfinWatchHistoryShows':
            values.push(JSON.stringify(settings.jellyfinWatchHistoryShows || []));
            break;
          case 'tautulliWatchHistoryMovies':
            values.push(JSON.stringify(settings.tautulliWatchHistoryMovies || []));
            break;
          case 'tautulliWatchHistoryShows':
            values.push(JSON.stringify(settings.tautulliWatchHistoryShows || []));
            break;
          case 'traktWatchHistoryMovies':
            values.push(JSON.stringify(settings.traktWatchHistoryMovies || []));
            break;
          case 'traktWatchHistoryShows':
            values.push(JSON.stringify(settings.traktWatchHistoryShows || []));
            break;
          case 'genrePreferences':
            values.push(JSON.stringify(settings.genrePreferences || []));
            break;
          case 'languagePreference':
            values.push(settings.languagePreference || 'en');
            break;
          case 'openaiModel':
            values.push(settings.openaiModel || 'google/gemini-2.0-flash-exp:free');
            break;
          case 'previousTVRecommendations':
            values.push(JSON.stringify(settings.previousTVRecommendations || []));
            break;
          case 'currentTVRecommendations':
            values.push(JSON.stringify(settings.currentTVRecommendations || []));
            break;
          case 'fullDatabaseStorageMigrationComplete':
            values.push(settings.fullDatabaseStorageMigrationComplete ? 1 : 0);
            break;
          default:
            // For any other columns, push null or a default value
            values.push(null);
        }
      }
      
      console.log(`Executing SQL with ${values.length} values for ${columnNames.length} columns`);
      
      // Execute the statement with the values
      stmt.run(...values);
      
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
  
  // User-specific credentials methods
  
  // Get user-specific credentials for a service
  getUserCredentials(userId, service) {
    try {
      const row = this.db.prepare('SELECT data FROM user_credentials WHERE userId = ? AND service = ?').get(userId, service);
      
      if (!row) {
        return null;
      }
      
      return JSON.parse(row.data);
    } catch (err) {
      console.error(`Error getting user credentials for userId: ${userId}, service: ${service}`, err);
      return null;
    }
  }
  
  // Save user-specific credentials for a service
  saveUserCredentials(userId, service, data) {
    try {
      const stmt = this.db.prepare('INSERT OR REPLACE INTO user_credentials (userId, service, data) VALUES (?, ?, ?)');
      
      stmt.run(userId, service, JSON.stringify(data));
      
      return true;
    } catch (err) {
      console.error(`Error saving user credentials for userId: ${userId}, service: ${service}`, err);
      return false;
    }
  }
  
  // Delete user-specific credentials for a service
  deleteUserCredentials(userId, service) {
    try {
      const result = this.db.prepare('DELETE FROM user_credentials WHERE userId = ? AND service = ?').run(userId, service);
      
      return result.changes > 0;
    } catch (err) {
      console.error(`Error deleting user credentials for userId: ${userId}, service: ${service}`, err);
      return false;
    }
  }
  
  // Get all user-specific credentials for a user
  getAllUserCredentials(userId) {
    try {
      const credentials = {};
      const rows = this.db.prepare('SELECT service, data FROM user_credentials WHERE userId = ?').all(userId);
      
      for (const row of rows) {
        credentials[row.service] = JSON.parse(row.data);
      }
      
      return credentials;
    } catch (err) {
      console.error(`Error getting all user credentials for userId: ${userId}`, err);
      return {};
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

  // Sonarr library methods

  // Save Sonarr library data for a user
  saveSonarrLibrary(userId, data) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO sonarr_libraries (userId, data, lastUpdated)
        VALUES (?, ?, ?)
      `);
      
      stmt.run(
        userId,
        JSON.stringify(data),
        new Date().toISOString()
      );
      
      console.log(`Saved Sonarr library for user: ${userId} (${data.length} items)`);
      return true;
    } catch (err) {
      console.error(`Error saving Sonarr library for user: ${userId}`, err);
      return false;
    }
  }

  // Get Sonarr library data for a user
  getSonarrLibrary(userId) {
    try {
      const row = this.db.prepare('SELECT data, lastUpdated FROM sonarr_libraries WHERE userId = ?').get(userId);
      
      if (!row) {
        return null;
      }
      
      const library = JSON.parse(row.data);
      console.log(`Retrieved Sonarr library for user: ${userId} (${library.length} items, last updated: ${row.lastUpdated})`);
      return library;
    } catch (err) {
      console.error(`Error getting Sonarr library for user: ${userId}`, err);
      return null;
    }
  }

  // Radarr library methods

  // Save Radarr library data for a user
  saveRadarrLibrary(userId, data) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO radarr_libraries (userId, data, lastUpdated)
        VALUES (?, ?, ?)
      `);
      
      stmt.run(
        userId,
        JSON.stringify(data),
        new Date().toISOString()
      );
      
      console.log(`Saved Radarr library for user: ${userId} (${data.length} items)`);
      return true;
    } catch (err) {
      console.error(`Error saving Radarr library for user: ${userId}`, err);
      return false;
    }
  }

  // Get Radarr library data for a user
  getRadarrLibrary(userId) {
    try {
      const row = this.db.prepare('SELECT data, lastUpdated FROM radarr_libraries WHERE userId = ?').get(userId);
      
      if (!row) {
        return null;
      }
      
      const library = JSON.parse(row.data);
      console.log(`Retrieved Radarr library for user: ${userId} (${library.length} items, last updated: ${row.lastUpdated})`);
      return library;
    } catch (err) {
      console.error(`Error getting Radarr library for user: ${userId}`, err);
      return null;
    }
  }
  
  // Update a specific user setting directly in the database column
  updateUserSetting(userId, settingName, value) {
    try {
      console.log(`Updating user setting ${settingName} to ${value} for userId: ${userId}`);
      
      // Validate that this is a valid column name to prevent SQL injection
      const validColumnNames = [
        'lastPlexHistoryRefresh',
        'lastJellyfinHistoryRefresh',
        'lastTautulliHistoryRefresh',
        'lastTraktHistoryRefresh'
      ];
      
      if (!validColumnNames.includes(settingName)) {
        console.error(`Invalid setting name: ${settingName}`);
        return false;
      }
      
      // For timestamp values, ensure they are properly formatted as strings
      let processedValue = value;
      if (value !== null && typeof value === 'string' && value.includes('T')) {
        // This looks like an ISO date string, make sure it's properly formatted
        try {
          // Try to create a date object and convert back to ISO string to ensure valid format
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            processedValue = date.toISOString();
            console.log(`Converted timestamp to ISO format: ${processedValue}`);
          }
        } catch (e) {
          console.log('Failed to parse date string, using as-is');
        }
      }
      
      // Create a dynamic SQL query with the column name
      // This is safe because we've validated the column name against a whitelist
      const sql = `UPDATE user_data SET ${settingName} = ? WHERE userId = ?`;
      
      // Execute the query
      const result = this.db.prepare(sql).run(processedValue, userId);
      
      // Also update the settings JSON column for backward compatibility
      const userData = this.getUserData(userId);
      if (userData && userData.settings) {
        userData.settings[settingName] = processedValue;
        const settingsJson = JSON.stringify(userData.settings);
        this.db.prepare('UPDATE user_data SET settings = ? WHERE userId = ?').run(settingsJson, userId);
      }
      
      console.log(`Updated ${settingName} for userId: ${userId}, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (err) {
      console.error(`Error updating user setting ${settingName} for userId: ${userId}:`, err);
      return false;
    }
  }
}

module.exports = new DatabaseService();
