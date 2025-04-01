<template>
  <div class="app-container">
    <!-- Check if this is a Trakt callback and show the callback handler if it is -->
    <TraktCallback v-if="isTraktCallback" />
    
    <!-- Show login screen if user is not authenticated -->
    <Login v-else-if="!isAuthenticated" @authenticated="handleAuthenticated" />
    
    <!-- Show loading indicator while data is being loaded -->
    <div v-else-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading your preferences...</p>
    </div>
    
    <!-- Regular app content if user is authenticated, not loading, and it's not a callback URL -->
    <template v-else>
      <header class="app-header">
        <div class="header-content">
          <div class="header-brand">
            <img alt="App logo" src="./assets/logo.png" class="logo">
            <h1>Recommendarr</h1>
          </div>
        </div>
      </header>
      
      <main>
      <!-- Always show app navigation -->
      <AppNavigation 
        :activeTab="activeTab" 
        :username="username"
        @navigate="handleNavigate"
        @logout="handleLogout"
        @clearData="handleClearData" 
      />
      
      <!-- Content area -->
      <div class="content">
        <transition name="fade" mode="out-in">
          <!-- Service selection -->
          <div v-if="!loadingServices &&!hasAnyServiceCredentials && !hasAnyServiceConnected() && activeTab !== 'settings'" key="service-selection">
            <p class="choose-service">Choose a service to connect to:</p>
            <div class="service-buttons">
              <button class="service-button" @click="showSonarrConnect = true">
                Connect to Sonarr
                <small>For TV recommendations</small>
              </button>
              <button class="service-button" @click="showRadarrConnect = true">
                Connect to Radarr
                <small>For movie recommendations</small>
              </button>
              <button class="service-button plex-button" @click="showPlexConnect = true">
                Connect to Plex
                <small>For watch history integration</small>
              </button>
              <button class="service-button jellyfin-button" @click="showJellyfinConnect = true">
                Connect to Jellyfin
                <small>For watch history integration</small>
              </button>
              <button class="service-button tautulli-button" @click="showTautulliConnect = true">
                Connect to Tautulli
                <small>For Plex watch history statistics</small>
              </button>
              <button class="service-button trakt-button" @click="showTraktConnect = true">
                Connect to Trakt
                <small>For Trakt watch history integration</small>
              </button>
            </div>
          </div>
        </transition>
      
      <!-- User Selection Modal for Jellyfin -->
      <div v-if="showJellyfinUserSelect && jellyfinConnected" class="modal-overlay">
        <div class="jellyfin-user-modal">
          <div class="modal-header">
            <h4>Select Jellyfin User</h4>
            <button class="close-button" @click="closeJellyfinUserSelect">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="jellyfinUsersLoading" class="loading-users">
              <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading...</span>
              </div>
              <p>Loading users...</p>
            </div>
            <div v-else-if="jellyfinUsers.length === 0" class="no-users-found">
              <p>No users found. Please check your API key permissions.</p>
            </div>
            <div v-else class="users-list">
              <button 
                v-for="user in jellyfinUsers" 
                :key="user.id"
                class="user-item"
                :class="{ 'selected': user.id === selectedJellyfinUserId }"
                @click="selectJellyfinUser(user)"
              >
                <span class="user-name">{{ user.name }}</span>
                <span v-if="user.isAdministrator" class="user-badge admin">Admin</span>
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-button" @click="closeJellyfinUserSelect">Cancel</button>
            <button 
              class="apply-button" 
              @click="applyJellyfinUserSelection"
              :disabled="!selectedJellyfinUserId"
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>
      
      <!-- User Selection Modal for Tautulli -->
      <div v-if="showTautulliUserSelect && tautulliConnected" class="modal-overlay">
        <div class="tautulli-user-modal">
          <div class="modal-header">
            <h4>Select Tautulli User</h4>
            <button class="close-button" @click="closeTautulliUserSelect">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="tautulliUsersLoading" class="loading-users">
              <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading...</span>
              </div>
              <p>Loading users...</p>
            </div>
            <div v-else-if="tautulliUsers.length === 0" class="no-users-found">
              <p>No users found. Please check your API key permissions.</p>
            </div>
            <div v-else class="users-list">
              <button 
                v-for="user in tautulliUsers" 
                :key="user.user_id"
                class="user-item"
                :class="{ 'selected': user.user_id === selectedTautulliUserId }"
                @click="selectTautulliUser(user)"
              >
                <span class="user-name">{{ user.username }}</span>
                <span v-if="user.is_admin" class="user-badge admin">Admin</span>
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-button" @click="closeTautulliUserSelect">Cancel</button>
            <button 
              class="apply-button" 
              @click="applyTautulliUserSelection"
              :disabled="!selectedTautulliUserId"
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>
      
      <!-- User Selection Modal for Plex -->
      <div v-if="showPlexUserSelect && plexConnected" class="modal-overlay">
        <div class="plex-user-modal">
          <div class="modal-header">
            <h4>Select Plex User</h4>
            <button class="close-button" @click="closePlexUserSelect">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="plexUsersLoading" class="loading-users">
              <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading...</span>
              </div>
              <p>Loading users...</p>
            </div>
            <div v-else-if="plexUsers.length === 0" class="no-users-found">
              <p>No users found. Please check your API token permissions.</p>
            </div>
            <div v-else class="users-list">
              <button 
                v-for="user in plexUsers" 
                :key="user.id"
                class="user-item"
                :class="{ 'selected': user.id === selectedPlexUserId }"
                @click="selectPlexUser(user)"
              >
                <span class="user-name">{{ user.name }}</span>
                <span v-if="user.isAdmin" class="user-badge admin">Admin</span>
                <span v-if="user.isOwner" class="user-badge owner">Owner</span>
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-button" @click="closePlexUserSelect">Cancel</button>
            <button 
              class="apply-button" 
              @click="applyPlexUserSelection"
              :disabled="!selectedPlexUserId"
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>
      
      <SonarrConnection v-if="showSonarrConnect && !sonarrConnected" @connected="handleSonarrConnected" @disconnected="handleSonarrDisconnected" />
      <RadarrConnection v-if="showRadarrConnect && !radarrConnected" @connected="handleRadarrConnected" @disconnected="handleRadarrDisconnected" />
      <PlexConnection v-if="showPlexConnect && !plexConnected" @connected="handlePlexConnected" @disconnected="handlePlexDisconnected" @limitChanged="handlePlexLimitChanged" />
      <JellyfinConnection v-if="showJellyfinConnect && !jellyfinConnected" @connected="handleJellyfinConnected" @disconnected="handleJellyfinDisconnected" @limitChanged="handleJellyfinLimitChanged" />
      <TautulliConnection v-if="showTautulliConnect && !tautulliConnected" @connected="handleTautulliConnected" @disconnected="handleTautulliDisconnected" @limitChanged="handleTautulliLimitChanged" />
      <TraktConnection v-if="showTraktConnect && !traktConnected" @connected="handleTraktConnected" @disconnected="handleTraktDisconnected" @limitChanged="handleTraktLimitChanged" />
      
        <!-- Main components rendered based on activeTab -->
        <RequestRecommendations 
          v-if="activeTab === 'tv-recommendations'" 
          :series="series"
          :sonarrConfigured="sonarrConnected"
          :recentlyWatchedShows="recentlyWatchedShows"
          :jellyfinRecentlyWatchedShows="jellyfinRecentlyWatchedShows"
          :tautulliRecentlyWatchedShows="tautulliRecentlyWatchedShows"
          :traktRecentlyWatchedShows="traktRecentlyWatchedShows"
          :plexConfigured="plexConnected"
          :jellyfinConfigured="jellyfinConnected"
          :tautulliConfigured="tautulliConnected"
          :traktConfigured="traktConnected"
          @navigate="handleNavigate" 
          @plexHistoryModeChanged="handlePlexHistoryModeChanged"
          @plexOnlyModeChanged="handlePlexOnlyModeChanged"
          @jellyfinHistoryModeChanged="handleJellyfinHistoryModeChanged"
          @jellyfinOnlyModeChanged="handleJellyfinOnlyModeChanged"
          @tautulliHistoryModeChanged="handleTautulliHistoryModeChanged"
          @tautulliOnlyModeChanged="handleTautulliOnlyModeChanged"
          @traktHistoryModeChanged="handleTraktHistoryModeChanged"
          @traktOnlyModeChanged="handleTraktOnlyModeChanged"
          @refreshTraktHistory="fetchTraktData"
          @openJellyfinUserSelect="openJellyfinUserSelect"
          @openTautulliUserSelect="openTautulliUserSelect"
          @openPlexUserSelect="openPlexUserSelect"
        />
        
        <RequestRecommendations 
          v-if="activeTab === 'movie-recommendations'" 
          :initialMovieMode="true"
          :series="series"
          :movies="movies"
          :sonarrConfigured="sonarrConnected"
          :radarrConfigured="radarrConnected"
          :recentlyWatchedShows="recentlyWatchedShows"
          :recentlyWatchedMovies="recentlyWatchedMovies"
          :jellyfinRecentlyWatchedShows="jellyfinRecentlyWatchedShows"
          :jellyfinRecentlyWatchedMovies="jellyfinRecentlyWatchedMovies"
          :tautulliRecentlyWatchedShows="tautulliRecentlyWatchedShows"
          :tautulliRecentlyWatchedMovies="tautulliRecentlyWatchedMovies"
          :traktRecentlyWatchedShows="traktRecentlyWatchedShows"
          :traktRecentlyWatchedMovies="traktRecentlyWatchedMovies"
          :plexConfigured="plexConnected"
          :jellyfinConfigured="jellyfinConnected"
          :tautulliConfigured="tautulliConnected"
          :traktConfigured="traktConnected"
          @navigate="handleNavigate" 
          @plexHistoryModeChanged="handlePlexHistoryModeChanged"
          @plexOnlyModeChanged="handlePlexOnlyModeChanged"
          @jellyfinHistoryModeChanged="handleJellyfinHistoryModeChanged"
          @jellyfinOnlyModeChanged="handleJellyfinOnlyModeChanged"
          @tautulliHistoryModeChanged="handleTautulliHistoryModeChanged"
          @tautulliOnlyModeChanged="handleTautulliOnlyModeChanged"
          @traktHistoryModeChanged="handleTraktHistoryModeChanged"
          @traktOnlyModeChanged="handleTraktOnlyModeChanged"
          @refreshTraktHistory="fetchTraktData"
          @openJellyfinUserSelect="openJellyfinUserSelect"
          @openTautulliUserSelect="openTautulliUserSelect"
          @openPlexUserSelect="openPlexUserSelect"
        />
        
        <History
          v-if="activeTab === 'history'"
          :sonarrConfigured="sonarrConnected"
          :radarrConfigured="radarrConnected"
        />
        
        <AISettings
          v-if="activeTab === 'settings'"
          :sonarrConnected="sonarrConnected"
          :radarrConnected="radarrConnected"
          :plexConnected="plexConnected"
          :jellyfinConnected="jellyfinConnected"
          :tautulliConnected="tautulliConnected"
          :traktConnected="traktConnected"
          :defaultActiveTab="aiSettingsSubtab"
          @settings-updated="handleSettingsUpdated"
          @sonarr-settings-updated="handleSonarrSettingsUpdated"
          @radarr-settings-updated="handleRadarrSettingsUpdated"
          @plex-settings-updated="handlePlexSettingsUpdated"
          @jellyfin-settings-updated="handleJellyfinSettingsUpdated"
          @tautulli-settings-updated="handleTautulliSettingsUpdated"
        />
      </div> <!-- End content div -->
    </main>
    </template>
  </div>
</template>

<script>
import SonarrConnection from './components/SonarrConnection.vue'
import RadarrConnection from './components/RadarrConnection.vue'
import PlexConnection from './components/PlexConnection.vue'
import JellyfinConnection from './components/JellyfinConnection.vue'
import TautulliConnection from './components/TautulliConnection.vue'
import TraktConnection from './components/TraktConnection.vue'
import TraktCallback from './components/TraktCallback.vue'
import AppNavigation from './components/Navigation.vue'
import RequestRecommendations from './components/RequestRecommendations.vue'
import History from './components/History.vue'
import AISettings from './components/AISettings.vue'
import LoginForm from './components/Login.vue'
import sonarrService from './services/SonarrService'
import radarrService from './services/RadarrService'
import plexService from './services/PlexService'
import jellyfinService from './services/JellyfinService'
import tautulliService from './services/TautulliService'
import traktService from './services/TraktService'
import credentialsService from './services/CredentialsService'
import apiService from './services/ApiService'
import authService from './services/AuthService'
import openAIService from './services/OpenAIService'
import databaseStorageUtils from './utils/DatabaseStorageUtils'

