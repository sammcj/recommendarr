<template>
  <div class="app-container">
    <!-- Check if this is a Trakt callback and show the callback handler if it is -->
    <TraktCallback v-if="isTraktCallback" />
    
    <!-- Show login screen if user is not authenticated -->
    <Login v-else-if="!isAuthenticated" @authenticated="handleAuthenticated" />
    
    <!-- Regular app content if user is authenticated and it's not a callback URL -->
    <template v-else>
      <header class="app-header">
        <img alt="App logo" src="./assets/logo.png" class="logo">
        <h1>Recommendarr</h1>
        <button class="logout-button" @click="handleLogout">Logout</button>
      </header>
      
      <main>
      <!-- Always show app navigation -->
      <AppNavigation 
        :activeTab="activeTab" 
        @navigate="handleNavigate"
        @logout="handleLogout"
        @clearData="handleClearData" 
      />
      
      <!-- Content area -->
      <div class="content">
        <!-- Loading indicator -->
        <div v-if="loadingServices" class="loading-services">
          <p>Loading your saved services...</p>
        </div>
        
        <!-- Service selection -->
        <div v-else-if="!hasAnyServiceCredentials && !hasAnyServiceConnected() && activeTab !== 'settings'">
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
      
      <SonarrConnection v-if="showSonarrConnect && !sonarrConnected" @connected="handleSonarrConnected" @disconnected="handleSonarrDisconnected" />
      <RadarrConnection v-if="showRadarrConnect && !radarrConnected" @connected="handleRadarrConnected" @disconnected="handleRadarrDisconnected" />
      <PlexConnection v-if="showPlexConnect && !plexConnected" @connected="handlePlexConnected" @disconnected="handlePlexDisconnected" @limitChanged="handlePlexLimitChanged" />
      <JellyfinConnection v-if="showJellyfinConnect && !jellyfinConnected" @connected="handleJellyfinConnected" @disconnected="handleJellyfinDisconnected" @limitChanged="handleJellyfinLimitChanged" />
      <TautulliConnection v-if="showTautulliConnect && !tautulliConnected" @connected="handleTautulliConnected" @disconnected="handleTautulliDisconnected" @limitChanged="handleTautulliLimitChanged" />
      <TraktConnection v-if="showTraktConnect && !traktConnected" @connected="handleTraktConnected" @disconnected="handleTraktDisconnected" @limitChanged="handleTraktLimitChanged" />
      
        <!-- Main components rendered based on activeTab -->
        <TVRecommendations 
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
          />
          
          <TVRecommendations 
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
import TVRecommendations from './components/RequestRecommendations.vue'
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
    TVRecommendations,
    History,
    AISettings,
    Login: LoginForm
  },
  data() {
    return {
      isTraktCallback: window.location.pathname === '/trakt-callback',
      isAuthenticated: authService.isAuthenticated(),
      sonarrConnected: false,
      radarrConnected: false,
      plexConnected: false,
      jellyfinConnected: false,
      tautulliConnected: false,
      traktConnected: false,
      loadingServices: true,
      hasAnyServiceCredentials: false,
      traktRecentlyWatchedMovies: [],
      traktRecentlyWatchedShows: [],
      traktRecentLimit: 50,
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
      jellyfinUsers: [],
      jellyfinUsersLoading: false,
      tautulliUsers: [],
      tautulliUsersLoading: false,
      selectedJellyfinUserId: '',
      selectedTautulliUserId: '',
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
        // Check if services have credentials stored server-side
        // This will also set up connections and fetch data if credentials are found
        await this.checkStoredCredentials();
        
        // Load settings from localStorage
        this.loadLocalSettings();

        // Load cached watch history from localStorage first
        this.loadCachedWatchHistory();

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
      }
    } else {
      console.log('User is not authenticated, showing login form');
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
      
      // Clear all stored credentials from localStorage 
      localStorage.removeItem('sonarrBaseUrl');
      localStorage.removeItem('sonarrApiKey');
      localStorage.removeItem('radarrBaseUrl');
      localStorage.removeItem('radarrApiKey');
      localStorage.removeItem('plexBaseUrl');
      localStorage.removeItem('plexToken');
      localStorage.removeItem('plexRecentLimit');
      localStorage.removeItem('jellyfinBaseUrl');
      localStorage.removeItem('jellyfinApiKey');
      localStorage.removeItem('jellyfinUserId');
      localStorage.removeItem('jellyfinRecentLimit');
      localStorage.removeItem('tautulliBaseUrl');
      localStorage.removeItem('tautulliApiKey');
      localStorage.removeItem('tautulliRecentLimit');
      localStorage.removeItem('traktClientId');
      localStorage.removeItem('traktAccessToken');
      localStorage.removeItem('traktRecentLimit');
      localStorage.removeItem('openaiApiKey');
      localStorage.removeItem('openaiModel');
      localStorage.removeItem('plexHistoryMode');
      localStorage.removeItem('jellyfinHistoryMode');
      localStorage.removeItem('tautulliHistoryMode');
      localStorage.removeItem('traktHistoryMode');
      localStorage.removeItem('plexOnlyMode');
      localStorage.removeItem('jellyfinOnlyMode');
      localStorage.removeItem('tautulliOnlyMode');
      localStorage.removeItem('traktOnlyMode');
      
      // Also clear recommendation history and preferences
      localStorage.removeItem('previousTVRecommendations');
      localStorage.removeItem('previousMovieRecommendations');
      localStorage.removeItem('currentTVRecommendations');
      localStorage.removeItem('currentMovieRecommendations');
      localStorage.removeItem('likedTVRecommendations');
      localStorage.removeItem('dislikedTVRecommendations');
      localStorage.removeItem('likedMovieRecommendations');
      localStorage.removeItem('dislikedMovieRecommendations');
      
      // Additional localStorage history that might exist
      localStorage.removeItem('historyColumnsCount');
      
      // Clear cached watch history
      localStorage.removeItem('watchHistoryMovies');
      localStorage.removeItem('watchHistoryShows');
      localStorage.removeItem('jellyfinWatchHistoryMovies');
      localStorage.removeItem('jellyfinWatchHistoryShows');
      localStorage.removeItem('tautulliWatchHistoryMovies');
      localStorage.removeItem('tautulliWatchHistoryShows');
      localStorage.removeItem('traktWatchHistoryMovies');
      localStorage.removeItem('traktWatchHistoryShows');
      
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
    async fetchAIModels() {
      try {
        console.log('Attempting to fetch AI models...');
        // Check if OpenAI service is configured first
        if (openAIService.isConfigured()) {
          console.log('OpenAI service is configured, fetching models...');
          const models = await openAIService.fetchModels();
          console.log(`Successfully fetched ${models.length} AI models`);
        } else {
          console.log('OpenAI service is not configured yet');
          // First try to load credentials
          await openAIService.loadCredentials();
          
          // Check again after loading credentials
          if (openAIService.isConfigured()) {
            console.log('OpenAI service is now configured after loading credentials, fetching models...');
            const models = await openAIService.fetchModels();
            console.log(`Successfully fetched ${models.length} AI models`);
          } else {
            console.log('OpenAI service still not configured after loading credentials');
          }
        }
      } catch (error) {
        console.error('Error fetching AI models:', error);
        // Don't show error to user as this is a background task
      }
    },
    
    // Handle successful authentication
    async handleAuthenticated() {
      console.log('User authenticated successfully');
      this.isAuthenticated = true;
      
      // Set auth header for API requests
      authService.setAuthHeader();
      console.log('Auth header set after login');
      
      try {
        // Try to fetch AI models after login to check if OpenAI is configured
        this.fetchAIModels();
        
        // Load data after authentication
        console.log('Loading data after authentication...');
        await this.checkStoredCredentials();
        
        // Load settings from localStorage
        this.loadLocalSettings();

        // Load cached watch history
        this.loadCachedWatchHistory();
        
        console.log('Data loaded successfully after authentication');
      } catch (error) {
        console.error('Error loading data after authentication:', error);
      }
    },
    
    // Load cached watch history from localStorage
    loadCachedWatchHistory() {
      try {
        // Try to load movies watch history from localStorage
        const cachedMoviesHistory = localStorage.getItem('watchHistoryMovies');
        if (cachedMoviesHistory) {
          this.recentlyWatchedMovies = JSON.parse(cachedMoviesHistory);
          console.log(`Loaded ${this.recentlyWatchedMovies.length} movies from localStorage cache`);
        }
        
        // Try to load shows watch history from localStorage
        const cachedShowsHistory = localStorage.getItem('watchHistoryShows');
        if (cachedShowsHistory) {
          this.recentlyWatchedShows = JSON.parse(cachedShowsHistory);
          console.log(`Loaded ${this.recentlyWatchedShows.length} shows from localStorage cache`);
        }

        // Try to load jellyfin history
        const cachedJellyfinMoviesHistory = localStorage.getItem('jellyfinWatchHistoryMovies');
        if (cachedJellyfinMoviesHistory) {
          this.jellyfinRecentlyWatchedMovies = JSON.parse(cachedJellyfinMoviesHistory);
          console.log(`Loaded ${this.jellyfinRecentlyWatchedMovies.length} Jellyfin movies from localStorage cache`);
        }

        const cachedJellyfinShowsHistory = localStorage.getItem('jellyfinWatchHistoryShows');
        if (cachedJellyfinShowsHistory) {
          this.jellyfinRecentlyWatchedShows = JSON.parse(cachedJellyfinShowsHistory);
          console.log(`Loaded ${this.jellyfinRecentlyWatchedShows.length} Jellyfin shows from localStorage cache`);
        }

        // Try to load tautulli history
        const cachedTautulliMoviesHistory = localStorage.getItem('tautulliWatchHistoryMovies');
        if (cachedTautulliMoviesHistory) {
          this.tautulliRecentlyWatchedMovies = JSON.parse(cachedTautulliMoviesHistory);
          console.log(`Loaded ${this.tautulliRecentlyWatchedMovies.length} Tautulli movies from localStorage cache`);
        }

        const cachedTautulliShowsHistory = localStorage.getItem('tautulliWatchHistoryShows');
        if (cachedTautulliShowsHistory) {
          this.tautulliRecentlyWatchedShows = JSON.parse(cachedTautulliShowsHistory);
          console.log(`Loaded ${this.tautulliRecentlyWatchedShows.length} Tautulli shows from localStorage cache`);
        }

        // Try to load trakt history
        const cachedTraktMoviesHistory = localStorage.getItem('traktWatchHistoryMovies');
        if (cachedTraktMoviesHistory) {
          this.traktRecentlyWatchedMovies = JSON.parse(cachedTraktMoviesHistory);
          console.log(`Loaded ${this.traktRecentlyWatchedMovies.length} Trakt movies from localStorage cache`);
        }

        const cachedTraktShowsHistory = localStorage.getItem('traktWatchHistoryShows');
        if (cachedTraktShowsHistory) {
          this.traktRecentlyWatchedShows = JSON.parse(cachedTraktShowsHistory);
          console.log(`Loaded ${this.traktRecentlyWatchedShows.length} Trakt shows from localStorage cache`);
        }

        // Also try to load from server if available
        this.loadWatchHistoryFromServer();
      } catch (error) {
        console.error('Error loading cached watch history from localStorage:', error);
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

    // Fetch watch history from all connected services and store it
    async fetchAndStoreWatchHistory() {
      console.log('Fetching watch history from all connected services...');
      const fetchPromises = [];

      // Plex
      if (this.plexConnected) {
        fetchPromises.push(this.fetchPlexData().then(() => {
          if (this.recentlyWatchedMovies && this.recentlyWatchedMovies.length > 0) {
            this.recentlyWatchedMovies.forEach(item => item.source = 'plex');
            localStorage.setItem('watchHistoryMovies', JSON.stringify(this.recentlyWatchedMovies));
          }
          if (this.recentlyWatchedShows && this.recentlyWatchedShows.length > 0) {
            this.recentlyWatchedShows.forEach(item => item.source = 'plex');
            localStorage.setItem('watchHistoryShows', JSON.stringify(this.recentlyWatchedShows));
          }
        }));
      }

      // Jellyfin
      if (this.jellyfinConnected) {
        fetchPromises.push(this.fetchJellyfinData().then(() => {
          if (this.jellyfinRecentlyWatchedMovies && this.jellyfinRecentlyWatchedMovies.length > 0) {
            this.jellyfinRecentlyWatchedMovies.forEach(item => item.source = 'jellyfin');
            localStorage.setItem('jellyfinWatchHistoryMovies', JSON.stringify(this.jellyfinRecentlyWatchedMovies));
          }
          if (this.jellyfinRecentlyWatchedShows && this.jellyfinRecentlyWatchedShows.length > 0) {
            this.jellyfinRecentlyWatchedShows.forEach(item => item.source = 'jellyfin');
            localStorage.setItem('jellyfinWatchHistoryShows', JSON.stringify(this.jellyfinRecentlyWatchedShows));
          }
        }));
      }

      // Tautulli
      if (this.tautulliConnected) {
        fetchPromises.push(this.fetchTautulliData().then(() => {
          if (this.tautulliRecentlyWatchedMovies && this.tautulliRecentlyWatchedMovies.length > 0) {
            this.tautulliRecentlyWatchedMovies.forEach(item => item.source = 'tautulli');
            localStorage.setItem('tautulliWatchHistoryMovies', JSON.stringify(this.tautulliRecentlyWatchedMovies));
          }
          if (this.tautulliRecentlyWatchedShows && this.tautulliRecentlyWatchedShows.length > 0) {
            this.tautulliRecentlyWatchedShows.forEach(item => item.source = 'tautulli');
            localStorage.setItem('tautulliWatchHistoryShows', JSON.stringify(this.tautulliRecentlyWatchedShows));
          }
        }));
      }

      // Trakt
      if (this.traktConnected) {
        fetchPromises.push(this.fetchTraktData().then(() => {
          if (this.traktRecentlyWatchedMovies && this.traktRecentlyWatchedMovies.length > 0) {
            this.traktRecentlyWatchedMovies.forEach(item => item.source = 'trakt');
            localStorage.setItem('traktWatchHistoryMovies', JSON.stringify(this.traktRecentlyWatchedMovies));
          }
          if (this.traktRecentlyWatchedShows && this.traktRecentlyWatchedShows.length > 0) {
            this.traktRecentlyWatchedShows.forEach(item => item.source = 'trakt');
            localStorage.setItem('traktWatchHistoryShows', JSON.stringify(this.traktRecentlyWatchedShows));
          }
        }));
      }

      try {
        // Wait for all fetches to complete
        await Promise.all(fetchPromises);
        console.log('All watch history fetched and stored locally');

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

    // Load settings from localStorage
    loadLocalSettings() {
      // Load Plex recent limit from localStorage if available
      const savedPlexLimit = localStorage.getItem('plexRecentLimit');
      if (savedPlexLimit) {
        this.plexRecentLimit = parseInt(savedPlexLimit, 10);
      }
      
      // Load Jellyfin recent limit from localStorage if available
      const savedJellyfinLimit = localStorage.getItem('jellyfinRecentLimit');
      if (savedJellyfinLimit) {
        this.jellyfinRecentLimit = parseInt(savedJellyfinLimit, 10);
      }
      
      // Load Plex history mode from localStorage if available
      const savedPlexHistoryMode = localStorage.getItem('plexHistoryMode');
      if (savedPlexHistoryMode) {
        this.plexHistoryMode = savedPlexHistoryMode;
      }
      
      // Load Jellyfin history mode from localStorage if available
      const savedJellyfinHistoryMode = localStorage.getItem('jellyfinHistoryMode');
      if (savedJellyfinHistoryMode) {
        this.jellyfinHistoryMode = savedJellyfinHistoryMode;
      }
      
      // Load Plex only mode from localStorage if available
      const savedPlexOnlyMode = localStorage.getItem('plexOnlyMode');
      if (savedPlexOnlyMode) {
        this.plexOnlyMode = savedPlexOnlyMode === 'true';
      }
      
      // Load Jellyfin only mode from localStorage if available
      const savedJellyfinOnlyMode = localStorage.getItem('jellyfinOnlyMode');
      if (savedJellyfinOnlyMode) {
        this.jellyfinOnlyMode = savedJellyfinOnlyMode === 'true';
      }
      
      // Load Tautulli history mode from localStorage if available
      const savedTautulliHistoryMode = localStorage.getItem('tautulliHistoryMode');
      if (savedTautulliHistoryMode) {
        this.tautulliHistoryMode = savedTautulliHistoryMode;
      }
      
      // Load Tautulli only mode from localStorage if available
      const savedTautulliOnlyMode = localStorage.getItem('tautulliOnlyMode');
      if (savedTautulliOnlyMode) {
        this.tautulliOnlyMode = savedTautulliOnlyMode === 'true';
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
              await plexService.configure(credentials.baseUrl, credentials.token);
              const success = await plexService.testConnection();
              if (success) {
                this.plexConnected = true;
                this.fetchPlexData();
              }
            }
            break;
            
          case 'jellyfin':
            if (credentials.baseUrl && credentials.apiKey && credentials.userId) {
              await jellyfinService.configure(credentials.baseUrl, credentials.apiKey, credentials.userId);
              const result = await jellyfinService.testConnection();
              if (result.success) {
                this.jellyfinConnected = true;
                this.fetchJellyfinData();
              }
            }
            break;
            
          case 'tautulli':
            if (credentials.baseUrl && credentials.apiKey) {
              await tautulliService.configure(credentials.baseUrl, credentials.apiKey);
              const success = await tautulliService.testConnection();
              if (success) {
                this.tautulliConnected = true;
                this.fetchTautulliData();
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
      
      // Clean up localStorage (for backwards compatibility)
      localStorage.removeItem('sonarrBaseUrl');
      localStorage.removeItem('sonarrApiKey');
      
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
      
      // Clean up localStorage (for backwards compatibility)
      localStorage.removeItem('radarrBaseUrl');
      localStorage.removeItem('radarrApiKey');
      
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
      
      // Clean up localStorage (for backwards compatibility)
      localStorage.removeItem('plexBaseUrl');
      localStorage.removeItem('plexToken');
      localStorage.removeItem('plexRecentLimit');
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('plex');
    },
    
    async handleJellyfinDisconnected() {
      this.jellyfinConnected = false;
      this.showJellyfinConnect = false; // Don't show connect modal
      this.jellyfinRecentlyWatchedMovies = [];
      this.jellyfinRecentlyWatchedShows = [];
      
      // Clean up localStorage (for backwards compatibility)
      localStorage.removeItem('jellyfinBaseUrl');
      localStorage.removeItem('jellyfinApiKey');
      localStorage.removeItem('jellyfinUserId');
      localStorage.removeItem('jellyfinRecentLimit');
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('jellyfin');
    },
    
    async handleTautulliDisconnected() {
      this.tautulliConnected = false;
      this.showTautulliConnect = false; // Don't show connect modal
      this.tautulliRecentlyWatchedMovies = [];
      this.tautulliRecentlyWatchedShows = [];
      
      // Clean up localStorage
      localStorage.removeItem('tautulliBaseUrl');
      localStorage.removeItem('tautulliApiKey');
      localStorage.removeItem('tautulliRecentLimit');
      
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
      
      // Clean up localStorage
      localStorage.removeItem('traktClientId');
      localStorage.removeItem('traktAccessToken');
      localStorage.removeItem('traktRecentLimit');
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('trakt');
    },
    
    async traktLimitChangeHandler(limit) {
      this.traktRecentLimit = limit;
      await this.fetchTraktData();
    },
    
    async fetchTraktData() {
      console.log('🔄 fetchTraktData called - refreshing Trakt history data');
      
      if (!traktService.isConfigured()) {
        console.log('❌ Trakt service is not configured, skipping data fetch');
        return;
      }
      
      try {
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
      } catch (error) {
        console.error('Failed to fetch Trakt watch history:', error);
      }
    },
    
    async openJellyfinUserSelect() {
      this.showJellyfinUserSelect = true;
      this.jellyfinUsersLoading = true;
      this.jellyfinUsers = [];
      this.selectedJellyfinUserId = jellyfinService.userId;
      
      try {
        this.jellyfinUsers = await jellyfinService.getUsers();
      } catch (error) {
        console.error('Error fetching Jellyfin users:', error);
      } finally {
        this.jellyfinUsersLoading = false;
      }
    },
    
    closeJellyfinUserSelect() {
      this.showJellyfinUserSelect = false;
    },
    
    selectJellyfinUser(user) {
      this.selectedJellyfinUserId = user.id;
    },
    
    async applyJellyfinUserSelection() {
      if (!this.selectedJellyfinUserId) return;
      
      // Save current history limit to ensure it persists across user changes
      localStorage.setItem('jellyfinHistoryLimit', this.jellyfinRecentLimit.toString());
      
      // Update the Jellyfin service with the new user ID
      jellyfinService.configure(
        jellyfinService.baseUrl,
        jellyfinService.apiKey,
        this.selectedJellyfinUserId
      );
      
      // Close the modal
      this.showJellyfinUserSelect = false;
      
      // Fetch updated watch history
      this.fetchJellyfinData();
    },
    
    async openTautulliUserSelect() {
      this.showTautulliUserSelect = true;
      this.tautulliUsersLoading = true;
      this.tautulliUsers = [];
      this.selectedTautulliUserId = '';
      
      try {
        this.tautulliUsers = await tautulliService.getUsers();
      } catch (error) {
        console.error('Error fetching Tautulli users:', error);
      } finally {
        this.tautulliUsersLoading = false;
      }
    },
    
    closeTautulliUserSelect() {
      this.showTautulliUserSelect = false;
    },
    
    selectTautulliUser(user) {
      this.selectedTautulliUserId = user.user_id;
    },
    
    applyTautulliUserSelection() {
      if (!this.selectedTautulliUserId) return;
      
      // Save current history limit to ensure it persists
      localStorage.setItem('tautulliRecentLimit', this.tautulliRecentLimit.toString());
      
      // Close the modal
      this.showTautulliUserSelect = false;
      
      // Fetch updated watch history with the new user filter
      this.fetchTautulliData(this.selectedTautulliUserId);
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
          this.fetchPlexData();
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
          this.fetchJellyfinData();
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
          this.fetchTautulliData();
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
    handleNavigate(tab) {
      this.activeTab = tab;
      
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
    
    async fetchPlexData() {
      if (!plexService.isConfigured()) {
        return;
      }
      
      try {
        // Determine if we should apply a days filter based on the history mode
        const daysAgo = this.plexHistoryMode === 'recent' ? 30 : 0;
        
        // Fetch both shows and movies in parallel for efficiency
        const [moviesResponse, showsResponse] = await Promise.all([
          plexService.getRecentlyWatchedMovies(this.plexRecentLimit, daysAgo),
          plexService.getRecentlyWatchedShows(this.plexRecentLimit, daysAgo)
        ]);
        
        this.recentlyWatchedMovies = moviesResponse;
        this.recentlyWatchedShows = showsResponse;
        
        console.log('Fetched Plex watch history:', {
          movies: this.recentlyWatchedMovies,
          shows: this.recentlyWatchedShows
        });
      } catch (error) {
        console.error('Failed to fetch Plex watch history:', error);
      }
    },
    
    async fetchJellyfinData() {
      if (!jellyfinService.isConfigured()) {
        return;
      }
      
      try {
        // Determine if we should apply a days filter based on the history mode
        const daysAgo = this.jellyfinHistoryMode === 'recent' ? 30 : 0;
        
        // Fetch both shows and movies in parallel for efficiency
        const [moviesResponse, showsResponse] = await Promise.all([
          jellyfinService.getRecentlyWatchedMovies(this.jellyfinRecentLimit, daysAgo),
          jellyfinService.getRecentlyWatchedShows(this.jellyfinRecentLimit, daysAgo)
        ]);
        
        this.jellyfinRecentlyWatchedMovies = moviesResponse;
        this.jellyfinRecentlyWatchedShows = showsResponse;
        
        console.log('Fetched Jellyfin watch history:', {
          movies: this.jellyfinRecentlyWatchedMovies,
          shows: this.jellyfinRecentlyWatchedShows
        });
      } catch (error) {
        console.error('Failed to fetch Jellyfin watch history:', error);
      }
    },
    
    async fetchTautulliData(userId = null) {
      if (!tautulliService.isConfigured()) {
        return;
      }
      
      try {
        // Determine if we should apply a days filter based on the history mode
        const daysAgo = this.tautulliHistoryMode === 'recent' ? 30 : 0;
        
        // Fetch both shows and movies in parallel for efficiency
        const [moviesResponse, showsResponse] = await Promise.all([
          tautulliService.getRecentlyWatchedMovies(this.tautulliRecentLimit, daysAgo, userId),
          tautulliService.getRecentlyWatchedShows(this.tautulliRecentLimit, daysAgo, userId)
        ]);
        
        this.tautulliRecentlyWatchedMovies = moviesResponse;
        this.tautulliRecentlyWatchedShows = showsResponse;
        
        console.log('Fetched Tautulli watch history:', {
          movies: this.tautulliRecentlyWatchedMovies,
          shows: this.tautulliRecentlyWatchedShows,
          userId: userId || 'all users' 
        });
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
      
      // Ask for confirmation
      if (!confirm('Are you sure you want to log out? Your saved connections will remain available when you log back in.')) {
        return;
      }
      
      // Don't use await here - we'll just clear local auth data first
      // to prevent the potential circular logout request
      authService.clearLocalAuth();
      this.isAuthenticated = false;
      
      // Now call logout endpoint separately without awaiting it
      // This prevents potential 401 errors from causing a refresh loop
      authService.logoutOnServer().catch(err => {
        console.log('Logout from server failed, but local logout was successful:', err);
      });
      
      // Clear all stored credentials from localStorage (for backwards compatibility)
      localStorage.removeItem('sonarrBaseUrl');
      localStorage.removeItem('sonarrApiKey');
      localStorage.removeItem('radarrBaseUrl');
      localStorage.removeItem('radarrApiKey');
      localStorage.removeItem('plexBaseUrl');
      localStorage.removeItem('plexToken');
      localStorage.removeItem('plexRecentLimit');
      localStorage.removeItem('jellyfinBaseUrl');
      localStorage.removeItem('jellyfinApiKey');
      localStorage.removeItem('jellyfinUserId');
      localStorage.removeItem('jellyfinRecentLimit');
      localStorage.removeItem('tautulliBaseUrl');
      localStorage.removeItem('tautulliApiKey');
      localStorage.removeItem('tautulliRecentLimit');
      localStorage.removeItem('traktClientId');
      localStorage.removeItem('traktAccessToken');
      localStorage.removeItem('traktRecentLimit');
      localStorage.removeItem('openaiApiKey');
      localStorage.removeItem('openaiModel');
      localStorage.removeItem('plexHistoryMode');
      localStorage.removeItem('jellyfinHistoryMode');
      localStorage.removeItem('tautulliHistoryMode');
      localStorage.removeItem('traktHistoryMode');
      localStorage.removeItem('plexOnlyMode');
      localStorage.removeItem('jellyfinOnlyMode');
      localStorage.removeItem('tautulliOnlyMode');
      localStorage.removeItem('traktOnlyMode');
      
      // Also clear recommendation history and preferences
      // Remove from localStorage as well to ensure clear doesn't persist after reload
      localStorage.removeItem('previousTVRecommendations');
      localStorage.removeItem('previousMovieRecommendations');
      localStorage.removeItem('currentTVRecommendations');
      localStorage.removeItem('currentMovieRecommendations');
      localStorage.removeItem('likedTVRecommendations');
      localStorage.removeItem('dislikedTVRecommendations');
      localStorage.removeItem('likedMovieRecommendations');
      localStorage.removeItem('dislikedMovieRecommendations');
      
      // Additional localStorage history that might exist
      localStorage.removeItem('historyColumnsCount');
      
      // Clear cached watch history
      localStorage.removeItem('watchHistoryMovies');
      localStorage.removeItem('watchHistoryShows');
      localStorage.removeItem('jellyfinWatchHistoryMovies');
      localStorage.removeItem('jellyfinWatchHistoryShows');
      localStorage.removeItem('tautulliWatchHistoryMovies');
      localStorage.removeItem('tautulliWatchHistoryShows');
      localStorage.removeItem('traktWatchHistoryMovies');
      localStorage.removeItem('traktWatchHistoryShows');
      
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
    }
  }
}
</script>

<style>
:root {
  /* Light theme (default) */
  --bg-color: #f5f5f5;
  --main-bg-color: #ffffff;
  --text-color: #2c3e50;
  --header-color: #2c3e50;
  --border-color: #ddd;
  --card-bg-color: #ffffff;
  --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  --nav-bg-color: #2c3e50;
  --nav-text-color: #ccc;
  --nav-active-bg: rgba(255, 255, 255, 0.2);
  --nav-hover-bg: rgba(255, 255, 255, 0.1);
  --nav-active-text: #ffffff;
  --input-bg: #ffffff;
  --input-border: #ddd;
  --input-text: #333;
  --button-primary-bg: #4CAF50;
  --button-primary-text: white;
  --button-secondary-bg: #f0f0f0;
  --button-secondary-text: #333;
  
  /* Transition for theme changes */
  --transition-speed: 0.3s;
}

body.dark-theme {
  /* Dark theme */
  --bg-color: #1a1a1a;
  --main-bg-color: #2a2a2a;
  --text-color: #e0e0e0;
  --header-color: #e0e0e0;
  --border-color: #444;
  --card-bg-color: #333;
  --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  --nav-bg-color: #222;
  --nav-text-color: #aaa;
  --nav-active-bg: rgba(255, 255, 255, 0.15);
  --nav-hover-bg: rgba(255, 255, 255, 0.05);
  --nav-active-text: #ffffff;
  --input-bg: #3a3a3a;
  --input-border: #555;
  --input-text: #e0e0e0;
  --button-primary-bg: #388E3C;
  --button-primary-text: white;
  --button-secondary-bg: #444;
  --button-secondary-text: #e0e0e0;
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
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  padding: 10px;
  box-sizing: border-box;
}

@media (min-width: 480px) {
  .app-container {
    padding: 20px;
  }
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  padding: 20px 0 0 0;
  position: relative;
}

@media (min-width: 480px) {
  .app-header {
    margin-bottom: 30px;
  }
}

.logo {
  height: 40px;
  margin-right: 10px;
  transition: filter var(--transition-speed);
}

@media (min-width: 480px) {
  .logo {
    height: 60px;
    margin-right: 15px;
  }
}

body.dark-theme .logo {
  filter: brightness(0.9);
}

h1 {
  margin: 0;
  font-size: 22px;
  color: var(--header-color);
  transition: color var(--transition-speed);
  font-weight: 600;
}

@media (min-width: 480px) {
  h1 {
    font-size: 28px;
  }
}

main {
  background-color: var(--main-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.content {
  min-height: 400px;
}

.loading-services {
  text-align: center;
  padding: 20px;
  margin: 20px 0;
  background-color: #f8f9fa;
  border-radius: 5px;
}

.logout-button {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--button-secondary-bg, #f5f5f5);
  color: var(--button-secondary-text, #333);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  padding: 8px 15px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.logout-button:hover {
  background-color: #d32f2f;
  color: white;
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
  border: 2px solid var(--button-primary-bg);
  border-radius: 8px;
  padding: 15px;
  color: var(--text-color);
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 150px;
  flex: 1;
  max-width: 250px;
}

@media (min-width: 480px) {
  .service-button {
    padding: 20px 30px;
    font-size: 16px;
  }
}

.service-button:hover {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.jellyfin-user-modal, .tautulli-user-modal {
  background-color: var(--card-bg-color);
  border-radius: 8px;
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
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-color);
}

.user-item:hover {
  border-color: var(--button-primary-bg);
  background-color: var(--button-secondary-bg);
}

.user-item.selected {
  border-color: var(--button-primary-bg);
  background-color: rgba(76, 175, 80, 0.1);
}

.user-name {
  font-weight: 500;
  color: var(--text-color);
}

.user-badge {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: bold;
}

.user-badge.admin {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  border-radius: 4px;
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
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
}

.apply-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button {
  background-color: var(--button-secondary-bg);
  border: 1px solid var(--border-color);
  color: var(--button-secondary-text);
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}
</style>
