const path = require('path');
const Database = require('better-sqlite3');
const databaseService = require('./databaseService');

// Database file location
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'reccommendarr.db');

async function migrateSettingsToColumns() {
  console.log('Starting migration of settings from JSON to individual columns...');
  
  try {
    // Ensure database service is initialized
    if (!databaseService.initialized) {
      await databaseService.init();
    }
    
    const db = new Database(DB_FILE);
    
    // Add individual settings columns if they don't exist
    console.log('Adding individual settings columns to user_data table...');
    
    // Define the columns to add with their default values
    const columnsToAdd = [
      // Basic UI settings
      { name: 'numRecommendations', type: 'INTEGER', default: 6 },
      { name: 'columnsCount', type: 'INTEGER', default: 3 },
      { name: 'historyColumnsCount', type: 'INTEGER', default: 3 },
      { name: 'darkTheme', type: 'INTEGER', default: 0 },
      
      // History display settings
      { name: 'historyHideExisting', type: 'INTEGER', default: 1 },
      { name: 'historyHideLiked', type: 'INTEGER', default: 0 },
      { name: 'historyHideDisliked', type: 'INTEGER', default: 0 },
      { name: 'historyHideHidden', type: 'INTEGER', default: 1 },
      
      // Content preferences
      { name: 'contentTypePreference', type: 'TEXT', default: "'tv'" },
      { name: 'isMovieMode', type: 'INTEGER', default: 0 },
      { name: 'tvGenrePreferences', type: 'TEXT', default: "'[]'" },
      { name: 'tvCustomVibe', type: 'TEXT', default: "''" },
      { name: 'tvLanguagePreference', type: 'TEXT', default: "'en'" },
      { name: 'movieGenrePreferences', type: 'TEXT', default: "'[]'" },
      { name: 'movieCustomVibe', type: 'TEXT', default: "''" },
      { name: 'movieLanguagePreference', type: 'TEXT', default: "'en'" },
      
      // Library settings
      { name: 'useSampledLibrary', type: 'INTEGER', default: 0 },
      { name: 'librarySampleSize', type: 'INTEGER', default: 100 },
      
      // Plex-specific settings
      { name: 'selectedPlexUserId', type: 'TEXT', default: "''" },
      { name: 'plexRecentLimit', type: 'INTEGER', default: 6500 },
      { name: 'plexHistoryMode', type: 'TEXT', default: "'recent'" },
      { name: 'plexCustomHistoryDays', type: 'INTEGER', default: 30 },
      { name: 'plexOnlyMode', type: 'INTEGER', default: 0 },
      
      // Jellyfin-specific settings
      { name: 'selectedJellyfinUserId', type: 'TEXT', default: "''" },
      { name: 'jellyfinRecentLimit', type: 'INTEGER', default: 100 },
      { name: 'jellyfinHistoryMode', type: 'TEXT', default: "'all'" },
      { name: 'jellyfinOnlyMode', type: 'INTEGER', default: 0 },
      
      // Tautulli-specific settings
      { name: 'selectedTautulliUserId', type: 'TEXT', default: "''" },
      { name: 'tautulliRecentLimit', type: 'INTEGER', default: 50 },
      { name: 'tautulliHistoryMode', type: 'TEXT', default: "'all'" },
      { name: 'tautulliOnlyMode', type: 'INTEGER', default: 0 },
      
      // Trakt-specific settings
      { name: 'traktRecentLimit', type: 'INTEGER', default: 50 },
      { name: 'traktHistoryMode', type: 'TEXT', default: "'all'" },
      { name: 'traktOnlyMode', type: 'INTEGER', default: 0 },
      
      // Watch history
      { name: 'watchHistoryMovies', type: 'TEXT', default: "'[]'" },
      { name: 'watchHistoryShows', type: 'TEXT', default: "'[]'" },
      
      // Service-specific watch history
      { name: 'jellyfinWatchHistoryMovies', type: 'TEXT', default: "'[]'" },
      { name: 'jellyfinWatchHistoryShows', type: 'TEXT', default: "'[]'" },
      { name: 'tautulliWatchHistoryMovies', type: 'TEXT', default: "'[]'" },
      { name: 'tautulliWatchHistoryShows', type: 'TEXT', default: "'[]'" },
      { name: 'traktWatchHistoryMovies', type: 'TEXT', default: "'[]'" },
      { name: 'traktWatchHistoryShows', type: 'TEXT', default: "'[]'" },
      
      // General preferences
      { name: 'genrePreferences', type: 'TEXT', default: "'[]'" },
      { name: 'languagePreference', type: 'TEXT', default: "'en'" },
      
      // AI model settings
      { name: 'openaiModel', type: 'TEXT', default: "'google/gemini-2.0-flash-exp:free'" },
      
      // Recommendation history
      { name: 'previousTVRecommendations', type: 'TEXT', default: "'[]'" },
      { name: 'currentTVRecommendations', type: 'TEXT', default: "'[]'" },
      
      // Migration flags
      { name: 'fullDatabaseStorageMigrationComplete', type: 'INTEGER', default: 0 }
    ];
    
    // Check if the columns already exist
    const tableInfo = db.prepare("PRAGMA table_info(user_data)").all();
    const existingColumns = tableInfo.map(col => col.name);
    
    // Add each column if it doesn't exist
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        const sql = `ALTER TABLE user_data ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}`;
        db.exec(sql);
        console.log(`Added column ${column.name} to user_data table`);
      } else {
        console.log(`Column ${column.name} already exists in user_data table`);
      }
    }
    
    // Migrate data from settings JSON to individual columns
    console.log('Migrating data from settings JSON to individual columns...');
    
    // Get all users with settings
    const users = db.prepare('SELECT userId, settings FROM user_data').all();
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        // Parse settings JSON
        const settings = JSON.parse(user.settings || '{}');
        
        // Skip if already migrated
        if (settings.fullDatabaseStorageMigrationComplete) {
          console.log(`Settings for userId ${user.userId} already migrated, skipping`);
          continue;
        }
        
        // Update individual columns
        const stmt = db.prepare(`
          UPDATE user_data SET
            numRecommendations = ?,
            columnsCount = ?,
            historyColumnsCount = ?,
            darkTheme = ?,
            historyHideExisting = ?,
            historyHideLiked = ?,
            historyHideDisliked = ?,
            historyHideHidden = ?,
            contentTypePreference = ?,
            isMovieMode = ?,
            tvGenrePreferences = ?,
            tvCustomVibe = ?,
            tvLanguagePreference = ?,
            movieGenrePreferences = ?,
            movieCustomVibe = ?,
            movieLanguagePreference = ?,
            useSampledLibrary = ?,
            librarySampleSize = ?,
            selectedPlexUserId = ?,
            plexRecentLimit = ?,
            plexHistoryMode = ?,
            plexCustomHistoryDays = ?,
            plexOnlyMode = ?,
            selectedJellyfinUserId = ?,
            jellyfinRecentLimit = ?,
            jellyfinHistoryMode = ?,
            jellyfinOnlyMode = ?,
            selectedTautulliUserId = ?,
            tautulliRecentLimit = ?,
            tautulliHistoryMode = ?,
            tautulliOnlyMode = ?,
            traktRecentLimit = ?,
            traktHistoryMode = ?,
            traktOnlyMode = ?,
            watchHistoryMovies = ?,
            watchHistoryShows = ?,
            jellyfinWatchHistoryMovies = ?,
            jellyfinWatchHistoryShows = ?,
            tautulliWatchHistoryMovies = ?,
            tautulliWatchHistoryShows = ?,
            traktWatchHistoryMovies = ?,
            traktWatchHistoryShows = ?,
            genrePreferences = ?,
            languagePreference = ?,
            openaiModel = ?,
            previousTVRecommendations = ?,
            currentTVRecommendations = ?,
            fullDatabaseStorageMigrationComplete = 1
          WHERE userId = ?
        `);
        
        stmt.run(
          settings.numRecommendations || 6,
          settings.columnsCount || 3,
          settings.historyColumnsCount || 3,
          settings.darkTheme ? 1 : 0,
          settings.historyHideExisting ? 1 : 0,
          settings.historyHideLiked ? 1 : 0,
          settings.historyHideDisliked ? 1 : 0,
          settings.historyHideHidden ? 1 : 0,
          settings.contentTypePreference || 'tv',
          settings.isMovieMode ? 1 : 0,
          JSON.stringify(settings.tvGenrePreferences || []),
          settings.tvCustomVibe || '',
          settings.tvLanguagePreference || 'en',
          JSON.stringify(settings.movieGenrePreferences || []),
          settings.movieCustomVibe || '',
          settings.movieLanguagePreference || 'en',
          settings.useSampledLibrary ? 1 : 0,
          settings.librarySampleSize || 100,
          settings.selectedPlexUserId || '',
          settings.plexRecentLimit || 6500,
          settings.plexHistoryMode || 'recent',
          settings.plexCustomHistoryDays || 30,
          settings.plexOnlyMode ? 1 : 0,
          settings.selectedJellyfinUserId || '',
          settings.jellyfinRecentLimit || 100,
          settings.jellyfinHistoryMode || 'all',
          settings.jellyfinOnlyMode ? 1 : 0,
          settings.selectedTautulliUserId || '',
          settings.tautulliRecentLimit || 50,
          settings.tautulliHistoryMode || 'all',
          settings.tautulliOnlyMode ? 1 : 0,
          settings.traktRecentLimit || 50,
          settings.traktHistoryMode || 'all',
          settings.traktOnlyMode ? 1 : 0,
          JSON.stringify(settings.watchHistoryMovies || []),
          JSON.stringify(settings.watchHistoryShows || []),
          JSON.stringify(settings.jellyfinWatchHistoryMovies || []),
          JSON.stringify(settings.jellyfinWatchHistoryShows || []),
          JSON.stringify(settings.tautulliWatchHistoryMovies || []),
          JSON.stringify(settings.tautulliWatchHistoryShows || []),
          JSON.stringify(settings.traktWatchHistoryMovies || []),
          JSON.stringify(settings.traktWatchHistoryShows || []),
          JSON.stringify(settings.genrePreferences || []),
          settings.languagePreference || 'en',
          settings.openaiModel || 'google/gemini-2.0-flash-exp:free',
          JSON.stringify(settings.previousTVRecommendations || []),
          JSON.stringify(settings.currentTVRecommendations || []),
          user.userId
        );
        
        migratedCount++;
        console.log(`Migrated settings for userId: ${user.userId}`);
      } catch (error) {
        errorCount++;
        console.error(`Error migrating settings for userId: ${user.userId}`, error);
      }
    }
    
    console.log(`Settings migration complete: ${migratedCount} migrated, ${errorCount} errors`);
    
    // Close the database connection
    db.close();
    
    return { migratedCount, errorCount };
  } catch (err) {
    console.error('Error migrating settings to columns:', err);
    throw err;
  }
}

// Export the migration function
module.exports = migrateSettingsToColumns;

// If this script is run directly, execute the migration
if (require.main === module) {
  migrateSettingsToColumns()
    .then(result => {
      console.log('Migration completed successfully:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