export default {
  name: 'App',
  components: {
    SonarrConnection,
    RadarrConnection,
    PlexConnection,
    JellyfinConnection,
    TautulliConnection,
    TraktConnection,
    TraktCallback,
    AppNavigation,
    RequestRecommendations,
    History,
    AISettings,
    Login: LoginForm
  },
  data() {
    return {
      isTraktCallback: window.location.pathname === '/trakt-callback',
      isAuthenticated: authService.isAuthenticated(),
      isLoading: true, // Add loading state
      sonarrConnected: false,
      radarrConnected: false,
      plexConnected: false,
      jellyfinConnected: false,
      tautulliConnected: false,
      traktConnected: false,
      loadingServices: true,
      hasAnyServiceCredentials: false,
      aiSettingsSubtab: 'account',
      traktRecentlyWatchedMovies: [],
      traktRecentlyWatchedShows: [],
      traktRecentLimit: 50, // Will be updated from TraktService when credentials are loaded
      traktHistoryMode: 'all',
      traktOnlyMode: false,
      showSonarrConnect: false,
      showRadarrConnect: false,
      showPlexConnect: false,
      showJellyfinConnect: false,
      showTautulliConnect: false,
      showTraktConnect: false,
      showJellyfinUserSelect: false,
      showTautulliUserSelect: false,
      showPlexUserSelect: false,
      jellyfinUsers: [],
      jellyfinUsersLoading: false,
      tautulliUsers: [],
      tautulliUsersLoading: false,
      plexUsers: [],
      plexUsersLoading: false,
      selectedJellyfinUserId: '',
      selectedTautulliUserId: '',
      selectedPlexUserId: '',
      activeTab: 'tv-recommendations',
      series: [],
      movies: [],
      recentlyWatchedMovies: [],
      recentlyWatchedShows: [],
      jellyfinRecentlyWatchedMovies: [],
      jellyfinRecentlyWatchedShows: [],
      tautulliRecentlyWatchedMovies: [],
      tautulliRecentlyWatchedShows: [],
      plexRecentLimit: 100,
      jellyfinRecentLimit: 100,
      tautulliRecentLimit: 50,
      plexHistoryMode: 'all', // 'all' or 'recent'
      jellyfinHistoryMode: 'all', // 'all' or 'recent'
      tautulliHistoryMode: 'all', // 'all' or 'recent'
      plexOnlyMode: false, // Whether to use only Plex history for recommendations
      jellyfinOnlyMode: false, // Whether to use only Jellyfin history for recommendations
      tautulliOnlyMode: false // Whether to use only Tautulli history for recommendations
    }
  },
  async created() {
    // If this is a Trakt callback URL, we only need to show the callback component
    if (this.isTraktCallback) {
      this.isLoading = false;
      return; // No need to do the other initializations yet
    }
    
    console.log('App created, isAuthenticated:', this.isAuthenticated);
    
    // Setup API with auth token if available
    if (this.isAuthenticated) {
      console.log('User is authenticated, setting auth header and loading data...');
      
      // Set auth header for all API requests
      authService.setAuthHeader();
      
      // Verify that auth header is set correctly
      console.log('Initialized API with authentication');
      
      try {
        // Load database cache first - this will get all settings at once
        console.log('Loading database cache...');
        const cacheResult = await databaseStorageUtils.loadCache();
        if (!cacheResult) {
          console.warn('Database cache loading failed or timed out, proceeding with empty cache');
        } else {
          console.log('Database cache loaded successfully');
        }
        
        // Run these operations in parallel for better performance
        await Promise.all([
          // Check if services have credentials stored server-side
          this.checkStoredCredentials().catch(err => {
            console.error('Error checking stored credentials:', err);
            return false;
          }),
          
          // Load settings from the cache
          this.loadLocalSettings().catch(err => {
            console.error('Error loading local settings:', err);
            return false;
          }),
          
          // Load cached watch history from database
          this.loadCachedWatchHistory().catch(err => {
            console.error('Error loading cached watch history:', err);
            return false;
          })
        ]);
        
        // Sync selectedUserId from services
        this.selectedPlexUserId = plexService.selectedUserId;
        
        // For Jellyfin, get from cache, then fall back to service
        const savedJellyfinUserId = await databaseStorageUtils.get('selectedJellyfinUserId');
        if (savedJellyfinUserId) {
          this.selectedJellyfinUserId = savedJellyfinUserId;
          console.log(`Loaded Jellyfin user ID from database: ${savedJellyfinUserId}`);
        } else {
          this.selectedJellyfinUserId = jellyfinService.userId;
        }
        
        // For Tautulli, get from cache
        const savedTautulliUserId = await databaseStorageUtils.get('selectedTautulliUserId');
        if (savedTautulliUserId) {
          this.selectedTautulliUserId = savedTautulliUserId;
          console.log(`Loaded Tautulli user ID from database: ${savedTautulliUserId}`);
        }

        // After connections are established, fetch and store watch history
        if (this.plexConnected || this.jellyfinConnected || this.tautulliConnected || this.traktConnected) {
          await this.fetchAndStoreWatchHistory();
        }
      } catch (error) {
        console.error('Error loading data after authentication:', error);
        
        // If we get unauthorized error, the token might be invalid
        if (error.response && error.response.status === 401) {
          console.log('Authentication token is invalid, logging out...');
          this.isAuthenticated = false;
          await authService.logout();
        }
      } finally {
        // Mark loading as complete
        this.isLoading = false;
      }
    } else {
      console.log('User is not authenticated, showing login form');
      this.isLoading = false;
    }
  },

  methods: {
    // Helper method to check if any service is connected
    hasAnyServiceConnected() {
      return this.sonarrConnected || 
             this.radarrConnected || 
             this.plexConnected || 
             this.jellyfinConnected || 
             this.tautulliConnected || 
             this.traktConnected;
    },
    
    // Handle clearing all data except user auth
    async handleClearData() {
      console.log("User clicked clear data...");
      
      // Ask for another confirmation
      if (!confirm('This will remove all your service connections and data, but keep your username and password. Continue?')) {
        return;
      }
      
      try {
        // Reset server-side data
        const success = await credentialsService.resetUserData();
        if (success) {
          console.log("Server-side data cleared successfully");
        } else {
          console.error("Failed to clear server-side data");
        }
      } catch (error) {
        console.error("Error clearing server-side data:", error);
      }
      
      // We're preserving database settings on logout
      console.log('Database settings preserved for next login');
      
      // Reset service configurations
      sonarrService.configure('', '');
      radarrService.configure('', '');
      plexService.configure('', '');
      jellyfinService.configure('', '', '');
      tautulliService.configure('', '');
      
      // Reset UI state
      this.sonarrConnected = false;
      this.radarrConnected = false;
      this.plexConnected = false;
      this.jellyfinConnected = false;
      this.tautulliConnected = false;
      this.traktConnected = false;
      this.series = [];
      this.movies = [];
      this.recentlyWatchedMovies = [];
      this.recentlyWatchedShows = [];
      this.jellyfinRecentlyWatchedMovies = [];
      this.jellyfinRecentlyWatchedShows = [];
      this.tautulliRecentlyWatchedMovies = [];
      this.tautulliRecentlyWatchedShows = [];
      this.traktRecentlyWatchedMovies = [];
      this.traktRecentlyWatchedShows = [];
      this.plexRecentLimit = 100;
      this.jellyfinRecentLimit = 100;
      this.tautulliRecentLimit = 50;
      this.traktRecentLimit = 50;
      this.plexHistoryMode = 'all';
      this.jellyfinHistoryMode = 'all';
      this.tautulliHistoryMode = 'all';
      this.traktHistoryMode = 'all';
      this.plexOnlyMode = false;
      this.jellyfinOnlyMode = false;
      this.tautulliOnlyMode = false;
      this.traktOnlyMode = false;
      this.showSonarrConnect = false;
      this.showRadarrConnect = false;
      this.showPlexConnect = false;
      this.showJellyfinConnect = false;
      this.showTautulliConnect = false;
      this.showTraktConnect = false;
      this.activeTab = 'tv-recommendations';
      
      alert('All service data has been cleared. Your login credentials are preserved.');
    },
    
    // Fetch AI models to prepare for recommendations
    async fetchAIModels(retry = true) {
      try {
        console.log('Attempting to fetch AI models...');
        // Check if OpenAI service is configured first
        if (openAIService.isConfigured()) {
          console.log('OpenAI service is configured, fetching models...');
          try {
            const models = await openAIService.fetchModels();
            console.log(`Successfully fetched ${models.length} AI models`);
            return true; // Success
          } catch (fetchError) {
            console.error('Error during initial fetch of AI models:', fetchError);
            if (retry) {
              console.log('Will retry fetching models after a short delay...');
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1500));
              return this.fetchAIModels(false); // Retry once
            }
            throw fetchError; // Re-throw if already retried
          }
        } else {
          console.log('OpenAI service is not configured yet');
          // First try to load credentials with 2 retries
          const credentialsLoaded = await openAIService.loadCredentials(2, 1500);
          console.log('Credentials load result:', credentialsLoaded);
          
          // Check again after loading credentials
          if (openAIService.isConfigured()) {
            console.log('OpenAI service is now configured after loading credentials, fetching models...');
            try {
              const models = await openAIService.fetchModels();
              console.log(`Successfully fetched ${models.length} AI models`);
              return true; // Success
            } catch (fetchError) {
              console.error('Error during fetch after loading credentials:', fetchError);
              if (retry) {
                console.log('Will retry fetching models after a short delay...');
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1500));
                return this.fetchAIModels(false); // Retry once
              }
              throw fetchError; // Re-throw if already retried
            }
          } else {
            console.log('OpenAI service still not configured after loading credentials');
          }
        }
        return false; // Not configured
      } catch (error) {
        console.error('Error in fetchAIModels:', error);
        // Don't show error to user as this is a background task
        return false;
      }
    },
    
  // Handle successful authentication
  async handleAuthenticated() {
    console.log('User authenticated successfully');
    this.isAuthenticated = true;
    this.isLoading = true; // Set loading state while we fetch data
    
    // Set auth header for API requests
    authService.setAuthHeader();
    console.log('Auth header set after login');
    
    try {
      // Ensure database cache is loaded first
      console.log('Loading database cache after authentication...');
      const cacheResult = await databaseStorageUtils.loadCache();
      if (!cacheResult) {
        console.warn('Database cache loading failed or timed out after login, proceeding with empty cache');
      }
      
      // Start parallel tasks for efficiency
      const tasks = [];
      
      // Try to fetch AI models after login to check if OpenAI is configured
      console.log('Starting AI model fetch process...');
      tasks.push(this.fetchAIModels().catch(err => {
        console.error('Error fetching AI models:', err);
        return false;
      }));
      
      // Load stored credentials and other data
      console.log('Loading data after authentication...');
      tasks.push(this.checkStoredCredentials().catch(err => {
        console.error('Error checking stored credentials:', err);
        return false;
      }));
      
      // Wait for both tasks to complete
      await Promise.all(tasks);
      
      // Load settings from database
      await this.loadLocalSettings().catch(err => {
        console.error('Error loading local settings after login:', err);
      });

      // Load cached watch history
      await this.loadCachedWatchHistory().catch(err => {
        console.error('Error loading cached watch history after login:', err);
      });
      
      // Explicitly load genre and language preferences for both TV and movie modes
      try {
        console.log('Loading genre and language preferences for current user...');
        // Load TV genre preferences
        const tvGenres = await databaseStorageUtils.getJSON('tvGenrePreferences', []);
        console.log('Loaded TV genre preferences:', tvGenres);
        
        // Load movie genre preferences
        const movieGenres = await databaseStorageUtils.getJSON('movieGenrePreferences', []);
        console.log('Loaded movie genre preferences:', movieGenres);
        
        // Load universal language preference
        const languagePreference = await databaseStorageUtils.get('languagePreference', '');
        console.log('Loaded universal language preference:', languagePreference);
      } catch (prefError) {
        console.error('Error loading genre/language preferences:', prefError);
      }
      
      console.log('Data loaded successfully after authentication');
    } catch (error) {
      console.error('Error loading data after authentication:', error);
    } finally {
      this.isLoading = false; // Clear loading state
    }
  },
    
  // Load cached watch history from database
  async loadCachedWatchHistory() {
    try {
      console.log('Loading cached watch history from database...');
      
      // Ensure database cache is loaded
      if (!databaseStorageUtils.cacheLoaded) {
        console.log('Database cache not loaded, loading now...');
        await databaseStorageUtils.loadCache();
      }
      
      // Try to load movies watch history from database
      this.recentlyWatchedMovies = await databaseStorageUtils.getJSON('watchHistoryMovies', []);
      if (this.recentlyWatchedMovies.length > 0) {
        console.log(`Loaded ${this.recentlyWatchedMovies.length} movies from database cache`);
      } else {
        console.log('No movie watch history found in database cache');
      }
      
      // Try to load shows watch history from database
      this.recentlyWatchedShows = await databaseStorageUtils.getJSON('watchHistoryShows', []);
      if (this.recentlyWatchedShows.length > 0) {
        console.log(`Loaded ${this.recentlyWatchedShows.length} shows from database cache`);
      } else {
        console.log('No TV show watch history found in database cache');
      }

      // Try to load jellyfin history
      this.jellyfinRecentlyWatchedMovies = await databaseStorageUtils.getJSON('jellyfinWatchHistoryMovies', []);
      if (this.jellyfinRecentlyWatchedMovies.length > 0) {
        console.log(`Loaded ${this.jellyfinRecentlyWatchedMovies.length} Jellyfin movies from database cache`);
      }

      this.jellyfinRecentlyWatchedShows = await databaseStorageUtils.getJSON('jellyfinWatchHistoryShows', []);
      if (this.jellyfinRecentlyWatchedShows.length > 0) {
        console.log(`Loaded ${this.jellyfinRecentlyWatchedShows.length} Jellyfin shows from database cache`);
      }

      // Try to load tautulli history
      this.tautulliRecentlyWatchedMovies = await databaseStorageUtils.getJSON('tautulliWatchHistoryMovies', []);
      if (this.tautulliRecentlyWatchedMovies.length > 0) {
        console.log(`Loaded ${this.tautulliRecentlyWatchedMovies.length} Tautulli movies from database cache`);
      }

      this.tautulliRecentlyWatchedShows = await databaseStorageUtils.getJSON('tautulliWatchHistoryShows', []);
      if (this.tautulliRecentlyWatchedShows.length > 0) {
        console.log(`Loaded ${this.tautulliRecentlyWatchedShows.length} Tautulli shows from database cache`);
      }

      // Try to load trakt history
      this.traktRecentlyWatchedMovies = await databaseStorageUtils.getJSON('traktWatchHistoryMovies', []);
      if (this.traktRecentlyWatchedMovies.length > 0) {
        console.log(`Loaded ${this.traktRecentlyWatchedMovies.length} Trakt movies from database cache`);
      }

      this.traktRecentlyWatchedShows = await databaseStorageUtils.getJSON('traktWatchHistoryShows', []);
      if (this.traktRecentlyWatchedShows.length > 0) {
        console.log(`Loaded ${this.traktRecentlyWatchedShows.length} Trakt shows from database cache`);
      }

      // Also try to load from server if available
      await this.loadWatchHistoryFromServer();
      
      console.log('Finished loading cached watch history');
      return true;
    } catch (error) {
      console.error('Error loading cached watch history from database:', error);
      
      // Use empty arrays if database loading fails
      this.recentlyWatchedMovies = [];
      this.recentlyWatchedShows = [];
      this.jellyfinRecentlyWatchedMovies = [];
      this.jellyfinRecentlyWatchedShows = [];
      this.tautulliRecentlyWatchedMovies = [];
      this.tautulliRecentlyWatchedShows = [];
      this.traktRecentlyWatchedMovies = [];
      this.traktRecentlyWatchedShows = [];
      
      return false;
    }
  },

    // Load watch history from server
    async loadWatchHistoryFromServer() {
      try {
        // Load watch history from server
        const moviesHistory = await apiService.getWatchHistory('movies');
        const showsHistory = await apiService.getWatchHistory('shows');
        
        if (moviesHistory && moviesHistory.length > 0) {
          // Parse the service-specific watch history
          const plexMovies = moviesHistory.filter(item => item.source === 'plex');
          const jellyfinMovies = moviesHistory.filter(item => item.source === 'jellyfin');
          const tautulliMovies = moviesHistory.filter(item => item.source === 'tautulli');
          const traktMovies = moviesHistory.filter(item => item.source === 'trakt');
          
          if (plexMovies.length > 0) {
            this.recentlyWatchedMovies = plexMovies;
            console.log(`Loaded ${plexMovies.length} Plex movies from server`);
          }
          
          if (jellyfinMovies.length > 0) {
            this.jellyfinRecentlyWatchedMovies = jellyfinMovies;
            console.log(`Loaded ${jellyfinMovies.length} Jellyfin movies from server`);
          }
          
          if (tautulliMovies.length > 0) {
            this.tautulliRecentlyWatchedMovies = tautulliMovies;
            console.log(`Loaded ${tautulliMovies.length} Tautulli movies from server`);
          }
          
          if (traktMovies.length > 0) {
            this.traktRecentlyWatchedMovies = traktMovies;
            console.log(`Loaded ${traktMovies.length} Trakt movies from server`);
          }
        }
        
        if (showsHistory && showsHistory.length > 0) {
          // Parse the service-specific watch history
          const plexShows = showsHistory.filter(item => item.source === 'plex');
          const jellyfinShows = showsHistory.filter(item => item.source === 'jellyfin');
          const tautulliShows = showsHistory.filter(item => item.source === 'tautulli');
          const traktShows = showsHistory.filter(item => item.source === 'trakt');
          
          if (plexShows.length > 0) {
            this.recentlyWatchedShows = plexShows;
            console.log(`Loaded ${plexShows.length} Plex shows from server`);
          }
          
          if (jellyfinShows.length > 0) {
            this.jellyfinRecentlyWatchedShows = jellyfinShows;
            console.log(`Loaded ${jellyfinShows.length} Jellyfin shows from server`);
          }
          
          if (tautulliShows.length > 0) {
            this.tautulliRecentlyWatchedShows = tautulliShows;
            console.log(`Loaded ${tautulliShows.length} Tautulli shows from server`);
          }
          
          if (traktShows.length > 0) {
            this.traktRecentlyWatchedShows = traktShows;
            console.log(`Loaded ${traktShows.length} Trakt shows from server`);
          }
        }
      } catch (error) {
        console.error('Error loading watch history from server:', error);
      }
    },

    // Helper method to check if refresh is needed based on timestamp
    isRefreshNeeded(timestamp) {
      if (!timestamp) {
        console.log('No timestamp found, refresh needed');
        return true; // No timestamp, refresh needed
      }
      
      try {
        const lastRefresh = new Date(timestamp);
        const now = new Date();
        const hoursSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60);
        
        console.log(`Last refresh: ${lastRefresh.toISOString()}, hours since: ${hoursSinceRefresh.toFixed(2)}`);
        
        // Refresh if more than 24 hours have passed
        return hoursSinceRefresh >= 24;
      } catch (error) {
        console.error('Error parsing timestamp:', error);
        return true; // On error, refresh to be safe
      }
    },
    
    // Fetch watch history from all connected services and store it
    async fetchAndStoreWatchHistory() {
      console.log('Fetching watch history from all connected services...');
      const fetchPromises = [];

      // Fetch fresh settings from the server, including timestamp columns
      let serverSettings = {};
      try {
        serverSettings = await apiService.getSettings();
        console.log('Fetched server settings for refresh check:', serverSettings);
        
        // Log the timestamp values specifically for debugging
        console.log('Timestamp values from server settings:', {
          lastPlexHistoryRefresh: serverSettings.lastPlexHistoryRefresh,
          lastJellyfinHistoryRefresh: serverSettings.lastJellyfinHistoryRefresh,
          lastTautulliHistoryRefresh: serverSettings.lastTautulliHistoryRefresh,
          lastTraktHistoryRefresh: serverSettings.lastTraktHistoryRefresh
        });
      } catch (error) {
        console.error('Failed to fetch server settings for refresh check:', error);
        // Proceed with empty settings, which will force a refresh
      }

      // Plex
      if (this.plexConnected) {
        const plexRefreshNeeded = this.isRefreshNeeded(serverSettings.lastPlexHistoryRefresh);
        console.log(`Plex refresh needed: ${plexRefreshNeeded}`);

        if (plexRefreshNeeded) {
          fetchPromises.push(this.fetchPlexData().then(async () => {
            if (this.recentlyWatchedMovies && this.recentlyWatchedMovies.length > 0) {
              this.recentlyWatchedMovies.forEach(item => item.source = 'plex');
              await databaseStorageUtils.setJSON('watchHistoryMovies', this.recentlyWatchedMovies);
            }
            if (this.recentlyWatchedShows && this.recentlyWatchedShows.length > 0) {
              this.recentlyWatchedShows.forEach(item => item.source = 'plex');
              await databaseStorageUtils.setJSON('watchHistoryShows', this.recentlyWatchedShows);
            }
            
            // Update timestamp directly to database column
            const now = new Date().toISOString();
            // Save directly to database column instead of through settings object
            await apiService.post('/settings/lastPlexHistoryRefresh', { value: now }, { headers: { 'Content-Type': 'application/json' } });
            console.log(`Updated Plex history refresh timestamp: ${now}`);
          }));
        } else {
          console.log('Skipping Plex history refresh (less than 24 hours since last refresh)');
        }
      }

      // Jellyfin - Check both the connected flag AND if the service is configured
      if (this.jellyfinConnected || jellyfinService.isConfigured()) {
        // If service is configured but not marked as connected, try to set the flag
        if (!this.jellyfinConnected && jellyfinService.isConfigured()) {
          console.log('Jellyfin service is configured but not marked as connected. Setting connected flag.');
          this.jellyfinConnected = true;
        }

        const jellyfinRefreshNeeded = this.isRefreshNeeded(serverSettings.lastJellyfinHistoryRefresh);
        console.log(`Jellyfin refresh needed: ${jellyfinRefreshNeeded}`);

        if (jellyfinRefreshNeeded) {
          fetchPromises.push(this.fetchJellyfinData().then(async () => {
            if (this.jellyfinRecentlyWatchedMovies && this.jellyfinRecentlyWatchedMovies.length > 0) {
              this.jellyfinRecentlyWatchedMovies.forEach(item => item.source = 'jellyfin');
              await databaseStorageUtils.setJSON('jellyfinWatchHistoryMovies', this.jellyfinRecentlyWatchedMovies);
            }
            if (this.jellyfinRecentlyWatchedShows && this.jellyfinRecentlyWatchedShows.length > 0) {
              this.jellyfinRecentlyWatchedShows.forEach(item => item.source = 'jellyfin');
              await databaseStorageUtils.setJSON('jellyfinWatchHistoryShows', this.jellyfinRecentlyWatchedShows);
            }
            
            // Update timestamp directly to database column
            const now = new Date().toISOString();
            // Save directly to database column instead of through settings object
            await apiService.post('/settings/lastJellyfinHistoryRefresh', { value: now }, { headers: { 'Content-Type': 'application/json' } });
            console.log(`Updated Jellyfin history refresh timestamp: ${now}`);
          }));
        } else {
          console.log('Skipping Jellyfin history refresh (less than 24 hours since last refresh)');
        }
      }

      // Tautulli
      if (this.tautulliConnected) {
        const tautulliRefreshNeeded = this.isRefreshNeeded(serverSettings.lastTautulliHistoryRefresh);
        console.log(`Tautulli refresh needed: ${tautulliRefreshNeeded}`);

        if (tautulliRefreshNeeded) {
          fetchPromises.push(this.fetchTautulliData().then(async () => {
            if (this.tautulliRecentlyWatchedMovies && this.tautulliRecentlyWatchedMovies.length > 0) {
              this.tautulliRecentlyWatchedMovies.forEach(item => item.source = 'tautulli');
              await databaseStorageUtils.setJSON('tautulliWatchHistoryMovies', this.tautulliRecentlyWatchedMovies);
            }
            if (this.tautulliRecentlyWatchedShows && this.tautulliRecentlyWatchedShows.length > 0) {
              this.tautulliRecentlyWatchedShows.forEach(item => item.source = 'tautulli');
              await databaseStorageUtils.setJSON('tautulliWatchHistoryShows', this.tautulliRecentlyWatchedShows);
            }
            
            // Update timestamp directly to database column
            const now = new Date().toISOString();
            // Save directly to database column instead of through settings object
            await apiService.post('/settings/lastTautulliHistoryRefresh', { value: now }, { headers: { 'Content-Type': 'application/json' } });
            console.log(`Updated Tautulli history refresh timestamp: ${now}`);
          }));
        } else {
          console.log('Skipping Tautulli history refresh (less than 24 hours since last refresh)');
        }
      }

      // Trakt
      if (this.traktConnected) {
        const traktRefreshNeeded = this.isRefreshNeeded(serverSettings.lastTraktHistoryRefresh);
        console.log(`Trakt refresh needed: ${traktRefreshNeeded}`);

        if (traktRefreshNeeded) {
          fetchPromises.push(this.fetchTraktData(true).then(async () => {
            if (this.traktRecentlyWatchedMovies && this.traktRecentlyWatchedMovies.length > 0) {
              this.traktRecentlyWatchedMovies.forEach(item => item.source = 'trakt');
              await databaseStorageUtils.setJSON('traktWatchHistoryMovies', this.traktRecentlyWatchedMovies);
            }
            if (this.traktRecentlyWatchedShows && this.traktRecentlyWatchedShows.length > 0) {
              this.traktRecentlyWatchedShows.forEach(item => item.source = 'trakt');
              await databaseStorageUtils.setJSON('traktWatchHistoryShows', this.traktRecentlyWatchedShows);
            }
            
            // Update timestamp directly to database column
            const now = new Date().toISOString();
            // Save directly to database column instead of through settings object
            await apiService.post('/settings/lastTraktHistoryRefresh', { value: now }, { headers: { 'Content-Type': 'application/json' } });
            console.log(`Updated Trakt history refresh timestamp: ${now}`);
          }));
        } else {
          console.log('Skipping Trakt history refresh (less than 24 hours since last refresh)');
        }
      }

      try {
        // Wait for all fetches to complete
        await Promise.all(fetchPromises);
        console.log('All watch history fetched and stored in database');

        // Combine all watch history for server storage
        const allMovies = [
          ...(this.recentlyWatchedMovies || []),
          ...(this.jellyfinRecentlyWatchedMovies || []),
          ...(this.tautulliRecentlyWatchedMovies || []),
          ...(this.traktRecentlyWatchedMovies || [])
        ];

        const allShows = [
          ...(this.recentlyWatchedShows || []),
          ...(this.jellyfinRecentlyWatchedShows || []),
          ...(this.tautulliRecentlyWatchedShows || []),
          ...(this.traktRecentlyWatchedShows || [])
        ];

        // Save combined history to server
        if (allMovies.length > 0) {
          await apiService.saveWatchHistory('movies', allMovies);
        }
        
        if (allShows.length > 0) {
          await apiService.saveWatchHistory('shows', allShows);
        }

        console.log('Watch history stored to server');
      } catch (error) {
        console.error('Error fetching and storing watch history:', error);
      }
    },

    // Load settings from server or database
  async loadLocalSettings() {
    try {
      // Load all settings at once from the database
      console.log('Loading all settings from database');
      
      // Initialize database cache if not already loaded
      if (!databaseStorageUtils.cacheLoaded) {
        await databaseStorageUtils.loadCache();
      }
      
      // Get all settings from the cache
      const settings = databaseStorageUtils.cache;
      
      if (settings) {
        console.log('Loaded settings from database cache');
        
        // Apply all settings at once
        
        // Media service limits
        this.plexRecentLimit = parseInt(settings.plexRecentLimit, 10) || 100;
        this.jellyfinRecentLimit = parseInt(settings.jellyfinRecentLimit, 10) || 100;
        this.tautulliRecentLimit = parseInt(settings.tautulliRecentLimit, 10) || 50;
        this.traktRecentLimit = parseInt(settings.traktRecentLimit, 10) || 50;
        
        // History modes
        this.plexHistoryMode = settings.plexHistoryMode || 'all';
        this.jellyfinHistoryMode = settings.jellyfinHistoryMode || 'all';
        this.tautulliHistoryMode = settings.tautulliHistoryMode || 'all';
        this.traktHistoryMode = settings.traktHistoryMode || 'all';
        
        // Only modes (convert string 'true' to boolean if needed)
        this.plexOnlyMode = settings.plexOnlyMode === true || settings.plexOnlyMode === 'true' || false;
        this.jellyfinOnlyMode = settings.jellyfinOnlyMode === true || settings.jellyfinOnlyMode === 'true' || false;
        this.tautulliOnlyMode = settings.tautulliOnlyMode === true || settings.tautulliOnlyMode === 'true' || false;
        this.traktOnlyMode = settings.traktOnlyMode === true || settings.traktOnlyMode === 'true' || false;
        
        // The following settings are used by RequestRecommendations.vue component
        // but are not part of App.vue's data properties, so we don't need to do anything
        // as they're already in the database cache
        
        console.log('Settings applied from database cache');
        return;
      }
    } catch (error) {
      console.error('Error loading settings from database:', error);
      
      // Use default values if database loading fails
      console.log('Using default settings since database loading failed');
      this.plexRecentLimit = 100;
      this.jellyfinRecentLimit = 100;
      this.plexHistoryMode = 'all';
      this.jellyfinHistoryMode = 'all';
      this.plexOnlyMode = false;
      this.jellyfinOnlyMode = false;
      this.tautulliHistoryMode = 'all';
      this.tautulliOnlyMode = false;
      this.traktRecentLimit = 50;
      this.traktHistoryMode = 'all';
      this.traktOnlyMode = false;
    }
  },
    
    // Check if we have credentials stored server-side
    async checkStoredCredentials() {
      console.log('Checking for stored credentials...');
      try {
        // Only show loading state if no services are already connected
        if (!this.hasAnyServiceConnected()) {
          this.loadingServices = true;
        }
        
        // Get all services status from the server
        const serviceResults = await Promise.all([
          credentialsService.hasCredentials('sonarr'),
          credentialsService.hasCredentials('radarr'),
          credentialsService.hasCredentials('plex'),
          credentialsService.hasCredentials('jellyfin'),
          credentialsService.hasCredentials('tautulli'),
          credentialsService.hasCredentials('trakt')
        ]);
        
        // Log service check results
        console.log('Service credential check results:', {
          sonarr: serviceResults[0],
          radarr: serviceResults[1],
          plex: serviceResults[2],
          jellyfin: serviceResults[3],
          tautulli: serviceResults[4],
          trakt: serviceResults[5]
        });
        
        // Check if we have any stored credentials
        this.hasAnyServiceCredentials = serviceResults.some(result => result === true);
        console.log('Has any service credentials:', this.hasAnyServiceCredentials);
        
        // If any service has credentials, set up the appropriate services
        if (this.hasAnyServiceCredentials) {
          console.log('Found stored credentials, configuring services...');
          // Try to configure services with stored credentials
          await Promise.all([
            this.configureServiceFromCredentials('sonarr'),
            this.configureServiceFromCredentials('radarr'),
            this.configureServiceFromCredentials('plex'),
            this.configureServiceFromCredentials('jellyfin'),
            this.configureServiceFromCredentials('tautulli'),
            this.configureServiceFromCredentials('trakt')
          ]);
          
          console.log('Services configured, any connected?', this.hasAnyServiceConnected());
        }
      } catch (error) {
        console.error('Error checking for stored credentials:', error);
      } finally {
        this.loadingServices = false;
      }
    },
    
    // Configure a service from stored server-side credentials
    async configureServiceFromCredentials(serviceName) {
      try {
        // Get credentials for this service
        const credentials = await credentialsService.getCredentials(serviceName);
        if (!credentials) return;
        
        // Configure the appropriate service
        switch(serviceName) {
          case 'sonarr':
            if (credentials.baseUrl && credentials.apiKey) {
              await sonarrService.configure(credentials.baseUrl, credentials.apiKey);
              const success = await sonarrService.testConnection();
              if (success) {
                this.sonarrConnected = true;
                this.fetchSeriesData();
              }
            }
            break;
            
          case 'radarr':
            if (credentials.baseUrl && credentials.apiKey) {
              console.log('Configuring Radarr from stored credentials');
              await radarrService.configure(credentials.baseUrl, credentials.apiKey);
              
              // Test the connection
              console.log('Testing Radarr connection from stored credentials');
              const success = await radarrService.testConnection();
              
              if (success) {
                console.log('Radarr connection successful from stored credentials');
                this.radarrConnected = true;
                
                // Fetch movies data if successful
                if (this.movies.length === 0) {
                  console.log('Fetching movies data from stored credentials');
                  await this.fetchMoviesData();
                }
              } else {
                this.radarrConnected = false;
                console.log('Radarr connection test failed during configuration');
              }
            } else {
              this.radarrConnected = false;
              console.log('Incomplete Radarr credentials (missing baseUrl or apiKey)');
            }
            break;
            
          case 'plex':
            if (credentials.baseUrl && credentials.token) {
              // Make sure to include selectedUserId and recentLimit from credentials if they exist
              await plexService.configure(
                credentials.baseUrl, 
                credentials.token,
                credentials.selectedUserId || '',
                credentials.recentLimit || this.plexRecentLimit
              );
              
              // Update the component's state with values from credentials
              this.selectedPlexUserId = credentials.selectedUserId || '';
              if (credentials.recentLimit) {
                this.plexRecentLimit = parseInt(credentials.recentLimit, 10);
                console.log(`Updated plexRecentLimit to ${this.plexRecentLimit} from credentials`);
              }
              
              const success = await plexService.testConnection();
              if (success) {
                this.plexConnected = true;
                // Pass the selectedUserId directly to ensure it's used
                this.fetchPlexData(this.selectedPlexUserId);
              }
            }
            break;
            
          case 'jellyfin':
            if (credentials.baseUrl && credentials.apiKey && credentials.userId) {
              // Configure jellyfin service with stored credentials
              await jellyfinService.configure(credentials.baseUrl, credentials.apiKey, credentials.userId);
              
              // Update the component's state with the user ID from credentials
              this.selectedJellyfinUserId = credentials.userId || '';
              
              // Save the userId to database for persistence
              await databaseStorageUtils.set('selectedJellyfinUserId', this.selectedJellyfinUserId);
              
              const result = await jellyfinService.testConnection();
              if (result.success) {
                this.jellyfinConnected = true;
                // Pass the userId explicitly to ensure it's used
                console.log(`Using Jellyfin user ID from credentials: ${this.selectedJellyfinUserId}`);
                this.fetchJellyfinData(this.selectedJellyfinUserId);
              }
            }
            break;
            
          case 'tautulli':
            if (credentials.baseUrl && credentials.apiKey) {
              await tautulliService.configure(credentials.baseUrl, credentials.apiKey);
              
              try {
                // Load saved user ID from database if available
                const savedUserId = await databaseStorageUtils.get('selectedTautulliUserId');
                if (savedUserId) {
                  this.selectedTautulliUserId = savedUserId;
                }
              } catch (dbError) {
                console.error('Error loading Tautulli user ID from database:', dbError);
                
                // Fall back to localStorage if database fails
                const savedUserId = databaseStorageUtils.get('selectedTautulliUserId');
                if (savedUserId) {
                  this.selectedTautulliUserId = savedUserId;
                }
              }
              
              // Update tautulliRecentLimit from credentials if available
              if (credentials.recentLimit) {
                this.tautulliRecentLimit = parseInt(credentials.recentLimit, 10);
                console.log(`Updated tautulliRecentLimit to ${this.tautulliRecentLimit} from credentials`);
              } else {
                // If not in credentials, use the default value
                console.log(`Using default tautulliRecentLimit: ${this.tautulliRecentLimit}`);
              }
              
              const success = await tautulliService.testConnection();
              if (success) {
                this.tautulliConnected = true;
                // Pass the userId explicitly to ensure it's used
                this.fetchTautulliData(this.selectedTautulliUserId);
              }
            }
            break;
            
          case 'trakt':
            if (credentials.clientId && credentials.accessToken) {
              console.log('Configuring Trakt from stored credentials');
              traktService.clientId = credentials.clientId;
              traktService.clientSecret = credentials.clientSecret || '';
              traktService.accessToken = credentials.accessToken;
              traktService.refreshToken = credentials.refreshToken || '';
              traktService.expiresAt = credentials.expiresAt || null;
              traktService.configured = true;
              
              // Update traktRecentLimit from credentials if available
              if (credentials.recentLimit) {
                this.traktRecentLimit = parseInt(credentials.recentLimit, 10);
                console.log(`Updated traktRecentLimit to ${this.traktRecentLimit} from credentials`);
              } else {
                // If not in credentials, use the value from TraktService
                this.traktRecentLimit = traktService.getRecentLimit();
                console.log(`Using traktRecentLimit from TraktService: ${this.traktRecentLimit}`);
              }
              
              const success = await traktService.testConnection();
              if (success) {
                console.log('Trakt connection successful from stored credentials');
                this.traktConnected = true;
                await this.fetchTraktData();
              } else {
                this.traktConnected = false;
                console.log('Trakt connection test failed during configuration');
              }
            }
            break;
        }
      } catch (error) {
        console.error(`Error configuring ${serviceName} from stored credentials:`, error);
      }
    },
    
    // Handler methods for disconnection events from connection components
    async handleSonarrDisconnected() {
      this.sonarrConnected = false;
      this.showSonarrConnect = false; // Don't show connect modal
      this.series = [];
      
      // No need to clean up localStorage anymore
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('sonarr');
      
      // If we're on the TV recommendations tab and no longer have Sonarr connected,
      // switch to movie recommendations if Radarr is available
      if (this.activeTab === 'tv-recommendations' && this.radarrConnected) {
        this.activeTab = 'movie-recommendations';
      }
    },
    
    async handleRadarrDisconnected() {
      this.radarrConnected = false;
      this.showRadarrConnect = false; // Don't show connect modal
      this.movies = [];
      
      // No need to clean up localStorage anymore
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('radarr');
      
      // If we're on the movie recommendations tab and no longer have Radarr connected,
      // switch to TV recommendations if Sonarr is available
      if (this.activeTab === 'movie-recommendations' && this.sonarrConnected) {
        this.activeTab = 'tv-recommendations';
      }
    },
    
    async handlePlexDisconnected() {
      this.plexConnected = false;
      this.showPlexConnect = false; // Don't show connect modal
      this.recentlyWatchedMovies = [];
      this.recentlyWatchedShows = [];
      
      // No need to clean up localStorage anymore
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('plex');
    },
    
    async handleJellyfinDisconnected() {
      this.jellyfinConnected = false;
      this.showJellyfinConnect = false; // Don't show connect modal
      this.jellyfinRecentlyWatchedMovies = [];
      this.jellyfinRecentlyWatchedShows = [];
      
      // No need to clean up localStorage anymore
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('jellyfin');
    },
    
    async handleTautulliDisconnected() {
      this.tautulliConnected = false;
      this.showTautulliConnect = false; // Don't show connect modal
      this.tautulliRecentlyWatchedMovies = [];
      this.tautulliRecentlyWatchedShows = [];
      
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('tautulli');
    },
    
    async traktConnectionHandler() {
      this.traktConnected = true;
      this.showTraktConnect = false; // Don't show connect modal
      await this.fetchTraktData();
      console.log('Trakt connected successfully, data fetched');
    },
    
    async traktDisconnectionHandler() {
      this.traktConnected = false;
      this.showTraktConnect = false; // Don't show connect modal
      this.traktRecentlyWatchedMovies = [];
      this.traktRecentlyWatchedShows = [];
      
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('trakt');
    },
    
    async traktLimitChangeHandler(limit) {
      this.traktRecentLimit = limit;
      await this.fetchTraktData();
    },
    
    async fetchTraktData(forceRefresh = false) {
      console.log('🔄 fetchTraktData called - refreshing Trakt history data');
      
      if (!traktService.isConfigured()) {
        console.log('❌ Trakt service is not configured, skipping data fetch');
        return;
      }
      
      try {
        // Check if we need to refresh the data
        if (!forceRefresh) {
          // Fetch settings to get the latest timestamp
          const serverSettings = await apiService.getSettings();
          const traktRefreshNeeded = this.isRefreshNeeded(serverSettings.lastTraktHistoryRefresh);
          
          if (!traktRefreshNeeded) {
            console.log('Skipping Trakt history refresh (less than 24 hours since last refresh)');
            return;
          }
        }
        
        console.log('🔍 Fetching Trakt watch history with settings:', {
          historyMode: this.traktHistoryMode,
          recentLimit: this.traktRecentLimit || 50,
          onlyMode: this.traktOnlyMode
        });
        
        // Determine if we should apply a days filter based on the history mode
        const daysAgo = this.traktHistoryMode === 'recent' ? 30 : 0;
        
        console.log(`Requesting Trakt history with daysAgo=${daysAgo}`);
        
        // Fetch movies and track timing
        console.time('Trakt movies fetch');
        const moviesPromise = traktService.getRecentlyWatchedMovies(this.traktRecentLimit || 50, daysAgo);
        
        // Fetch shows and track timing
        console.time('Trakt shows fetch');
        const showsPromise = traktService.getRecentlyWatchedShows(this.traktRecentLimit || 50, daysAgo);
        
        // Wait for both to complete
        const [moviesResponse, showsResponse] = await Promise.all([moviesPromise, showsPromise]);
        console.timeEnd('Trakt movies fetch');
        console.timeEnd('Trakt shows fetch');
        
        console.log(`📊 Trakt movies response: ${moviesResponse ? moviesResponse.length : 0} items`);
        console.log(`📊 Trakt shows response: ${showsResponse ? showsResponse.length : 0} items`);
        
        this.traktRecentlyWatchedMovies = moviesResponse;
        this.traktRecentlyWatchedShows = showsResponse;
        
        console.log('Fetched Trakt watch history:', {
          moviesCount: this.traktRecentlyWatchedMovies.length,
          showsCount: this.traktRecentlyWatchedShows.length
        });
        
        // Log a sample of the first movie and show to verify data structure
        if (this.traktRecentlyWatchedMovies && this.traktRecentlyWatchedMovies.length > 0) {
          console.log('Trakt movie sample:', this.traktRecentlyWatchedMovies[0]);
        } else {
          console.log('No Trakt movies in watch history');
        }
        
        if (this.traktRecentlyWatchedShows && this.traktRecentlyWatchedShows.length > 0) {
          console.log('Trakt show sample:', this.traktRecentlyWatchedShows[0]);
        } else {
          console.log('No Trakt shows in watch history');
        }
        
        // Update the timestamp
        const now = new Date().toISOString();
        await apiService.post('/settings/lastTraktHistoryRefresh', { value: now }, { headers: { 'Content-Type': 'application/json' } });
        console.log(`Updated Trakt history refresh timestamp: ${now}`);
        
        // Save to database
        if (this.traktRecentlyWatchedMovies && this.traktRecentlyWatchedMovies.length > 0) {
          this.traktRecentlyWatchedMovies.forEach(item => item.source = 'trakt');
          await databaseStorageUtils.setJSON('traktWatchHistoryMovies', this.traktRecentlyWatchedMovies);
        }
        
        if (this.traktRecentlyWatchedShows && this.traktRecentlyWatchedShows.length > 0) {
          this.traktRecentlyWatchedShows.forEach(item => item.source = 'trakt');
          await databaseStorageUtils.setJSON('traktWatchHistoryShows', this.traktRecentlyWatchedShows);
        }
      } catch (error) {
        console.error('Failed to fetch Trakt watch history:', error);
      }
    },
    
    async openJellyfinUserSelect() {
      this.showJellyfinUserSelect = true;
      this.jellyfinUsersLoading = true;
      this.jellyfinUsers = [];
      
      try {
        // Ensure database cache is loaded
        if (!databaseStorageUtils.cacheLoaded) {
          await databaseStorageUtils.loadCache();
        }
        
        // Get the user ID from cache
        const savedUserId = databaseStorageUtils.cache.selectedJellyfinUserId;
        if (savedUserId) {
          this.selectedJellyfinUserId = savedUserId;
          console.log(`Loaded Jellyfin user ID from database cache: ${savedUserId}`);
        } else {
          // Fall back to the service's stored user ID
          this.selectedJellyfinUserId = jellyfinService.userId;
        }
        
        this.jellyfinUsers = await jellyfinService.getUsers();
      } catch (error) {
        console.error('Error in openJellyfinUserSelect:', error);
        
        // Fall back to the service's stored user ID
        this.selectedJellyfinUserId = jellyfinService.userId;
        
        try {
          this.jellyfinUsers = await jellyfinService.getUsers();
        } catch (userError) {
          console.error('Error fetching Jellyfin users:', userError);
        }
      } finally {
        this.jellyfinUsersLoading = false;
      }
    },
    
    closeJellyfinUserSelect() {
      this.showJellyfinUserSelect = false;
    },
    
    async selectJellyfinUser(user) {
      this.selectedJellyfinUserId = user.id;
      // Store the selection in database
      await databaseStorageUtils.set('selectedJellyfinUserId', user.id);
    },
    
    async applyJellyfinUserSelection() {
      // Validate the user ID
      if (!this.selectedJellyfinUserId) {
        console.error('No Jellyfin user ID selected. Jellyfin requires a user ID for watch history.');
        return;
      }
      
      try {
        // Save current history limit to ensure it persists across user changes
        await databaseStorageUtils.set('jellyfinHistoryLimit', this.jellyfinRecentLimit.toString());
        // Always persist the user ID selection to database
        await databaseStorageUtils.set('selectedJellyfinUserId', this.selectedJellyfinUserId);
        
        // Update the Jellyfin service with the new user ID
        await jellyfinService.configure(
          jellyfinService.baseUrl,
          jellyfinService.apiKey,
          this.selectedJellyfinUserId,
          this.jellyfinRecentLimit
        );
        
        // Close the modal
        this.showJellyfinUserSelect = false;
        
        // Fetch updated watch history with the explicitly selected user ID
        console.log(`Applying Jellyfin user selection: ${this.selectedJellyfinUserId}`);
        
        // Fetch the user history
        await this.fetchJellyfinData(this.selectedJellyfinUserId);
        
        // Save the history data to database
        if (this.jellyfinRecentlyWatchedMovies && this.jellyfinRecentlyWatchedMovies.length > 0) {
          this.jellyfinRecentlyWatchedMovies.forEach(item => item.source = 'jellyfin');
          await databaseStorageUtils.setJSON('jellyfinWatchHistoryMovies', this.jellyfinRecentlyWatchedMovies);
        }
        
        if (this.jellyfinRecentlyWatchedShows && this.jellyfinRecentlyWatchedShows.length > 0) {
          this.jellyfinRecentlyWatchedShows.forEach(item => item.source = 'jellyfin');
          await databaseStorageUtils.setJSON('jellyfinWatchHistoryShows', this.jellyfinRecentlyWatchedShows);
        }
        
        // Save to server
        const allMovies = [
          ...(this.jellyfinRecentlyWatchedMovies || [])
        ];
        
        const allShows = [
          ...(this.jellyfinRecentlyWatchedShows || [])
        ];
        
        if (allMovies.length > 0) {
          await apiService.saveWatchHistory('movies', allMovies);
        }
        
        if (allShows.length > 0) {
          await apiService.saveWatchHistory('shows', allShows);
        }
        
        console.log('Jellyfin watch history stored successfully');
      } catch (error) {
        console.error('Error fetching and storing Jellyfin watch history:', error);
      }
    },
    
    async openTautulliUserSelect() {
      this.showTautulliUserSelect = true;
      this.tautulliUsersLoading = true;
      this.tautulliUsers = [];
      
      try {
        // Ensure database cache is loaded
        if (!databaseStorageUtils.cacheLoaded) {
          await databaseStorageUtils.loadCache();
        }
        
        // Get the user ID from cache
        const savedUserId = databaseStorageUtils.cache.selectedTautulliUserId;
        if (savedUserId) {
          this.selectedTautulliUserId = savedUserId;
          console.log(`Loaded Tautulli user ID from database cache: ${savedUserId}`);
        }
        
        this.tautulliUsers = await tautulliService.getUsers();
      } catch (error) {
        console.error('Error in openTautulliUserSelect:', error);
      } finally {
        this.tautulliUsersLoading = false;
      }
    },
    
    closeTautulliUserSelect() {
      this.showTautulliUserSelect = false;
    },
    
    async selectTautulliUser(user) {
      this.selectedTautulliUserId = user.user_id;
      // Store the selection in database
      await databaseStorageUtils.set('selectedTautulliUserId', user.user_id);
    },
    
    async applyTautulliUserSelection() {
      try {
        // Save current history limit to ensure it persists
        await databaseStorageUtils.set('tautulliRecentLimit', this.tautulliRecentLimit.toString());
        
        // Always persist the user ID selection to database
        await databaseStorageUtils.set('selectedTautulliUserId', this.selectedTautulliUserId || '');
        
        // Close the modal
        this.showTautulliUserSelect = false;
        
        // Fetch updated watch history with the new user filter
        // If selectedTautulliUserId is empty, pass null to indicate "all users"
        const userId = this.selectedTautulliUserId ? this.selectedTautulliUserId : null;
        console.log(`Applying Tautulli user selection: ${userId || 'all users'}`);
        
        // Fetch the user history
        await this.fetchTautulliData(userId);
        
        // Save the history data to database
        if (this.tautulliRecentlyWatchedMovies && this.tautulliRecentlyWatchedMovies.length > 0) {
          this.tautulliRecentlyWatchedMovies.forEach(item => item.source = 'tautulli');
          await databaseStorageUtils.setJSON('tautulliWatchHistoryMovies', this.tautulliRecentlyWatchedMovies);
        }
        
        if (this.tautulliRecentlyWatchedShows && this.tautulliRecentlyWatchedShows.length > 0) {
          this.tautulliRecentlyWatchedShows.forEach(item => item.source = 'tautulli');
          await databaseStorageUtils.setJSON('tautulliWatchHistoryShows', this.tautulliRecentlyWatchedShows);
        }
        
        // Save to server
        const allMovies = [
          ...(this.tautulliRecentlyWatchedMovies || [])
        ];
        
        const allShows = [
          ...(this.tautulliRecentlyWatchedShows || [])
        ];
        
        if (allMovies.length > 0) {
          await apiService.saveWatchHistory('movies', allMovies);
        }
        
        if (allShows.length > 0) {
          await apiService.saveWatchHistory('shows', allShows);
        }
        
        console.log('Tautulli watch history stored successfully');
      } catch (error) {
        console.error('Error fetching and storing Tautulli watch history:', error);
      }
    },
    
    async openPlexUserSelect() {
      this.showPlexUserSelect = true;
      this.plexUsersLoading = true;
      this.plexUsers = [];
      this.selectedPlexUserId = plexService.selectedUserId;
      
      try {
        this.plexUsers = await plexService.getUsers();
      } catch (error) {
        console.error('Error fetching Plex users:', error);
      } finally {
        this.plexUsersLoading = false;
      }
    },
    
    closePlexUserSelect() {
      this.showPlexUserSelect = false;
    },
    
    selectPlexUser(user) {
      this.selectedPlexUserId = user.id;
    },
    
    async applyPlexUserSelection() {
      if (!this.selectedPlexUserId) return;
      
      try {
        // Save current history limit to ensure it persists across user changes
        await databaseStorageUtils.set('plexRecentLimit', this.plexRecentLimit.toString());
        await databaseStorageUtils.set('selectedPlexUserId', this.selectedPlexUserId);
        
        // Update the Plex service with the new user ID
        plexService.configure(
          plexService.baseUrl,
          plexService.token,
          this.selectedPlexUserId,
          this.plexRecentLimit
        );
        
        // Close the modal
        this.showPlexUserSelect = false;
        
        // Fetch updated watch history
        await this.fetchPlexData();
        
        // Save the history data to database
        if (this.recentlyWatchedMovies && this.recentlyWatchedMovies.length > 0) {
          this.recentlyWatchedMovies.forEach(item => item.source = 'plex');
          await databaseStorageUtils.setJSON('watchHistoryMovies', this.recentlyWatchedMovies);
        }
        
        if (this.recentlyWatchedShows && this.recentlyWatchedShows.length > 0) {
          this.recentlyWatchedShows.forEach(item => item.source = 'plex');
          await databaseStorageUtils.setJSON('watchHistoryShows', this.recentlyWatchedShows);
        }
        
        // Save to server
        const allMovies = [
          ...(this.recentlyWatchedMovies || [])
        ];
        
        const allShows = [
          ...(this.recentlyWatchedShows || [])
        ];
        
        if (allMovies.length > 0) {
          await apiService.saveWatchHistory('movies', allMovies);
        }
        
        if (allShows.length > 0) {
          await apiService.saveWatchHistory('shows', allShows);
        }
        
        console.log('Plex watch history stored successfully');
      } catch (error) {
        console.error('Error fetching and storing Plex watch history:', error);
      }
    },
    
    async checkSonarrConnection() {
      try {
        const success = await sonarrService.testConnection();
        if (success) {
          this.sonarrConnected = true;
          this.fetchSeriesData();
          if (this.activeTab === 'movie-recommendations' && !this.radarrConnected) {
            this.activeTab = 'tv-recommendations';
          }
        }
      } catch (error) {
        console.error('Failed to connect with stored Sonarr credentials:', error);
      }
    },
    
    async checkRadarrConnection() {
      try {
        // Ensure credentials are loaded
        if (!radarrService.isConfigured()) {
          await radarrService.loadCredentials();
        }
        
        const success = await radarrService.testConnection();
        if (success) {
          this.radarrConnected = true;
          this.fetchMoviesData();
          if (this.activeTab === 'tv-recommendations' && !this.sonarrConnected) {
            this.activeTab = 'movie-recommendations';
          }
        } else {
          this.radarrConnected = false;
        }
      } catch (error) {
        console.error('Failed to connect with stored Radarr credentials:', error);
        this.radarrConnected = false;
      }
    },
    
    async checkPlexConnection() {
      try {
        const success = await plexService.testConnection();
        if (success) {
          this.plexConnected = true;
          
          // Update component state with service's selectedUserId
          this.selectedPlexUserId = plexService.selectedUserId;
          
          // Pass the selectedUserId explicitly to ensure it's used
          this.fetchPlexData(this.selectedPlexUserId);
        }
      } catch (error) {
        console.error('Failed to connect with stored Plex credentials:', error);
      }
    },
    
    async checkJellyfinConnection() {
      try {
        const result = await jellyfinService.testConnection();
        if (result.success) {
          this.jellyfinConnected = true;
          
          // Update component state with service's userId
          this.selectedJellyfinUserId = jellyfinService.userId;
          
          // Pass the userId explicitly to ensure it's used
          this.fetchJellyfinData(this.selectedJellyfinUserId);
        }
      } catch (error) {
        console.error('Failed to connect with stored Jellyfin credentials:', error);
      }
    },
    
    async checkTautulliConnection() {
      try {
        const success = await tautulliService.testConnection();
        if (success) {
          this.tautulliConnected = true;
          
          try {
            // Load saved user ID from database if available
            const savedUserId = await databaseStorageUtils.get('selectedTautulliUserId');
            if (savedUserId) {
              this.selectedTautulliUserId = savedUserId;
            }
          } catch (dbError) {
            console.error('Error loading Tautulli user ID from database:', dbError);
            
            // Try to get from database again with a different approach
            try {
              await databaseStorageUtils.loadCache();
              const savedUserId = await databaseStorageUtils.get('selectedTautulliUserId');
              if (savedUserId) {
                this.selectedTautulliUserId = savedUserId;
              }
            } catch (secondDbError) {
              console.error('Second attempt to load Tautulli user ID from database failed:', secondDbError);
            }
          }
          
          // Pass the userId explicitly to ensure it's used
          this.fetchTautulliData(this.selectedTautulliUserId);
        }
      } catch (error) {
        console.error('Failed to connect with stored Tautulli credentials:', error);
      }
    },
    
    async checkTraktConnection() {
      try {
        console.log('Checking Trakt connection...');
        const success = await traktService.testConnection();
        if (success) {
          console.log('Trakt connection successful');
          this.traktConnected = true;
          await this.fetchTraktData();
        } else {
          console.log('Trakt connection test failed');
          this.traktConnected = false;
        }
      } catch (error) {
        console.error('Failed to connect with stored Trakt credentials:', error);
        this.traktConnected = false;
      }
    },
    
    handleSonarrConnected() {
      this.sonarrConnected = true;
      this.showSonarrConnect = false;
      this.fetchSeriesData();
      this.activeTab = 'tv-recommendations';
    },
    
    handleRadarrConnected() {
      this.radarrConnected = true;
      this.showRadarrConnect = false;
      this.fetchMoviesData();
      this.activeTab = 'movie-recommendations';
    },
    
    handlePlexConnected() {
      this.plexConnected = true;
      this.showPlexConnect = false;
      this.fetchPlexData();
    },
    
    handleJellyfinConnected() {
      this.jellyfinConnected = true;
      this.showJellyfinConnect = false;
      this.fetchJellyfinData();
    },
    
    handleTautulliConnected() {
      this.tautulliConnected = true;
      this.showTautulliConnect = false;
      this.fetchTautulliData();
    },
    
    onTraktConnected() {
      this.traktConnected = true;
      this.showTraktConnect = false;
      this.fetchTraktData();
    },
    
    onTraktDisconnected() {
      this.traktConnected = false;
      this.showTraktConnect = false;
      // Clear trakt data
      this.traktRecentlyWatchedMovies = [];
      this.traktRecentlyWatchedShows = [];
    },
    
    handlePlexLimitChanged(limit) {
      this.plexRecentLimit = limit;
      this.fetchPlexData();
    },
    
    handleJellyfinLimitChanged(limit) {
      this.jellyfinRecentLimit = limit;
      this.fetchJellyfinData();
    },
    
    handleTautulliLimitChanged(limit) {
      this.tautulliRecentLimit = limit;
      this.fetchTautulliData();
    },
    
    onTraktLimitChange(limit) {
      this.traktRecentLimit = limit;
      this.fetchTraktData();
    },
    
    handlePlexHistoryModeChanged(mode) {
      this.plexHistoryMode = mode;
      this.fetchPlexData();
    },
    
    handleJellyfinHistoryModeChanged(mode) {
      this.jellyfinHistoryMode = mode;
      this.fetchJellyfinData();
    },
    
    handleTautulliHistoryModeChanged(mode) {
      this.tautulliHistoryMode = mode;
      this.fetchTautulliData();
    },
    
    handleTraktHistoryModeChanged(mode) {
      console.log('Trakt history mode changed to:', mode);
      this.traktHistoryMode = mode;
      this.fetchTraktData();
    },
    
    handlePlexOnlyModeChanged(enabled) {
      this.plexOnlyMode = enabled;
    },
    
    handleJellyfinOnlyModeChanged(enabled) {
      this.jellyfinOnlyMode = enabled;
    },
    
    handleTautulliOnlyModeChanged(enabled) {
      this.tautulliOnlyMode = enabled;
    },
    
    handleTraktOnlyModeChanged(enabled) {
      console.log('Trakt only mode changed to:', enabled);
      this.traktOnlyMode = enabled;
    },
    handleNavigate(tab, subtab) {
      this.activeTab = tab;
      
      // Set the AI Settings subtab if specified
      if (tab === 'settings' && subtab) {
        this.aiSettingsSubtab = subtab;
      }
      
      // If we're switching to TV recommendations, ensure we have series data
      if (tab === 'tv-recommendations' && this.series.length === 0 && this.sonarrConnected) {
        this.fetchSeriesData();
      }
      
      // If we're switching to movie recommendations, check if we need to fetch movies data
      if (tab === 'movie-recommendations') {
        // Check if Radarr is connected
        console.log('Radarr connected:', this.radarrConnected);
        console.log('Current movies array length:', this.movies.length);
        
        // Check if Radarr service is actually configured
        if (radarrService.isConfigured()) {
          this.radarrConnected = true;
          
          // Only fetch movies if we don't have any yet
          if (this.movies.length === 0) {
            console.log('Movie array is empty, fetching movies data');
            this.fetchMoviesData();
          } else {
            console.log('Movie array already populated, skipping fetch');
          }
        }
      }
    },
    async fetchSeriesData() {
      try {
        this.series = await sonarrService.getSeries();
      } catch (error) {
        console.error('Failed to fetch series data for recommendations:', error);
      }
    },
    
    // Flag to track if fetchMoviesData is already in progress
    _fetchingMovies: false,
    
    async fetchMoviesData() {
      // Prevent simultaneous calls to fetchMoviesData
      if (this._fetchingMovies) {
        console.log('fetchMoviesData already in progress, skipping duplicate call');
        return;
      }
      
      try {
        this._fetchingMovies = true;
        console.log('Fetching movies data...');
        console.log('Radarr configured:', radarrService.isConfigured());
        console.log('Radarr baseUrl:', radarrService.baseUrl);
        console.log('Radarr apiKey:', radarrService.apiKey ? '✓ Set' : '✗ Not set');
        
        // Try to load credentials explicitly if not configured
        if (!radarrService.isConfigured()) {
          await radarrService.loadCredentials();
        }
        
        // If still not configured, log a message
        if (!radarrService.isConfigured()) {
          console.log('Radarr service is still not configured after loading credentials');
          this.radarrConnected = false;
          return;
        }
        
        // Fetch movies
        const movies = await radarrService.getMovies();
        console.log('Fetched movies:', movies);
        
        this.movies = movies;
        this.radarrConnected = true;
      } catch (error) {
        console.error('Failed to fetch movies data for recommendations:', error);
        this.radarrConnected = false;
      } finally {
        this._fetchingMovies = false;
      }
    },
    
    async fetchPlexData(userId = '', forceRefresh = false) {
      if (!plexService.isConfigured()) {
        return;
      }
      
      try {
        // Check if we need to refresh the data
        if (!forceRefresh) {
          // Fetch settings to get the latest timestamp
          const serverSettings = await apiService.getSettings();
          const plexRefreshNeeded = this.isRefreshNeeded(serverSettings.lastPlexHistoryRefresh);
          
          if (!plexRefreshNeeded) {
            console.log('Skipping Plex history refresh (less than 24 hours since last refresh)');
            return;
          }
        }
        
        console.log('Fetching Plex watch history...');
        
        // Determine if we should apply a days filter based on the history mode
        const daysAgo = this.plexHistoryMode === 'recent' ? 30 : 0;
        
        // First prioritize the userId passed in directly, then use the component's selectedPlexUserId if it exists,
        // and finally fall back to plexService.selectedUserId if needed
        const userIdToUse = userId || this.selectedPlexUserId || plexService.selectedUserId;
        
        // Always ensure plexService has the updated selectedUserId for future calls
        if (userIdToUse && userIdToUse !== plexService.selectedUserId) {
          console.log(`Updating plexService.selectedUserId to ${userIdToUse}`);
          await plexService.configure(plexService.baseUrl, plexService.token, userIdToUse, this.plexRecentLimit);
        }
        
        // Fetch both shows and movies in parallel for efficiency
        const [moviesResponse, showsResponse] = await Promise.all([
          plexService.getRecentlyWatchedMovies(this.plexRecentLimit, daysAgo, userIdToUse),
          plexService.getRecentlyWatchedShows(this.plexRecentLimit, daysAgo, userIdToUse)
        ]);
        
        this.recentlyWatchedMovies = moviesResponse;
        this.recentlyWatchedShows = showsResponse;
        
        console.log('Fetched Plex watch history:', {
          userId: userIdToUse || 'none specified',
          movies: this.recentlyWatchedMovies.length,
          shows: this.recentlyWatchedShows.length
        });
        
        // Update the timestamp
        const now = new Date().toISOString();
        await apiService.post('/settings/lastPlexHistoryRefresh', { value: now }, { headers: { 'Content-Type': 'application/json' } });
        console.log(`Updated Plex history refresh timestamp: ${now}`);
        
        // Save to database
        if (this.recentlyWatchedMovies && this.recentlyWatchedMovies.length > 0) {
          this.recentlyWatchedMovies.forEach(item => item.source = 'plex');
          await databaseStorageUtils.setJSON('watchHistoryMovies', this.recentlyWatchedMovies);
        }
        
        if (this.recentlyWatchedShows && this.recentlyWatchedShows.length > 0) {
          this.recentlyWatchedShows.forEach(item => item.source = 'plex');
          await databaseStorageUtils.setJSON('watchHistoryShows', this.recentlyWatchedShows);
        }
      } catch (error) {
        console.error('Failed to fetch Plex watch history:', error);
      }
    },
    
    async fetchJellyfinData(userId = '', forceRefresh = false) {
      if (!jellyfinService.isConfigured()) {
        return;
      }
      
      try {
        // Check if we need to refresh the data
        if (!forceRefresh) {
          // Fetch settings to get the latest timestamp
          const serverSettings = await apiService.getSettings();
          const jellyfinRefreshNeeded = this.isRefreshNeeded(serverSettings.lastJellyfinHistoryRefresh);
          
          if (!jellyfinRefreshNeeded) {
            console.log('Skipping Jellyfin history refresh (less than 24 hours since last refresh)');
            return;
          }
        }
        
        console.log('Fetching Jellyfin watch history...');
        
        // Determine if we should apply a days filter based on the history mode
        const daysAgo = this.jellyfinHistoryMode === 'recent' ? 30 : 0;
        
        // Use passed userId or component state in that order
        let userIdToUse = '';
        
        // If userId parameter is provided and not empty, use it
        if (userId !== null && userId !== undefined && userId !== '') {
          userIdToUse = userId;
        } 
        // Otherwise use the component's stored ID if it's not empty
        else if (this.selectedJellyfinUserId && this.selectedJellyfinUserId !== '') {
          userIdToUse = this.selectedJellyfinUserId;
        }
        // Finally fall back to the service's userId
        else if (jellyfinService.userId && jellyfinService.userId !== '') {
          userIdToUse = jellyfinService.userId;
        }
        
        // If we still don't have a valid user ID, log an error
        if (!userIdToUse) {
          console.error('No valid Jellyfin user ID found. Jellyfin requires a user ID for watch history.');
          return;
        }
        
        console.log(`Fetching Jellyfin history with user ID: ${userIdToUse}`);
        
        // Always ensure jellyfinService has the updated userId for future calls
        if (userIdToUse !== jellyfinService.userId) {
          console.log(`Updating jellyfinService.userId to ${userIdToUse}`);
          await jellyfinService.configure(
            jellyfinService.baseUrl,
            jellyfinService.apiKey,
            userIdToUse,
            this.jellyfinRecentLimit
          );
        }
        
        // Fetch both shows and movies in parallel for efficiency
        const [moviesResponse, showsResponse] = await Promise.all([
          jellyfinService.getRecentlyWatchedMovies(this.jellyfinRecentLimit, daysAgo),
          jellyfinService.getRecentlyWatchedShows(this.jellyfinRecentLimit, daysAgo)
        ]);
        
        this.jellyfinRecentlyWatchedMovies = moviesResponse;
        this.jellyfinRecentlyWatchedShows = showsResponse;
        
        console.log('Fetched Jellyfin watch history:', {
          userId: userIdToUse,
          movies: this.jellyfinRecentlyWatchedMovies.length,
          shows: this.jellyfinRecentlyWatchedShows.length
        });
        
        // Update the timestamp
        const now = new Date().toISOString();
        await apiService.post('/settings/lastJellyfinHistoryRefresh', { value: now }, { headers: { 'Content-Type': 'application/json' } });
        console.log(`Updated Jellyfin history refresh timestamp: ${now}`);
        
        // Save to database
        if (this.jellyfinRecentlyWatchedMovies && this.jellyfinRecentlyWatchedMovies.length > 0) {
          this.jellyfinRecentlyWatchedMovies.forEach(item => item.source = 'jellyfin');
          await databaseStorageUtils.setJSON('jellyfinWatchHistoryMovies', this.jellyfinRecentlyWatchedMovies);
        }
        
        if (this.jellyfinRecentlyWatchedShows && this.jellyfinRecentlyWatchedShows.length > 0) {
          this.jellyfinRecentlyWatchedShows.forEach(item => item.source = 'jellyfin');
          await databaseStorageUtils.setJSON('jellyfinWatchHistoryShows', this.jellyfinRecentlyWatchedShows);
        }
      } catch (error) {
        console.error('Failed to fetch Jellyfin watch history:', error);
      }
    },
    
    async fetchTautulliData(userId = null, forceRefresh = false) {
      if (!tautulliService.isConfigured()) {
        return;
      }
      
      try {
        // Check if we need to refresh the data
        if (!forceRefresh) {
          // Fetch settings to get the latest timestamp
          const serverSettings = await apiService.getSettings();
          const tautulliRefreshNeeded = this.isRefreshNeeded(serverSettings.lastTautulliHistoryRefresh);
          
          if (!tautulliRefreshNeeded) {
            console.log('Skipping Tautulli history refresh (less than 24 hours since last refresh)');
            return;
          }
        }
        
        console.log('Fetching Tautulli watch history...');
        
        // Determine if we should apply a days filter based on the history mode
        const daysAgo = this.tautulliHistoryMode === 'recent' ? 30 : 0;
        
        // Use passed userId or component state in that order
        // Note: null/undefined/empty string should all mean "no user filter" (all users)
        let userIdToUse = null;
        
        // If userId parameter is provided and not empty, use it
        if (userId !== null && userId !== undefined && userId !== '') {
          userIdToUse = userId;
        } 
        // Otherwise use the component's stored ID if it's not empty
        else if (this.selectedTautulliUserId && this.selectedTautulliUserId !== '') {
          userIdToUse = this.selectedTautulliUserId;
        }
        
        // Store the selected user ID in component state and database for future use
        if (userIdToUse && userIdToUse !== this.selectedTautulliUserId) {
          this.selectedTautulliUserId = userIdToUse;
          await databaseStorageUtils.set('selectedTautulliUserId', userIdToUse);
        }
        
        console.log(`Fetching Tautulli history with user ID: ${userIdToUse || 'all users'}`);
        
        // Fetch both shows and movies in parallel for efficiency
        const [moviesResponse, showsResponse] = await Promise.all([
          tautulliService.getRecentlyWatchedMovies(this.tautulliRecentLimit, daysAgo, userIdToUse),
          tautulliService.getRecentlyWatchedShows(this.tautulliRecentLimit, daysAgo, userIdToUse)
        ]);
        
        this.tautulliRecentlyWatchedMovies = moviesResponse;
        this.tautulliRecentlyWatchedShows = showsResponse;
        
        console.log('Fetched Tautulli watch history:', {
          movies: this.tautulliRecentlyWatchedMovies.length,
          shows: this.tautulliRecentlyWatchedShows.length,
          userId: userIdToUse || 'all users' 
        });
        
        // Update the timestamp
        const now = new Date().toISOString();
        await apiService.post('/settings/lastTautulliHistoryRefresh', { value: now }, { headers: { 'Content-Type': 'application/json' } });
        console.log(`Updated Tautulli history refresh timestamp: ${now}`);
        
        // Save to database
        if (this.tautulliRecentlyWatchedMovies && this.tautulliRecentlyWatchedMovies.length > 0) {
          this.tautulliRecentlyWatchedMovies.forEach(item => item.source = 'tautulli');
          await databaseStorageUtils.setJSON('tautulliWatchHistoryMovies', this.tautulliRecentlyWatchedMovies);
        }
        
        if (this.tautulliRecentlyWatchedShows && this.tautulliRecentlyWatchedShows.length > 0) {
          this.tautulliRecentlyWatchedShows.forEach(item => item.source = 'tautulli');
          await databaseStorageUtils.setJSON('tautulliWatchHistoryShows', this.tautulliRecentlyWatchedShows);
        }
      } catch (error) {
        console.error('Failed to fetch Tautulli watch history:', error);
      }
    },
    handleSettingsUpdated() {
      // When AI settings are updated, show a brief notification or just stay on the settings page
      console.log('AI settings updated successfully');
    },
    
    async handleSonarrSettingsUpdated() {
      // Check if Sonarr service is configured in memory
      if (sonarrService.isConfigured()) {
        // Check the Sonarr connection with the new settings
        this.checkSonarrConnection();
        console.log('Sonarr settings updated, testing connection');
        return;
      }
      
      // If not in memory, check server storage
      try {
        await this.configureServiceFromCredentials('sonarr');
      } catch (error) {
        console.error('Error loading Sonarr credentials:', error);
        this.sonarrConnected = false;
      }
    },
    
    async handleRadarrSettingsUpdated() {
      console.log('Radarr settings updated event received');
      
      // Check if Radarr service is configured in memory
      const isConfigured = radarrService.isConfigured();
      console.log('Is Radarr configured in memory:', isConfigured);
      
      if (isConfigured) {
        // Check the Radarr connection with the new settings
        console.log('Testing Radarr connection with existing credentials');
        await this.checkRadarrConnection();
      } else {
        // Try to load credentials from server storage
        console.log('Radarr not configured in memory, checking server storage');
        try {
          await radarrService.loadCredentials();
          if (radarrService.isConfigured()) {
            console.log('Loaded Radarr credentials from server, testing connection');
            await this.checkRadarrConnection();
          } else {
            console.log('No Radarr credentials found in server storage');
            this.radarrConnected = false;
          }
        } catch (error) {
          console.error('Error loading Radarr credentials:', error);
          this.radarrConnected = false;
        }
      }
      
      // If we have movies and radarrService is configured, force the state to be true
      if (this.movies.length > 0 && radarrService.isConfigured()) {
        console.log('Radarr is configured and movies are loaded, setting radarrConnected to true');
        this.radarrConnected = true;
      }
    },
    
    async handlePlexSettingsUpdated() {
      // Check if Plex service is configured in memory
      if (plexService.isConfigured()) {
        // Check the Plex connection with the new settings
        this.checkPlexConnection();
        console.log('Plex settings updated, testing connection');
        return;
      }
      
      // If not in memory, check server storage
      try {
        await this.configureServiceFromCredentials('plex');
      } catch (error) {
        console.error('Error loading Plex credentials:', error);
        this.plexConnected = false;
      }
    },
    
    async handleJellyfinSettingsUpdated() {
      // Check if Jellyfin service is configured in memory
      if (jellyfinService.isConfigured()) {
        // Check the Jellyfin connection with the new settings
        this.checkJellyfinConnection();
        console.log('Jellyfin settings updated, testing connection');
        return;
      }
      
      // If not in memory, check server storage
      try {
        await this.configureServiceFromCredentials('jellyfin');
      } catch (error) {
        console.error('Error loading Jellyfin credentials:', error);
        this.jellyfinConnected = false;
      }
    },
    
    async handleTautulliSettingsUpdated() {
      // Check if Tautulli service is configured in memory
      if (tautulliService.isConfigured()) {
        // Check the Tautulli connection with the new settings
        this.checkTautulliConnection();
        console.log('Tautulli settings updated, testing connection');
        return;
      }
      
      // If not in memory, check server storage
      try {
        await this.configureServiceFromCredentials('tautulli');
      } catch (error) {
        console.error('Error loading Tautulli credentials:', error);
        this.tautulliConnected = false;
      }
    },
    
    async handleTraktSettingsUpdated() {
      // Check if Trakt service is configured in memory
      if (traktService.isConfigured()) {
        // Check the Trakt connection with the new settings
        this.checkTraktConnection();
        console.log('Trakt settings updated, testing connection');
        return;
      }
      
      // If not in memory, check server storage
      try {
        await this.configureServiceFromCredentials('trakt');
      } catch (error) {
        console.error('Error loading Trakt credentials:', error);
        this.traktConnected = false;
      }
    },
    
    async handleLogout() {
      console.log("User clicked logout...");
      
      // Don't use await here - we'll just clear local auth data first
      // to prevent the potential circular logout request
      authService.clearLocalAuth();
      this.isAuthenticated = false;
      
      // Now call logout endpoint separately without awaiting it
      // This prevents potential 401 errors from causing a refresh loop
      authService.logoutOnServer().catch(err => {
        console.log('Logout from server failed, but local logout was successful:', err);
      });
      
      // We're preserving database settings on logout
      console.log('Database settings preserved for next login');
      
      // We're no longer resetting user data on logout
      // This preserves the user's settings between sessions
      console.log("User data and credentials preserved for next login");
      
      // Reset service configurations
      sonarrService.configure('', '');
      radarrService.configure('', '');
      plexService.configure('', '');
      jellyfinService.configure('', '', '');
      tautulliService.configure('', '');
      
      // Reset UI state
      this.sonarrConnected = false;
      this.radarrConnected = false;
      this.plexConnected = false;
      this.jellyfinConnected = false;
      this.tautulliConnected = false;
      this.traktConnected = false;
      this.series = [];
      this.movies = [];
      this.recentlyWatchedMovies = [];
      this.recentlyWatchedShows = [];
      this.jellyfinRecentlyWatchedMovies = [];
      this.jellyfinRecentlyWatchedShows = [];
      this.tautulliRecentlyWatchedMovies = [];
      this.tautulliRecentlyWatchedShows = [];
      this.traktRecentlyWatchedMovies = [];
      this.traktRecentlyWatchedShows = [];
      this.plexRecentLimit = 100;
      this.jellyfinRecentLimit = 100;
      this.tautulliRecentLimit = 50;
      this.traktRecentLimit = 50;
      this.plexHistoryMode = 'all';
      this.jellyfinHistoryMode = 'all';
      this.tautulliHistoryMode = 'all';
      this.traktHistoryMode = 'all';
      this.plexOnlyMode = false;
      this.jellyfinOnlyMode = false;
      this.tautulliOnlyMode = false;
      this.traktOnlyMode = false;
      this.showSonarrConnect = false;
      this.showRadarrConnect = false;
      this.showPlexConnect = false;
      this.showJellyfinConnect = false;
      this.showTautulliConnect = false;
      this.showTraktConnect = false;
      this.activeTab = 'tv-recommendations';
      
      // Clear the database cache to ensure a fresh load for the next user
      databaseStorageUtils.cache = {};
      databaseStorageUtils.cacheLoaded = false;
      console.log('Database cache cleared for next user login');
    }
  }
}
</script>

<style>
:root {
  /* Modern light theme - refined and clean */
  --bg-color: #f5f7fa;
  --main-bg-color: #ffffff;
  --text-color: #2c3e50;
  --header-color: #1e293b;
  --border-color: #e2e8f0;
  --card-bg-color: #ffffff;
  --card-shadow: 0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  --nav-bg-color: #1e293b;
  --nav-text-color: #94a3b8;
  --nav-active-bg: rgba(255, 255, 255, 0.1);
  --nav-hover-bg: rgba(255, 255, 255, 0.05);
  --nav-active-text: #ffffff;
  --input-bg: #ffffff;
  --input-border: #cbd5e1;
  --input-text: #334155;
  --button-primary-bg: #304156;
  --button-primary-text: white;
  --button-secondary-bg: #f1f5f9;
  --button-secondary-text: #334155;
  
  /* Theme-specific colors - slate blue accents */
  --primary-color-light: rgba(48, 65, 86, 0.1);
  --primary-color-lighter: rgba(48, 65, 86, 0.05);
  --primary-color-border: rgba(48, 65, 86, 0.2);
  --primary-color-shadow: rgba(48, 65, 86, 0.1);
  
  /* Border radius variables for consistency */
  --border-radius-sm: 3px;
  --border-radius-md: 4px;
  --border-radius-lg: 6px;
  
  /* Transition for theme changes */
  --transition-speed: 0.2s;
}

body.dark-theme {
  /* Deep dark theme with darker tones */
  --bg-color: #121212;
  --main-bg-color: #1a1a1a;
  --text-color: #d0d0d0;
  --header-color: #e8e8e8;
  --border-color: #303030;
  --card-bg-color: #202020;
  --card-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  --nav-bg-color: #0f0f0f;
  --nav-text-color: #a0a0a0;
  --nav-active-bg: rgba(48, 65, 86, 0.3);
  --nav-hover-bg: rgba(0, 0, 0, 0.2);
  --nav-active-text: #f0f0f0;
  --input-bg: #252525;
  --input-border: #404040;
  --input-text: #d0d0d0;
  --button-primary-bg: #304156;
  --button-primary-text: #f0f0f0;
  --button-secondary-bg: #282828;
  --button-secondary-text: #d0d0d0;
  
  /* Theme-specific colors - darker steel blue accents */
  --primary-color-light: rgba(48, 65, 86, 0.2);
  --primary-color-lighter: rgba(48, 65, 86, 0.08);
  --primary-color-border: rgba(48, 65, 86, 0.25);
  --primary-color-shadow: rgba(48, 65, 86, 0.2);
}

body {
  margin: 0;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-color);
}

.app-container {
  width: 100%;
  margin: 0 auto;
  padding: 10px;
  box-sizing: border-box;
  transition: max-width 0.3s ease;
  
  /* Responsive max-width based on screen size */
  max-width: min(95vw, 1600px); /* Default: 95% width but not exceeding 1600px */
}

/* Larger screens get more width */
@media (min-width: 1920px) {
  .app-container {
    max-width: min(85vw, 2400px);
  }
}

/* Very large screens get even more width */
@media (min-width: 2560px) {
  .app-container {
    max-width: min(80vw, 3000px);
  }
}

@media (min-width: 480px) {
  .app-container {
    padding: 20px;
  }
}

.app-header {
  position: relative;
  background-color: var(--main-bg-color);
  border-bottom: 1px solid var(--border-color);
  border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  padding: 12px 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.header-brand {
  display: flex;
  align-items: center;
}

@media (min-width: 480px) {
  .app-header {
    margin-bottom: 0;
    padding: 15px 20px;
  }
}

.logo {
  height: 48px;
  margin-right: 12px;
  transition: filter var(--transition-speed), box-shadow 0.3s ease, transform 0.3s ease;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.header-brand:hover .logo {
  transform: scale(1.05);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

@media (min-width: 480px) {
  .logo {
    height: 42px;
    margin-right: 10px;
  }
}

@media (min-width: 768px) {
  .logo {
    height: 48px;
    margin-right: 12px;
  }
}

body.dark-theme .logo {
  filter: brightness(1.3) contrast(1.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  border-radius: 8px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(48, 65, 86, 0.2);
  border-radius: 50%;
  border-top-color: var(--button-primary-bg);
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.loading-text {
  font-size: 18px;
  color: var(--text-color);
  margin: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

h1 {
  margin: 0;
  font-size: 18px;
  color: var(--header-color);
  transition: color var(--transition-speed);
  font-weight: 500;
  letter-spacing: 0.3px;
}

@media (min-width: 480px) {
  h1 {
    font-size: 20px;
  }
}

@media (min-width: 768px) {
  h1 {
    font-size: 22px;
  }
}

main {
  background-color: var(--main-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  overflow: visible; /* Changed from hidden to allow proper stacking */
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
  position: relative; /* Added for proper stacking context */
}

.content {
  min-height: 400px;
  will-change: opacity;
  animation: fade-in 0.2s ease-out;
  position: relative;
  z-index: 1;
}

@keyframes fade-in {
  from { opacity: 0.6; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.loading-services {
  text-align: center;
  padding: 20px;
  margin: 20px 0;
  background-color: #f8f9fa;
  border-radius: 5px;
}

.logout-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--button-secondary-bg, #f5f5f5);
  color: var(--button-secondary-text, #333);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-icon {
  font-size: 16px;
}

.logout-text {
  display: none;
}

@media (min-width: 480px) {
  .logout-button {
    padding: 8px 12px;
  }
  
  .logout-text {
    display: inline;
  }
}

.logout-button:hover {
  background-color: #d32f2f;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.choose-service {
  text-align: center;
  margin: 30px 0 20px;
  font-size: 18px;
  color: var(--text-color);
}

.service-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.service-button {
  background-color: var(--card-bg-color);
  border: 1px solid var(--button-primary-bg);
  border-radius: var(--border-radius-md);
  padding: 15px;
  color: var(--text-color);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 150px;
  flex: 1;
  max-width: 250px;
}

@media (min-width: 480px) {
  .service-button {
    padding: 18px 25px;
    font-size: 16px;
  }
}

.service-button:hover {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.service-button.plex-button {
  border-color: #CC7B19; /* Plex orange color */
}

.service-button.plex-button:hover {
  background-color: #CC7B19;
}

.service-button.jellyfin-button {
  border-color: #AA5CC3; /* Jellyfin purple color */
}

.service-button.jellyfin-button:hover {
  background-color: #AA5CC3;
}

.service-button.tautulli-button {
  border-color: #7c3aed; /* Tautulli purple color */
}

.service-button.tautulli-button:hover {
  background-color: #7c3aed;
}

.service-button.app-config-button {
  border-color: #2563eb; /* Blue color */
}

.service-button.app-config-button:hover {
  background-color: #2563eb;
}

.service-button small {
  font-weight: normal;
  opacity: 0.8;
  margin-top: 5px;
  font-size: 12px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
  backdrop-filter: blur(2px);
}

.jellyfin-user-modal, .tautulli-user-modal, .plex-user-modal {
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.tautulli-user-modal .modal-header {
  border-bottom: 2px solid #7c3aed; /* Tautulli purple color */
}

.plex-user-modal .modal-header {
  border-bottom: 2px solid #e5a00d; /* Plex orange color */
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h4 {
  margin: 0;
  font-size: 18px;
  color: var(--header-color);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 60vh;
}

.loading-users {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
}

.no-users-found {
  text-align: center;
  padding: 20px;
  color: var(--text-color);
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-color);
  font-size: 14px;
}

.user-item:hover {
  border-color: var(--button-primary-bg);
  background-color: var(--button-secondary-bg);
}

.user-item.selected {
  border-color: var(--button-primary-bg);
  background-color: rgba(67, 97, 238, 0.08);
}

.plex-user-modal .user-item:hover {
  border-color: #e5a00d;
  background-color: rgba(229, 160, 13, 0.05);
}

.plex-user-modal .user-item.selected {
  border-color: #e5a00d;
  background-color: rgba(229, 160, 13, 0.1);
}

.user-name {
  font-weight: 500;
  color: var(--text-color);
}

.user-badge {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: var(--border-radius-sm);
  font-weight: bold;
}

.user-badge.admin {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
}

.user-badge.owner {
  background-color: #e5a00d; /* Plex orange color */
  color: white;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.plex-user-modal .modal-footer {
  border-top: 1px solid var(--border-color);
}

.plex-user-modal .apply-button {
  background-color: #e5a00d;
  color: white;
}

.plex-user-modal .apply-button:hover:not(:disabled) {
  background-color: #c48b0b;
}

.config-navigation {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.nav-button {
  background-color: var(--button-secondary-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.nav-button:hover {
  background-color: var(--button-primary-bg);
  color: white;
  border-color: var(--button-primary-bg);
}

.apply-button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 8px 14px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.2px;
  transition: all 0.2s ease;
}

.apply-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.apply-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button {
  background-color: var(--button-secondary-bg);
  border: 1px solid var(--border-color);
  color: var(--button-secondary-text);
  border-radius: var(--border-radius-sm);
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background-color: rgba(0, 0, 0, 0.03);
}
</style>
