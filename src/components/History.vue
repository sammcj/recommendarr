<template>
  <div class="history-container">
    <!-- Notification message -->
    <div v-if="notification" class="notification" :class="notification.type">
      <span class="notification-message">{{ notification.message }}</span>
      <button class="notification-close" @click="dismissNotification">×</button>
    </div>
    
    <h2>Your Recommendation History</h2>
    <p class="history-user-info" v-if="username">Viewing history for user: {{ username }}</p>
    
    <div class="history-controls">
      <div class="view-toggle">
        <button 
          @click="activeView = 'tv'" 
          :class="{ active: activeView === 'tv' }"
          class="toggle-button"
        >
          <span class="toggle-icon">📺</span>
          <span>TV Shows</span>
        </button>
        <button 
          @click="activeView = 'movies'" 
          :class="{ active: activeView === 'movies' }"
          class="toggle-button"
        >
          <span class="toggle-icon">🎬</span>
          <span>Movies</span>
        </button>
        <button 
          @click="activeView = 'combined'" 
          :class="{ active: activeView === 'combined' }"
          class="toggle-button"
        >
          <span class="toggle-icon">🔄</span>
          <span>Combined</span>
        </button>
      </div>
      
      <div class="clear-buttons">
        <button 
          v-if="activeView === 'tv' || activeView === 'combined'" 
          @click="clearTVHistory" 
          class="clear-button"
        >
          <span class="clear-icon">🗑️</span>
          <span>Clear TV History</span>
        </button>
        <button 
          v-if="activeView === 'movies' || activeView === 'combined'" 
          @click="clearMovieHistory" 
          class="clear-button"
        >
          <span class="clear-icon">🗑️</span>
          <span>Clear Movie History</span>
        </button>
      </div>
    </div>
    
    <div class="history-stats">
      <div class="history-stats-row">
        <div v-if="activeView === 'tv' || activeView === 'combined'" class="stat-item">
          <span class="stat-icon">📺</span>
          <span>
            {{ hideExistingContent ? filteredTVRecommendations.length : tvRecommendations.length }} 
            TV shows{{ hideExistingContent ? ' (filtered)' : '' }}
          </span>
        </div>
        <div v-if="activeView === 'movies' || activeView === 'combined'" class="stat-item">
          <span class="stat-icon">🎬</span>
          <span>
            {{ hideExistingContent ? filteredMovieRecommendations.length : movieRecommendations.length }} 
            movies{{ hideExistingContent ? ' (filtered)' : '' }}
          </span>
        </div>
        <div v-if="activeView === 'combined'" class="stat-item total">
          <span class="stat-icon">🔄</span>
          <span>
            {{ hideExistingContent ? 
              (filteredTVRecommendations.length + filteredMovieRecommendations.length) : 
              (tvRecommendations.length + movieRecommendations.length) 
            }} 
            total items{{ hideExistingContent ? ' (filtered)' : '' }}
          </span>
        </div>
      </div>
      
      <div class="history-controls-row">
        <div class="columns-control">
          <label for="columnsAdjuster">Posters per row: {{ columnsCount }}</label>
          <input 
            type="range" 
            id="columnsAdjuster" 
            v-model.number="columnsCount" 
            min="1" 
            max="10" 
            @change="saveColumnsCount"
            class="columns-slider"
          >
        </div>
        
        <div class="filter-controls">
          <label class="filter-label">
            <input 
              type="checkbox" 
              v-model="hideExistingContent" 
              @change="handleFilterChange"
            >
            Hide items in your library
          </label>
          
          <label class="filter-label">
            <input 
              type="checkbox" 
              v-model="hideLikedContent" 
              @change="handleFilterChange"
            >
            Hide liked items
          </label>
          
          <label class="filter-label">
            <input 
              type="checkbox" 
              v-model="hideDislikedContent" 
              @change="handleFilterChange"
            >
            Hide disliked items
          </label>
          
          <label class="filter-label">
            <input 
              type="checkbox" 
              v-model="hideHiddenContent" 
              @change="handleFilterChange"
            >
            Hide hidden items
          </label>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <span>Loading recommendation history...</span>
    </div>
    
    <div v-else-if="noHistory" class="no-history">
      <p>No recommendation history found. Try getting some recommendations first!</p>
    </div>
    
    <div v-else class="history-list">
      <div v-if="activeView === 'tv' || activeView === 'combined'" class="history-section">
        <h3 v-if="activeView === 'combined'">TV Show Recommendations</h3>
        <div v-if="(hideExistingContent ? filteredTVRecommendations : tvRecommendations).length === 0" class="empty-section">
          <p v-if="tvRecommendations.length === 0">No TV show recommendations in history.</p>
          <p v-else>No TV shows to display with current filter settings.</p>
        </div>
        <div v-else class="recommendation-grid" :style="{ gridTemplateColumns: gridTemplateStyle }">
          <div 
            v-for="(show, index) in displayedTVShows" 
            :key="`tv-${index}`" 
            class="recommendation-item"
            ref="tvItem"
            :data-index="index"
          >
            <div class="poster-container">
              <div 
                class="poster" 
                :style="getPosterStyle(show, 'tv')"
                :class="{ 'poster-loading': isLoadingPoster(show, 'tv'), 'clickable': isTMDBAvailable }"
                @click="openTMDBDetailModal(show, 'tv')"
                :title="isTMDBAvailable ? 'Click for more details' : ''"
              >
                <div v-if="isLoadingPoster(show, 'tv')" class="poster-loading-overlay">
                  <div class="poster-loading-spinner"></div>
                </div>
                <div v-if="!posterExists(show, 'tv') && !isLoadingPoster(show, 'tv')" class="poster-retry">
                  <button @click="retryLoadPoster(show, 'tv')" class="retry-button">
                    <span class="retry-icon">🔄</span>
                    <span>Retry</span>
                  </button>
                </div>
              </div>
              <div class="item-title">{{ typeof show === 'string' ? show : String(show || 'Unknown') }}</div>
              <div v-if="tvShowDetails[show]" class="item-description">
                <div v-if="tvShowDetails[show].overview" class="item-overview">
                  {{ truncateText(tvShowDetails[show].overview, 120) }}
                </div>
                <div v-if="tvShowDetails[show].year" class="item-year">
                  {{ tvShowDetails[show].year }}
                </div>
              </div>
              <div class="item-actions">
                <button 
                  v-if="sonarrConfigured"
                  @click="addToSonarr(show)" 
                  :disabled="checkingShowExistence[show] || addingSeries[show]"
                  class="add-button"
                >
                  <span v-if="addingSeries[show]" class="adding-icon">⏳</span>
                  <span v-else-if="checkingShowExistence[show]" class="checking-icon">🔍</span>
                  <span v-else>Add to Sonarr</span>
                </button>
                
                <button 
                  v-if="!isHidden(show, 'tv')"
                  @click="hideItem(show, 'tv')" 
                  class="hide-button"
                  title="Hide this show from history view"
                >
                  <span class="hide-icon">🙈</span>
                  <span>Hide</span>
                </button>
                
                <button 
                  v-else
                  @click="unhideItem(show, 'tv')" 
                  class="unhide-button"
                  title="Show this item in history view again"
                >
                  <span class="unhide-icon">👁️</span>
                  <span>Unhide</span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="hasMoreTVShows" class="loading-more-container" ref="tvLoadMoreTrigger">
            <div class="loading-more-spinner"></div>
            <span>Loading more...</span>
          </div>
        </div>
      </div>
      
      <div v-if="activeView === 'movies' || activeView === 'combined'" class="history-section">
        <h3 v-if="activeView === 'combined'">Movie Recommendations</h3>
        <div v-if="(hideExistingContent ? filteredMovieRecommendations : movieRecommendations).length === 0" class="empty-section">
          <p v-if="movieRecommendations.length === 0">No movie recommendations in history.</p>
          <p v-else>No movies to display with current filter settings.</p>
        </div>
        <div v-else class="recommendation-grid" :style="{ gridTemplateColumns: gridTemplateStyle }">
          <div 
            v-for="(movie, index) in displayedMovies" 
            :key="`movie-${index}`" 
            class="recommendation-item"
            ref="movieItem"
            :data-index="index"
          >
            <div class="poster-container">
              <div 
                class="poster" 
                :style="getPosterStyle(movie, 'movie')"
                :class="{ 'poster-loading': isLoadingPoster(movie, 'movie'), 'clickable': isTMDBAvailable }"
                @click="openTMDBDetailModal(movie, 'movie')"
                :title="isTMDBAvailable ? 'Click for more details' : ''"
              >
                <div v-if="isLoadingPoster(movie, 'movie')" class="poster-loading-overlay">
                  <div class="poster-loading-spinner"></div>
                </div>
                <div v-if="!posterExists(movie, 'movie') && !isLoadingPoster(movie, 'movie')" class="poster-retry">
                  <button @click="retryLoadPoster(movie, 'movie')" class="retry-button">
                    <span class="retry-icon">🔄</span>
                    <span>Retry</span>
                  </button>
                </div>
              </div>
              <div class="item-title">{{ typeof movie === 'string' ? movie : String(movie || 'Unknown') }}</div>
              <div v-if="movieDetails[movie]" class="item-description">
                <div v-if="movieDetails[movie].overview" class="item-overview">
                  {{ truncateText(movieDetails[movie].overview, 120) }}
                </div>
                <div v-if="movieDetails[movie].year" class="item-year">
                  {{ movieDetails[movie].year }}
                </div>
              </div>
              <div class="item-actions">
                <button 
                  v-if="radarrConfigured"
                  @click="addToRadarr(movie)" 
                  :disabled="checkingMovieExistence[movie] || addingMovie[movie]"
                  class="add-button"
                >
                  <span v-if="addingMovie[movie]" class="adding-icon">⏳</span>
                  <span v-else-if="checkingMovieExistence[movie]" class="checking-icon">🔍</span>
                  <span v-else>Add to Radarr</span>
                </button>
                
                <button 
                  v-if="!isHidden(movie, 'movie')"
                  @click="hideItem(movie, 'movie')" 
                  class="hide-button"
                  title="Hide this movie from history view"
                >
                  <span class="hide-icon">🙈</span>
                  <span>Hide</span>
                </button>
                
                <button 
                  v-else
                  @click="unhideItem(movie, 'movie')" 
                  class="unhide-button"
                  title="Show this item in history view again"
                >
                  <span class="unhide-icon">👁️</span>
                  <span>Unhide</span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="hasMoreMovies" class="loading-more-container" ref="movieLoadMoreTrigger">
            <div class="loading-more-spinner"></div>
            <span>Loading more...</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Series selection modal -->
    <div v-if="showSeriesModal" class="modal-overlay" @click="closeSeriesModal">
      <div class="series-modal" @click.stop>
        <div class="modal-header">
          <h4>Add "{{ selectedSeries }}" to Sonarr</h4>
          <button class="close-button" @click="closeSeriesModal">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="seriesLoading" class="loading-series">
            <div class="poster-loading-spinner"></div>
            <p>Loading series information...</p>
          </div>
          <div v-else-if="seriesError" class="series-error">
            <p>{{ seriesError }}</p>
          </div>
          <div v-else-if="!seriesInfo.title" class="series-not-found">
            <p>Series information not found.</p>
          </div>
          <div v-else class="series-details">
            <div class="series-poster">
              <div 
                class="modal-poster" 
                :style="getPosterStyle(selectedSeries, 'tv')"
              ></div>
            </div>
            <div class="series-info">
              <h3>{{ seriesInfo.title }}</h3>
              <div class="series-year" v-if="seriesInfo.year">{{ seriesInfo.year }}</div>
              <div class="existing-warning" v-if="existingSeriesInfo">
                <strong>Note:</strong> This series is already in your library.
              </div>
              
              <div class="seasons-selector" v-if="!existingSeriesInfo && seriesInfo.seasons && seriesInfo.seasons.length > 0">
                <h4>Select Seasons</h4>
                <div class="season-actions">
                  <button @click="selectAllSeasons" class="season-action-button">Select All</button>
                  <button @click="selectNoSeasons" class="season-action-button">Deselect All</button>
                </div>
                <div class="seasons-list">
                  <div v-for="season in seriesInfo.seasons" :key="season.seasonNumber" class="season-item">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        v-model="selectedSeasons[season.seasonNumber]"
                      >
                      {{ season.seasonNumber === 0 ? 'Specials' : `Season ${season.seasonNumber}` }}
                    </label>
                  </div>
                </div>
              </div>
              
              <div class="quality-folder-selector" v-if="!existingSeriesInfo">
                <div class="quality-profile">
                  <label for="qualityProfile">Quality Profile:</label>
                  <select id="qualityProfile" v-model="selectedQualityProfile">
                    <option v-for="profile in qualityProfiles" :key="profile.id" :value="profile.id">
                      {{ profile.name }}
                    </option>
                  </select>
                </div>
                
                <div class="root-folder">
                  <label for="rootFolder">Root Folder:</label>
                  <select id="rootFolder" v-model="selectedRootFolder">
                    <option v-for="folder in rootFolders" :key="folder.path" :value="folder.path">
                      {{ folder.path }}
                    </option>
                  </select>
                </div>
                
                <div class="tags-section">
                  <label>Tags:</label>
                  <div class="tags-container">
                    <div v-for="tag in availableTags.sonarr" :key="tag.id" class="tag-item">
                      <label class="tag-checkbox-label">
                        <input 
                          type="checkbox" 
                          :value="tag.id" 
                          v-model="selectedTags.sonarr"
                        >
                        {{ tag.label }}
                      </label>
                    </div>
                  </div>
                  
                  <div class="new-tag-input">
                    <input 
                      type="text" 
                      v-model="tagInput" 
                      placeholder="Create new tag..." 
                      @keyup.enter="createSonarrTag(tagInput).then(() => { tagInput = ''; })"
                    >
                    <button 
                      @click="createSonarrTag(tagInput).then(() => { tagInput = ''; })"
                      :disabled="!tagInput.trim()"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeSeriesModal" class="cancel-button">Cancel</button>
          <button 
            v-if="!existingSeriesInfo" 
            @click="confirmAddSeries" 
            :disabled="addingSeries[selectedSeries] || !seriesInfo.title || Object.values(selectedSeasons).every(val => !val)"
            class="add-modal-button"
          >
            {{ addingSeries[selectedSeries] ? 'Adding...' : 'Add Series' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Movie selection modal -->
    <div v-if="showMovieModal" class="modal-overlay" @click="closeMovieModal">
      <div class="movie-modal" @click.stop>
        <div class="modal-header">
          <h4>Add "{{ selectedMovie }}" to Radarr</h4>
          <button class="close-button" @click="closeMovieModal">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="movieLoading" class="loading-movie">
            <div class="poster-loading-spinner"></div>
            <p>Loading movie information...</p>
          </div>
          <div v-else-if="movieError" class="movie-error">
            <p>{{ movieError }}</p>
          </div>
          <div v-else-if="!movieInfo.title" class="movie-not-found">
            <p>Movie information not found.</p>
          </div>
          <div v-else class="movie-details">
            <div class="movie-poster">
              <div 
                class="modal-poster" 
                :style="getPosterStyle(selectedMovie, 'movie')"
              ></div>
            </div>
            <div class="movie-info">
              <h3>{{ movieInfo.title }}</h3>
              <div class="movie-year" v-if="movieInfo.year">{{ movieInfo.year }}</div>
              <div class="existing-warning" v-if="existingMovieInfo">
                <strong>Note:</strong> This movie is already in your library.
              </div>
              
              <div class="quality-folder-selector" v-if="!existingMovieInfo">
                <div class="quality-profile">
                  <label for="movieQualityProfile">Quality Profile:</label>
                  <select id="movieQualityProfile" v-model="selectedMovieQualityProfile">
                    <option v-for="profile in movieQualityProfiles" :key="profile.id" :value="profile.id">
                      {{ profile.name }}
                    </option>
                  </select>
                </div>
                
                <div class="root-folder">
                  <label for="movieRootFolder">Root Folder:</label>
                  <select id="movieRootFolder" v-model="selectedMovieRootFolder">
                    <option v-for="folder in movieRootFolders" :key="folder.path" :value="folder.path">
                      {{ folder.path }}
                    </option>
                  </select>
                </div>
                
                <div class="tags-section">
                  <label>Tags:</label>
                  <div class="tags-container">
                    <div v-for="tag in availableTags.radarr" :key="tag.id" class="tag-item">
                      <label class="tag-checkbox-label">
                        <input 
                          type="checkbox" 
                          :value="tag.id" 
                          v-model="selectedTags.radarr"
                        >
                        {{ tag.label }}
                      </label>
                    </div>
                  </div>
                  
                  <div class="new-tag-input">
                    <input 
                      type="text" 
                      v-model="tagInput" 
                      placeholder="Create new tag..." 
                      @keyup.enter="createRadarrTag(tagInput).then(() => { tagInput = ''; })"
                    >
                    <button 
                      @click="createRadarrTag(tagInput).then(() => { tagInput = ''; })"
                      :disabled="!tagInput.trim()"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeMovieModal" class="cancel-button">Cancel</button>
          <button 
            v-if="!existingMovieInfo" 
            @click="confirmAddMovie" 
            :disabled="addingMovie[selectedMovie] || !movieInfo.title"
            class="add-modal-button"
          >
            {{ addingMovie[selectedMovie] ? 'Adding...' : 'Add Movie' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- TMDB Detail Modal -->
    <TMDBDetailModal
      v-if="isTMDBAvailable"
      :show="showTMDBModal"
      :mediaId="selectedMediaId"
      :mediaType="selectedMediaType"
      :title="selectedMediaTitle"
      @close="closeTMDBModal"
    />
  </div>
</template>

<script>
import imageService from '../services/ImageService.js';
import sonarrService from '../services/SonarrService.js';
import radarrService from '../services/RadarrService.js';
import tmdbService from '../services/TMDBService.js';
import TMDBDetailModal from './TMDBDetailModal.vue';
import apiService from '../services/ApiService.js';
import authService from '../services/AuthService.js';
import databaseStorageUtils from '../utils/DatabaseStorageUtils.js'; // Replaced StorageUtils
import recommendationsStore from '../stores/RecommendationsStore.js'; // Import the store
import axios from 'axios';

// Debug services availability






export default {
  name: 'RecommendationHistory',
  components: {
    TMDBDetailModal
  },
  props: {
    sonarrConfigured: {
      type: Boolean,
      default: false
    },
    radarrConfigured: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      username: authService.getUser()?.username || '',
      activeView: 'combined',
      // tvRecommendations and movieRecommendations removed - will be computed properties
      filteredTVRecommendations: [],
      filteredMovieRecommendations: [],
      displayedTVShows: [],
      displayedMovies: [],
      tvPageSize: 20,
      tvCurrentPage: 1,
      moviePageSize: 20,
      movieCurrentPage: 1,
      loading: true,
      loadingMoreTV: false,
      loadingMoreMovies: false,
      showTMDBModal: false,
      selectedMediaTitle: '',
      selectedMediaId: null, 
      selectedMediaType: 'tv',
      columnsCount: 4,
      posters: new Map(),
      loadingPosters: new Map(),
      hideExistingContent: true,
      hideLikedContent: true,
      hideDislikedContent: true,
      hiddenTVShows: new Set(),
      hiddenMovies: new Set(),
      hideHiddenContent: true, // Default to hiding hidden items
      
      // Tags
      availableTags: {
        radarr: [],
        sonarr: []
      },
      tagInput: '',
      selectedTags: {
        radarr: [],
        sonarr: []
      },
      loadingTags: {
        radarr: false,
        sonarr: false
      },
      
      // Intersection observer
      tvObserver: null,
      movieObserver: null,
      
      // TV/Movie details
      tvShowDetails: {},
      movieDetails: {},
      loadingDetails: {},
      existingTVShows: new Set(),
      existingMovies: new Set(),
      likedTVShows: new Set(),
      dislikedTVShows: new Set(),
      likedMovies: new Set(),
      dislikedMovies: new Set(),
      
      // Sonarr/Radarr status
      checkingShowExistence: {},
      checkingMovieExistence: {},
      addingSeries: {},
      addingMovie: {},
      
      // Series modal
      showSeriesModal: false,
      selectedSeries: '',
      seriesInfo: {},
      existingSeriesInfo: null,
      seriesLoading: false,
      seriesError: null,
      selectedSeasons: {},
      qualityProfiles: [],
      rootFolders: [],
      selectedQualityProfile: null,
      selectedRootFolder: null,
      
      // Movie modal
      showMovieModal: false,
      selectedMovie: '',
      movieInfo: {},
      existingMovieInfo: null,
      movieLoading: false,
      movieError: null,
      movieQualityProfiles: [],
      movieRootFolders: [],
      selectedMovieQualityProfile: null,
      selectedMovieRootFolder: null,
      
      // For aborting in-flight requests when component is unmounted
      abortController: null,
      
      // Notification system
      notification: null,
      notificationTimeout: null,
      storeInitialized: false, // Track store initialization
      isInitializing: true // Flag to prevent saving during initial load
    };
  },
  computed: {
    // Use store state for recommendations
    tvRecommendations() {
      // Ensure store is initialized before accessing state
      return this.storeInitialized ? (recommendationsStore.state.previousShowRecommendations || []) : [];
    },
    movieRecommendations() {
      // Ensure store is initialized before accessing state
      return this.storeInitialized ? (recommendationsStore.state.previousMovieRecommendations || []) : [];
    },
    // Keep local liked/disliked sets for now as store doesn't separate them
    // likedTVShows() ...
    // dislikedTVShows() ...
    // likedMovies() ...
    // dislikedMovies() ...

    noHistory() {
      // Use computed properties accessing the store
      if (this.activeView === 'tv') {
        return this.tvRecommendations.length === 0;
      } else if (this.activeView === 'movies') {
        return this.movieRecommendations.length === 0;
      } else {
        return this.tvRecommendations.length === 0 && this.movieRecommendations.length === 0;
      }
    },
    gridTemplateStyle() {
      // Use local columnsCount as store doesn't have setter
      return `repeat(${this.columnsCount}, 1fr)`;
    },
    hasMoreTVShows() {
      // Use computed tvRecommendations
      const source = this.hideExistingContent ? this.filteredTVRecommendations : this.tvRecommendations;
      return this.displayedTVShows.length < source.length && !this.loadingMoreTV;
    },
    hasMoreMovies() {
      // Use computed movieRecommendations
      const source = this.hideExistingContent ? this.filteredMovieRecommendations : this.movieRecommendations;
      return this.displayedMovies.length < source.length && !this.loadingMoreMovies;
    },
    isTMDBAvailable() {
      return tmdbService.isConfigured();
    }
  },
  async created() {
    // Initialize the store first
    this.loading = true; // Set loading true initially
    try {
      await recommendationsStore.initialize();
      this.storeInitialized = true; // Mark store as initialized
      
      // Load settings not managed by the store (or without setters)
      // Moved loading logic to the storeInitialized watcher
    } catch (error) {
      console.error("Error initializing store:", error);
      this.showNotification("Error initializing history.", "error");
      this.loading = false; // Set loading false on init error
    }
    // No finally block needed here anymore for loading state
  },
  async mounted() {
    
    
    // Make sure services are loaded before proceeding
    await Promise.all([
      sonarrService.loadCredentials(),
      radarrService.loadCredentials(),
      tmdbService.loadCredentials() // Make sure TMDB credentials are also loaded
    ]);
    
    // Check if services are configured after loading credentials
    const sonarrReady = sonarrService.isConfigured();
    const radarrReady = radarrService.isConfigured();

    // Load library content first to check if items exist in library
    await this.loadLibraryContent();
    
    // Load available tags from Radarr and Sonarr
    if (radarrReady) {
      this.loadRadarrTags();
    }
    
    if (sonarrReady) {
      this.loadSonarrTags();
    }
    
    // Initialize intersection observer for lazy loading
    this.initIntersectionObserver();
    
    // Load initial items 
    this.loadInitialItems();
  },
  
  beforeUnmount() {
    // Abort any in-flight requests when component is unmounted
    if (this.abortController) {
      
      this.abortController.abort();
      this.loading = false;
    }
    
    // Disconnect observers
    if (this.tvObserver) {
      this.tvObserver.disconnect();
    }
    if (this.movieObserver) {
      this.movieObserver.disconnect();
    }
  },
  watch: {
    // Watch store initialization status
    storeInitialized(newVal) {
      if (newVal) {
        // Store is ready, load preferences and library content, then apply filters
        Promise.all([
          this.loadColumnsCount(),     // Load column setting
          this.loadFilterPreferences(), // Load hidden items etc.
          this.loadLibraryContent()     // Load Sonarr/Radarr lists
        ]).then(() => {
           this.applyFilters(false); // Apply initial filters *without* saving
           this.resetPagination(); // Reset pagination after filters
           this.loading = false; // Set loading false after initial setup
           this.isInitializing = false; // Mark initialization as complete
        }).catch(error => {
           console.error("Error during post-initialization loading:", error);
           this.showNotification("Error applying initial settings.", "error");
           this.loading = false; // Ensure loading is set to false even on error
           this.isInitializing = false; // Ensure flag is set even on error
        });
      }
    },
    // Watch store recommendation arrays for changes
    'recommendationsStore.state.previousShowRecommendations': {
      handler() {
        if (this.storeInitialized) {
          this.applyFilters();
          this.resetPagination();
        }
      },
      deep: true
    },
    'recommendationsStore.state.previousMovieRecommendations': {
      handler() {
        if (this.storeInitialized) {
          this.applyFilters();
          this.resetPagination();
        }
      },
      deep: true
    },
    // Keep watchers for locally managed settings/data
    existingTVShows() {
      this.applyFilters();
    },
    existingMovies() {
      this.applyFilters();
    },
    likedTVShows() {
      this.applyFilters();
    },
    dislikedTVShows() {
      this.applyFilters();
    },
    likedMovies() {
      this.applyFilters();
    },
    dislikedMovies() {
      this.applyFilters();
    },
    async hideExistingContent() {
      this.applyFilters();
      // Reset pagination when filters change
      this.resetPagination();
      
      // Save to database storage
      await databaseStorageUtils.set('historyHideExisting', this.hideExistingContent);
      
      // Save to server
      try {
        const settings = await apiService.getSettings();
        settings.historyHideExisting = this.hideExistingContent;
        await apiService.saveSettings(settings);
      } catch (error) {
        console.error('Failed to save historyHideExisting setting to server:', error);
      }
    },
    async hideLikedContent() {
      this.applyFilters();
      // Reset pagination when filters change
      this.resetPagination();
      
      // Save to database storage
      await databaseStorageUtils.set('historyHideLiked', this.hideLikedContent);
      
      // Save to server
      try {
        const settings = await apiService.getSettings();
        settings.historyHideLiked = this.hideLikedContent;
        await apiService.saveSettings(settings);
      } catch (error) {
        console.error('Failed to save historyHideLiked setting to server:', error);
      }
    },
    async hideDislikedContent() {
      this.applyFilters();
      // Reset pagination when filters change
      this.resetPagination();
      
      // Save to database storage
      await databaseStorageUtils.set('historyHideDisliked', this.hideDislikedContent);
      
      // Save to server
      try {
        const settings = await apiService.getSettings();
        settings.historyHideDisliked = this.hideDislikedContent;
        await apiService.saveSettings(settings);
      } catch (error) {
        console.error('Failed to save historyHideDisliked setting to server:', error);
      }
    },
    // Remove watchers for local tv/movieRecommendations
    // tvRecommendations() { ... }
    // movieRecommendations() { ... }
    filteredTVRecommendations() {
      this.resetPagination();
    },
    filteredMovieRecommendations() {
      this.resetPagination();
    },
    activeView() {
      // When view changes, we need to reset pagination
      this.resetPagination();
    }
  },
  methods: {
    // Tag-related methods
    async loadRadarrTags() {
      if (!radarrService.isConfigured() || this.loadingTags.radarr) {
        return;
      }
      
      this.loadingTags.radarr = true;
      
      try {
        const tags = await radarrService.getTags();
        this.availableTags.radarr = tags || [];
        
      } catch (error) {
        console.error('Error loading Radarr tags:', error);
      } finally {
        this.loadingTags.radarr = false;
      }
    },
    
    async loadSonarrTags() {
      if (!sonarrService.isConfigured() || this.loadingTags.sonarr) {
        return;
      }
      
      this.loadingTags.sonarr = true;
      
      try {
        const tags = await sonarrService.getTags();
        this.availableTags.sonarr = tags || [];
        
      } catch (error) {
        console.error('Error loading Sonarr tags:', error);
      } finally {
        this.loadingTags.sonarr = false;
      }
    },
    
    async createRadarrTag(label) {
      if (!label || !radarrService.isConfigured()) {
        return null;
      }
      
      try {
        const newTag = await radarrService.createTag(label);
        if (newTag && newTag.id) {
          this.availableTags.radarr = [...this.availableTags.radarr, newTag];
          return newTag;
        }
        return null;
      } catch (error) {
        console.error(`Error creating Radarr tag "${label}":`, error);
        return null;
      }
    },
    
    async createSonarrTag(label) {
      if (!label || !sonarrService.isConfigured()) {
        return null;
      }
      
      try {
        const newTag = await sonarrService.createTag(label);
        if (newTag && newTag.id) {
          this.availableTags.sonarr = [...this.availableTags.sonarr, newTag];
          return newTag;
        }
        return null;
      } catch (error) {
        console.error(`Error creating Sonarr tag "${label}":`, error);
        return null;
      }
    },
    
    // Helper function to normalize and convert objects to strings
    normalizeArray(arr) {
      if (!arr) return [];
      // First filter out null/undefined values
      return arr
        .filter(item => item !== null && item !== undefined)
        .map(item => {
          // If item is an object, get its title property or convert to string
          if (typeof item === 'object') {
            
            // Try to get title property if it exists
            if (item.title) {
              return item.title;
            } else {
              // Otherwise convert to JSON string
              return JSON.stringify(item);
            }
          }
          // If already a string or other primitive, convert to string
          return String(item || '');
        })
        .filter(str => str.trim() !== ''); // Remove empty strings
    },
    
    // loadRecommendationHistory removed - handled by store initialization
    
    // Helper method to fetch with abort signal (keep this)
    async fetchWithAbort(fetchFunction, signal, logPrefix = '') {
      try {
        // Add the signal parameter to axios request if possible
        // This is a workaround since we can't directly modify the apiService methods
        const originalGet = axios.get;
        const originalPost = axios.post;
        
        // Override axios methods to include the abort signal
        axios.get = (url, config = {}) => {
          return originalGet(url, { ...config, signal });
        };
        
        axios.post = (url, data, config = {}) => {
          return originalPost(url, data, { ...config, signal });
        };
        
        const result = await fetchFunction();
        
        // Restore original axios methods
        axios.get = originalGet;
        axios.post = originalPost;
        
        return result;
      } catch (error) {
        // If aborted, log it and rethrow
        if (error.name === 'AbortError' || signal.aborted) {
          
          throw new Error('Request aborted');
        }
        
        // Otherwise, log the actual error and rethrow
        console.error(`${logPrefix} fetch error:`, error);
        throw error;
      }
    },
    
    async loadColumnsCount() {
      try {
        // First try to load from server settings
        const settings = await apiService.getSettings();
        if (settings && settings.historyColumnsCount) {
          
          this.columnsCount = settings.historyColumnsCount;
          // Update database storage (add await)
          await databaseStorageUtils.set('historyColumnsCount', settings.historyColumnsCount);
        } else {
          // Fall back to database storage (add await)
          const savedCount = await databaseStorageUtils.get('historyColumnsCount');
          if (savedCount) {
            this.columnsCount = parseInt(savedCount);
            // Save to server for future use
            if (settings) {
              settings.historyColumnsCount = parseInt(savedCount);
              await apiService.saveSettings(settings);
            }
          }
        }
      } catch (error) {
        console.error('Error loading columns count from server:', error);
        // Fall back to database storage (add await)
        const savedCount = await databaseStorageUtils.get('historyColumnsCount');
        if (savedCount) {
          this.columnsCount = parseInt(savedCount);
        }
      }
    },
    
    async saveColumnsCount() { // Already async
      // Save to database storage (add await)
      await databaseStorageUtils.set('historyColumnsCount', this.columnsCount);
      
      // Save to server
      try {
        const settings = await apiService.getSettings();
        settings.historyColumnsCount = this.columnsCount;
        await apiService.saveSettings(settings);
      } catch (error) {
        console.error('Failed to save historyColumnsCount setting to server:', error);
      }
    },
    
    async loadFilterPreferences() {
      try {
        // Try to load filter preferences from server first
        const settings = await apiService.getSettings();
        
        // Load hide existing content preference
        if (settings && settings.historyHideExisting !== undefined) {
          
          this.hideExistingContent = settings.historyHideExisting;
          // Update database storage (add await)
          await databaseStorageUtils.set('historyHideExisting', settings.historyHideExisting);
        } else {
          // Fall back to database storage (add await)
          const hideExisting = await databaseStorageUtils.get('historyHideExisting');
          if (hideExisting !== null) {
            this.hideExistingContent = hideExisting;
            // Removed save back logic during load
            // if (settings) {
            //   settings.historyHideExisting = hideExisting;
            //   await apiService.saveSettings(settings);
            // }
          }
        }
        
        // Load hide liked content preference
        if (settings && settings.historyHideLiked !== undefined) {
          
          this.hideLikedContent = settings.historyHideLiked;
          // Update database storage (add await)
          await databaseStorageUtils.set('historyHideLiked', settings.historyHideLiked);
        } else {
          // Fall back to database storage (add await)
          const hideLiked = await databaseStorageUtils.get('historyHideLiked');
          if (hideLiked !== null) {
            this.hideLikedContent = hideLiked;
            // Removed save back logic during load
            // if (settings) {
            //   settings.historyHideLiked = hideLiked;
            //   await apiService.saveSettings(settings);
            // }
          }
        }
        
        // Load hide disliked content preference
        if (settings && settings.historyHideDisliked !== undefined) {
          
          this.hideDislikedContent = settings.historyHideDisliked;
          // Update database storage (add await)
          await databaseStorageUtils.set('historyHideDisliked', settings.historyHideDisliked);
        } else {
          // Fall back to database storage (add await)
          const hideDisliked = await databaseStorageUtils.get('historyHideDisliked');
          if (hideDisliked !== null) {
            this.hideDislikedContent = hideDisliked;
            // Removed save back logic during load
            // if (settings) {
            //   settings.historyHideDisliked = hideDisliked;
            //   await apiService.saveSettings(settings);
            // }
          }
        }
        
        // Load hide hidden content preference
        if (settings && settings.historyHideHidden !== undefined) {
          
          this.hideHiddenContent = settings.historyHideHidden;
          // Update database storage (add await)
          await databaseStorageUtils.set('historyHideHidden', settings.historyHideHidden);
        } else {
          // Fall back to database storage or default to true (add await)
          const hideHidden = await databaseStorageUtils.get('historyHideHidden');
          if (hideHidden !== null) {
            this.hideHiddenContent = hideHidden;
          } else {
            // Set default to true if no setting exists anywhere
            this.hideHiddenContent = true;
            await databaseStorageUtils.set('historyHideHidden', true); // Add await
          }
          // Removed save back logic during load
          // if (settings) {
          //   settings.historyHideHidden = this.hideHiddenContent;
          //   await apiService.saveSettings(settings);
          // }
        }
        
        // Load hidden TV shows
        const hiddenTVFromServer = await apiService.getPreferences('tv', 'hidden');
        if (hiddenTVFromServer && hiddenTVFromServer.length > 0) {
          
          this.hiddenTVShows = new Set(hiddenTVFromServer.map(show => show.toLowerCase()));
          // Update database storage (add await)
          await databaseStorageUtils.setJSON('hiddenTVShows', hiddenTVFromServer);
        } else {
          // Fall back to database storage (add await)
          const hiddenTV = await databaseStorageUtils.getJSON('hiddenTVShows');
          if (hiddenTV) {
            this.hiddenTVShows = new Set(hiddenTV.map(show => show.toLowerCase()));
            // Removed save back logic during load
            // apiService.savePreferences('tv', 'hidden', hiddenTV);
          }
        }
        
        // Load hidden movies
        const hiddenMoviesFromServer = await apiService.getPreferences('movie', 'hidden');
        if (hiddenMoviesFromServer && hiddenMoviesFromServer.length > 0) {
          
          this.hiddenMovies = new Set(hiddenMoviesFromServer.map(movie => movie.toLowerCase()));
          // Update database storage (add await)
          await databaseStorageUtils.setJSON('hiddenMovies', hiddenMoviesFromServer);
        } else {
          // Fall back to database storage (add await)
          const hiddenMovies = await databaseStorageUtils.getJSON('hiddenMovies');
          if (hiddenMovies) {
            this.hiddenMovies = new Set(hiddenMovies.map(movie => movie.toLowerCase()));
            // Removed save back logic during load
            // apiService.savePreferences('movie', 'hidden', hiddenMovies);
          }
        }
      } catch (error) {
        console.error('Error loading filter preferences from server:', error);
        
        // Fall back to database storage on error (add await)
        // Load existing content preference
        const hideExisting = await databaseStorageUtils.get('historyHideExisting');
        if (hideExisting !== null) {
          this.hideExistingContent = hideExisting;
        }
        
        // Load liked content preference
        const hideLiked = await databaseStorageUtils.get('historyHideLiked');
        if (hideLiked !== null) {
          this.hideLikedContent = hideLiked;
        }
        
        // Load disliked content preference
        const hideDisliked = await databaseStorageUtils.get('historyHideDisliked');
        if (hideDisliked !== null) {
          this.hideDislikedContent = hideDisliked;
        }
        
        // Load hidden content preference (default to true if not found)
        const hideHidden = await databaseStorageUtils.get('historyHideHidden');
        if (hideHidden !== null) {
          this.hideHiddenContent = hideHidden;
        } else {
          // If no setting exists, default to true (hide hidden items)
          this.hideHiddenContent = true;
          await databaseStorageUtils.set('historyHideHidden', true); // Add await
        }
        
        // Load hidden TV shows
        const hiddenTV = await databaseStorageUtils.getJSON('hiddenTVShows');
        if (hiddenTV) {
          this.hiddenTVShows = new Set(hiddenTV.map(show => show.toLowerCase()));
        }
        
        // Load hidden movies
        const hiddenMovies = await databaseStorageUtils.getJSON('hiddenMovies');
        if (hiddenMovies) {
          this.hiddenMovies = new Set(hiddenMovies.map(movie => movie.toLowerCase()));
        }
      }
      
      // Apply filters after loading preferences
      this.applyFilters();
    },
    
    async loadLikedDislikedContent() {
      try {
        // Try to load liked/disliked content from server first
        
        // Load liked TV shows
        const likedTVFromServer = await apiService.getPreferences('tv', 'liked');
        if (likedTVFromServer && likedTVFromServer.length > 0) {
          
          this.likedTVShows = new Set(likedTVFromServer.map(show => show.toLowerCase()));
          // Update database storage (add await)
          await databaseStorageUtils.setJSON('likedTVRecommendations', likedTVFromServer);
        } else {
          // Fall back to database storage (add await)
          const likedTV = await databaseStorageUtils.getJSON('likedTVRecommendations');
          if (likedTV) {
            this.likedTVShows = new Set(likedTV.map(show => show.toLowerCase()));
            // Removed save back logic during load
            // apiService.savePreferences('tv', 'liked', likedTV);
          }
        }
        
        // Load disliked TV shows
        const dislikedTVFromServer = await apiService.getPreferences('tv', 'disliked');
        if (dislikedTVFromServer && dislikedTVFromServer.length > 0) {
          
          this.dislikedTVShows = new Set(dislikedTVFromServer.map(show => show.toLowerCase()));
          // Update database storage (add await)
          await databaseStorageUtils.setJSON('dislikedTVRecommendations', dislikedTVFromServer);
        } else {
          // Fall back to database storage (add await)
          const dislikedTV = await databaseStorageUtils.getJSON('dislikedTVRecommendations');
          if (dislikedTV) {
            this.dislikedTVShows = new Set(dislikedTV.map(show => show.toLowerCase()));
            // Removed save back logic during load
            // apiService.savePreferences('tv', 'disliked', dislikedTV);
          }
        }
        
        // Load liked movies
        const likedMoviesFromServer = await apiService.getPreferences('movie', 'liked');
        if (likedMoviesFromServer && likedMoviesFromServer.length > 0) {
          
          this.likedMovies = new Set(likedMoviesFromServer.map(movie => movie.toLowerCase()));
          // Update database storage (add await)
          await databaseStorageUtils.setJSON('likedMovieRecommendations', likedMoviesFromServer);
        } else {
          // Fall back to database storage (add await)
          const likedMovies = await databaseStorageUtils.getJSON('likedMovieRecommendations');
          if (likedMovies) {
            this.likedMovies = new Set(likedMovies.map(movie => movie.toLowerCase()));
            // Removed save back logic during load
            // apiService.savePreferences('movie', 'liked', likedMovies);
          }
        }
        
        // Load disliked movies
        const dislikedMoviesFromServer = await apiService.getPreferences('movie', 'disliked');
        if (dislikedMoviesFromServer && dislikedMoviesFromServer.length > 0) {
          
          this.dislikedMovies = new Set(dislikedMoviesFromServer.map(movie => movie.toLowerCase()));
          // Update database storage (add await)
          await databaseStorageUtils.setJSON('dislikedMovieRecommendations', dislikedMoviesFromServer);
        } else {
          // Fall back to database storage (add await)
          const dislikedMovies = await databaseStorageUtils.getJSON('dislikedMovieRecommendations');
          if (dislikedMovies) {
            this.dislikedMovies = new Set(dislikedMovies.map(movie => movie.toLowerCase()));
            // Removed save back logic during load
            // apiService.savePreferences('movie', 'disliked', dislikedMovies);
          }
        }
      } catch (error) {
        console.error('Error loading liked/disliked content from server:', error);
        
        // Fall back to database storage on error (add await)
        const likedTV = await databaseStorageUtils.getJSON('likedTVRecommendations');
        if (likedTV) {
          this.likedTVShows = new Set(likedTV.map(show => show.toLowerCase()));
        }
        
        const dislikedTV = await databaseStorageUtils.getJSON('dislikedTVRecommendations');
        if (dislikedTV) {
          this.dislikedTVShows = new Set(dislikedTV.map(show => show.toLowerCase()));
        }
        
        const likedMovies = await databaseStorageUtils.getJSON('likedMovieRecommendations');
        if (likedMovies) {
          this.likedMovies = new Set(likedMovies.map(movie => movie.toLowerCase()));
        }
        
        const dislikedMovies = await databaseStorageUtils.getJSON('dislikedMovieRecommendations');
        if (dislikedMovies) {
          this.dislikedMovies = new Set(dislikedMovies.map(movie => movie.toLowerCase()));
        }
      }
    },
    
    toggleHideExisting() {
      this.hideExistingContent = !this.hideExistingContent;
    },
    
    toggleHideLiked() {
      this.hideLikedContent = !this.hideLikedContent;
    },
    
    toggleHideDisliked() {
      this.hideDislikedContent = !this.hideDislikedContent;
    },
    
    toggleHideHidden() {
      this.hideHiddenContent = !this.hideHiddenContent;
      this.applyFilters();
    },
    
    // Check if an item is hidden
    isHidden(title, type) {
      if (!title) return false;
      
      const normalizedTitle = typeof title === 'string' ? title.toLowerCase() : String(title).toLowerCase();
      
      if (type === 'tv') {
        return this.hiddenTVShows.has(normalizedTitle);
      } else if (type === 'movie') {
        return this.hiddenMovies.has(normalizedTitle);
      }
      
      return false;
    },
    
    // Method to show a notification
    showNotification(message, type = 'info', duration = 3000) {
      // Clear any existing notification timeout
      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
      }
      
      // Set the notification
      this.notification = { message, type };
      
      // Auto-dismiss after duration
      this.notificationTimeout = setTimeout(() => {
        this.dismissNotification();
      }, duration);
    },
    
    // Dismiss the notification
    dismissNotification() {
      this.notification = null;
      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = null;
      }
    },
    
    // Hide an item from the recommendation history
    hideItem(title, type) {
      if (!title) return;
      
      const normalizedTitle = typeof title === 'string' ? title.toLowerCase() : String(title).toLowerCase();
      
      if (type === 'tv') {
        // Add to hidden TV shows
        this.hiddenTVShows.add(normalizedTitle);
        // Create a copy for Vue reactivity
        this.hiddenTVShows = new Set(this.hiddenTVShows);
      } else if (type === 'movie') {
        // Add to hidden movies
        this.hiddenMovies.add(normalizedTitle);
        // Create a copy for Vue reactivity
        this.hiddenMovies = new Set(this.hiddenMovies);
      }
      
      // Apply filters first to update the UI (without saving preferences yet)
      this.applyFilters(false); 
      
      // Save the updated hidden items asynchronously without blocking the UI
      this.$nextTick(() => {
        this.saveFilterPreferences();
      });
      
      // Show notification instead of alert
      this.showNotification(
        "Item hidden from history. Use the filter controls to show/hide hidden items.",
        "success"
      );
    },
    
    // Unhide an item from the recommendation history
    unhideItem(title, type) {
      if (!title) return;
      
      const normalizedTitle = typeof title === 'string' ? title.toLowerCase() : String(title).toLowerCase();
      
      if (type === 'tv') {
        // Remove from hidden TV shows
        this.hiddenTVShows.delete(normalizedTitle);
        // Create a copy for Vue reactivity
        this.hiddenTVShows = new Set(this.hiddenTVShows);
      } else if (type === 'movie') {
        // Remove from hidden movies
        this.hiddenMovies.delete(normalizedTitle);
        // Create a copy for Vue reactivity
        this.hiddenMovies = new Set(this.hiddenMovies);
      }
      
      // Apply filters first to update the UI (without saving preferences yet)
      this.applyFilters(false);

      // Save the updated hidden items asynchronously without blocking the UI
      this.$nextTick(() => {
        this.saveFilterPreferences();
      });
      
      // Show notification instead of alert
      this.showNotification("Item is now visible in history.", "success");
    },
    
    async loadLibraryContent() {
      
      
      // Double-check with service directly in addition to props
      if (this.sonarrConfigured && sonarrService.isConfigured()) {
        
        await this.loadSonarrLibrary();
      }
      
      // Double-check with service directly in addition to props
      if (this.radarrConfigured && radarrService.isConfigured()) {
        
        await this.loadRadarrLibrary();
      }
      
      this.fetchAllDetails();
    },
    
    async loadSonarrLibrary() {
      try {
        // Check if Sonarr is actually configured
        if (!sonarrService.isConfigured()) {
          console.warn('Sonarr service is not properly configured with API key and URL');
          this.existingTVShows = new Set(); // Initialize with empty set
          return;
        }
        
        
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5 second timeout
        
        try {
          const series = await this.fetchWithAbort(
            () => sonarrService.getSeries(),
            abortController.signal,
            'Sonarr Series List'
          );
          
          clearTimeout(timeoutId);
          
          if (series && series.length) {
            
            const titles = new Set(series.map(show => show.title.toLowerCase()));
            this.existingTVShows = titles;
          } else {
            
            this.existingTVShows = new Set(); // Initialize with empty set
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          console.error('Error or timeout fetching Sonarr library:', fetchError);
          this.existingTVShows = new Set(); // Initialize with empty set
        }
      } catch (error) {
        console.error('Error in loadSonarrLibrary:', error);
        this.existingTVShows = new Set(); // Initialize with empty set
      }
    },
    
    async loadRadarrLibrary() {
      try {
        // Check if Radarr is actually configured
        if (!radarrService.isConfigured()) {
          console.warn('Radarr service is not properly configured with API key and URL');
          this.existingMovies = new Set(); // Initialize with empty set
          return;
        }
        
        
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5 second timeout
        
        try {
          const movies = await this.fetchWithAbort(
            () => radarrService.getMovies(),
            abortController.signal,
            'Radarr Movies List'
          );
          
          clearTimeout(timeoutId);
          
          if (movies && movies.length) {
            
            const titles = new Set(movies.map(movie => movie.title.toLowerCase()));
            this.existingMovies = titles;
          } else {
            
            this.existingMovies = new Set(); // Initialize with empty set
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          console.error('Error or timeout fetching Radarr library:', fetchError);
          this.existingMovies = new Set(); // Initialize with empty set
        }
      } catch (error) {
        console.error('Error in loadRadarrLibrary:', error);
        this.existingMovies = new Set(); // Initialize with empty set
      }
    },

    // Handler for filter checkbox changes
    handleFilterChange() {
      // Only save preferences if not initializing
      if (!this.isInitializing) {
        this.applyFilters(true); // Apply filters and save
      } else {
        this.applyFilters(false); // Just apply filters without saving
      }
    },
    
    applyFilters(shouldSave = true) { // Add shouldSave parameter, default to true
      // Filter TV recommendations
      let filteredTV = [...this.tvRecommendations];
      
      // Apply existing filter
      if (this.hideExistingContent && this.existingTVShows.size > 0) {
        filteredTV = filteredTV.filter(show => {
          if (show === null || show === undefined) return true; // Skip null/undefined
          const showStr = typeof show === 'string' ? show : String(show);
          return !this.existingTVShows.has(showStr.toLowerCase());
        });
      }
      
      // Apply liked filter
      if (this.hideLikedContent && this.likedTVShows.size > 0) {
        filteredTV = filteredTV.filter(show => {
          if (show === null || show === undefined) return true; // Skip null/undefined
          const showStr = typeof show === 'string' ? show : String(show);
          return !this.likedTVShows.has(showStr.toLowerCase());
        });
      }
      
      // Apply disliked filter
      if (this.hideDislikedContent && this.dislikedTVShows.size > 0) {
        filteredTV = filteredTV.filter(show => {
          if (show === null || show === undefined) return true; // Skip null/undefined
          const showStr = typeof show === 'string' ? show : String(show);
          return !this.dislikedTVShows.has(showStr.toLowerCase());
        });
      }
      
      // Apply hidden filter
      if (this.hideHiddenContent && this.hiddenTVShows.size > 0) {
        filteredTV = filteredTV.filter(show => {
          if (show === null || show === undefined) return true; // Skip null/undefined
          const showStr = typeof show === 'string' ? show : String(show);
          return !this.hiddenTVShows.has(showStr.toLowerCase());
        });
      }
      
      this.filteredTVRecommendations = filteredTV;
      
      // Filter movie recommendations
      let filteredMovies = [...this.movieRecommendations];
      
      // Apply existing filter
      if (this.hideExistingContent && this.existingMovies.size > 0) {
        filteredMovies = filteredMovies.filter(movie => {
          if (movie === null || movie === undefined) return true; // Skip null/undefined
          const movieStr = typeof movie === 'string' ? movie : String(movie);
          return !this.existingMovies.has(movieStr.toLowerCase());
        });
      }
      
      // Apply liked filter
      if (this.hideLikedContent && this.likedMovies.size > 0) {
        filteredMovies = filteredMovies.filter(movie => {
          if (movie === null || movie === undefined) return true; // Skip null/undefined
          const movieStr = typeof movie === 'string' ? movie : String(movie);
          return !this.likedMovies.has(movieStr.toLowerCase());
        });
      }
      
      // Apply disliked filter
      if (this.hideDislikedContent && this.dislikedMovies.size > 0) {
        filteredMovies = filteredMovies.filter(movie => {
          if (movie === null || movie === undefined) return true; // Skip null/undefined
          const movieStr = typeof movie === 'string' ? movie : String(movie);
          return !this.dislikedMovies.has(movieStr.toLowerCase());
        });
      }
      
      // Apply hidden filter
      if (this.hideHiddenContent && this.hiddenMovies.size > 0) {
        filteredMovies = filteredMovies.filter(movie => {
          if (movie === null || movie === undefined) return true; // Skip null/undefined
          const movieStr = typeof movie === 'string' ? movie : String(movie);
          return !this.hiddenMovies.has(movieStr.toLowerCase());
        });
      }
      
      this.filteredMovieRecommendations = filteredMovies;
      
      // Save filter preferences only if shouldSave is true
      if (shouldSave) {
        this.saveFilterPreferences();
      }
    },
    
    async saveFilterPreferences() { // Already async

      if (!this.storeInitialized) {
        return;
      }

      // Save filter preferences to database storage (add await)
      await databaseStorageUtils.set('historyHideExisting', this.hideExistingContent);
      await databaseStorageUtils.set('historyHideLiked', this.hideLikedContent);
      await databaseStorageUtils.set('historyHideDisliked', this.hideDislikedContent);
      await databaseStorageUtils.set('historyHideHidden', this.hideHiddenContent);
    },
    
    // Reset pagination and reinitialize displayed items
    resetPagination() {
      this.tvCurrentPage = 1;
      this.movieCurrentPage = 1;
      this.displayedTVShows = [];
      this.displayedMovies = [];
      
      // Load initial items with a small delay to allow for DOM updates
      setTimeout(() => {
        this.loadInitialItems();
      }, 50);
    },
    
    // Load initial batch of items for display
    loadInitialItems() {
      this.loadMoreTVShows();
      this.loadMoreMovies();
    },
    
    // Initialize intersection observers for lazy loading
    initIntersectionObserver() {
      // Wait until component is fully mounted before creating observers
      this.$nextTick(() => {
        try {
          // Options for Intersection Observer
          const options = {
            root: null, // Use viewport as root
            rootMargin: '0px 0px 200px 0px', // Load more when within 200px of bottom
            threshold: 0.1 // Trigger when 10% of element is visible
          };
          
          // Create observer for TV load more trigger
          this.tvObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting && this.hasMoreTVShows) {
                this.loadMoreTVShows();
              }
            });
          }, options);
          
          // Create observer for movie load more trigger
          this.movieObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting && this.hasMoreMovies) {
                this.loadMoreMovies();
              }
            });
          }, options);
          
          
          
          // Observe load more elements
          setTimeout(() => {
            if (this.$refs.tvLoadMoreTrigger && this.hasMoreTVShows && this.tvObserver) {
              try {
                this.tvObserver.observe(this.$refs.tvLoadMoreTrigger);
                
              } catch (error) {
                console.error('Error observing TV load more trigger:', error);
              }
            }
            
            if (this.$refs.movieLoadMoreTrigger && this.hasMoreMovies && this.movieObserver) {
              try {
                this.movieObserver.observe(this.$refs.movieLoadMoreTrigger);
                
              } catch (error) {
                console.error('Error observing movie load more trigger:', error);
              }
            }
          }, 500); // Give a longer delay for initial setup
        } catch (error) {
          console.error('Error initializing intersection observers:', error);
        }
      });
    },
    
    // Load more TV shows 
    loadMoreTVShows() {
      if (this.loadingMoreTV) return;
      
      this.loadingMoreTV = true;
      
      const source = this.hideExistingContent ? this.filteredTVRecommendations : this.tvRecommendations;
      
      // Calculate start and end indices for current page
      const startIndex = (this.tvCurrentPage - 1) * this.tvPageSize;
      const endIndex = Math.min(startIndex + this.tvPageSize, source.length);
      
      // Skip if we're already at the end
      if (startIndex >= source.length) {
        this.loadingMoreTV = false;
        return;
      }
      
      
      
      // Get items for current page
      const newItems = source.slice(startIndex, endIndex);
      
      // Add to displayed items
      this.displayedTVShows = [...this.displayedTVShows, ...newItems];
      
      // Fetch details and posters for new items
      this.loadDetailsForItems(newItems, 'tv');
      
      // Increment page number
      this.tvCurrentPage++;
      
      // Reset loading flag
      this.loadingMoreTV = false;
      
      // Observe the load more trigger after a short delay to allow for DOM updates
      this.$nextTick(() => {
        if (this.$refs.tvLoadMoreTrigger && this.hasMoreTVShows && this.tvObserver) {
          try {
            this.tvObserver.observe(this.$refs.tvLoadMoreTrigger);
            
          } catch (error) {
            console.error('Error observing TV load more trigger:', error);
          }
        }
      });
    },
    
    // Load more movies
    loadMoreMovies() {
      if (this.loadingMoreMovies) return;
      
      this.loadingMoreMovies = true;
      
      const source = this.hideExistingContent ? this.filteredMovieRecommendations : this.movieRecommendations;
      
      // Calculate start and end indices for current page
      const startIndex = (this.movieCurrentPage - 1) * this.moviePageSize;
      const endIndex = Math.min(startIndex + this.moviePageSize, source.length);
      
      // Skip if we're already at the end
      if (startIndex >= source.length) {
        this.loadingMoreMovies = false;
        return;
      }
      
      
      
      // Get items for current page
      const newItems = source.slice(startIndex, endIndex);
      
      // Add to displayed items
      this.displayedMovies = [...this.displayedMovies, ...newItems];
      
      // Fetch details and posters for new items
      this.loadDetailsForItems(newItems, 'movie');
      
      // Increment page number
      this.movieCurrentPage++;
      
      // Reset loading flag
      this.loadingMoreMovies = false;
      
      // Observe the load more trigger after a short delay to allow for DOM updates
      this.$nextTick(() => {
        if (this.$refs.movieLoadMoreTrigger && this.hasMoreMovies && this.movieObserver) {
          try {
            this.movieObserver.observe(this.$refs.movieLoadMoreTrigger);
            
          } catch (error) {
            console.error('Error observing movie load more trigger:', error);
          }
        }
      });
    },
    
    // Load more items but defer poster and detail loading until they're visible
    loadDetailsForItems(items, type) {
      // We'll now just add the items to the display list
      // but NOT load posters or details yet - we'll do that with a separate observer
      
      
      // Setup lazy loading for these items in the next tick
      this.$nextTick(() => {
        this.setupItemObservers(type);
      });
    },
    
    // Set up observers for individual items
    setupItemObservers(type) {
      // Options for item observation (more aggressive threshold)
      const options = {
        root: null,
        rootMargin: '50px', // Load when within 50px of viewport
        threshold: 0.1
      };
      
      // Get the relevant items
      const itemRefs = type === 'tv' ? this.$refs.tvItem : this.$refs.movieItem;
      
      // Skip if no items
      if (!itemRefs || itemRefs.length === 0) {
        return;
      }
      
      
      
      // Create a new observer for this batch of items
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Get the item's data from the element's dataset
            const itemEl = entry.target;
            const itemTitle = itemEl.dataset.title;
            
            if (itemTitle) {
              // Load data for this specific item
              if (type === 'tv') {
                this.fetchPoster(itemTitle, 'tv');
                this.fetchTVShowDetails(itemTitle);
              } else {
                this.fetchPoster(itemTitle, 'movie');
                this.fetchMovieDetails(itemTitle);
              }
              
              // Stop observing this item once we've loaded its data
              observer.unobserve(itemEl);
            }
          }
        });
      }, options);
      
      // Observe each item
      itemRefs.forEach((itemEl) => {
        // Only observe if we haven't loaded data for this item yet
        const item = type === 'tv' 
          ? this.displayedTVShows[parseInt(itemEl.dataset.index)] 
          : this.displayedMovies[parseInt(itemEl.dataset.index)];
        
        // Ensure we have an item and extract the title string
        const itemTitle = (typeof item === 'string') ? item : (item?.title || null);
          
        if (itemTitle) {
          // Store the actual title string in the element's dataset
          itemEl.dataset.title = itemTitle; 
          
          // Start observing
          observer.observe(itemEl);
        }
      });
    },
    
    async clearTVHistory() {
      if (confirm('Are you sure you want to clear your TV show recommendation history?')) {
        try {
          // Clear from database storage using DatabaseStorageUtils
          await databaseStorageUtils.remove('tvRecommendations'); // Use the correct key used by the store
          
          // Clear from server
          await apiService.saveRecommendations('tv', []);
          
          // Update the store state directly
          recommendationsStore.state.previousShowRecommendations = [];
          
          // Clear local filtered/displayed data
          this.filteredTVRecommendations = [];
          this.displayedTVShows = [];
          
          // Show success notification
          this.showNotification('TV show history has been cleared successfully', 'success');
          
          // Reset pagination
          this.tvCurrentPage = 1;
        } catch (error) {
          console.error('Failed to clear TV recommendations:', error);
          this.showNotification('Failed to clear TV history. Please try again.', 'error');
        }
      }
    },
    
    async clearMovieHistory() { // Already async
      if (confirm('Are you sure you want to clear your movie recommendation history?')) {
        try {
          // Clear from database storage using DatabaseStorageUtils (add await)
          // Clear from database storage using DatabaseStorageUtils
          await databaseStorageUtils.remove('movieRecommendations'); // Use the correct key used by the store
          
          // Clear from server
          await apiService.saveRecommendations('movie', []);
          
          // Update the store state directly
          recommendationsStore.state.previousMovieRecommendations = [];
          
          // Clear local filtered/displayed data
          this.filteredMovieRecommendations = [];
          this.displayedMovies = [];
          
          // Show success notification
          this.showNotification('Movie history has been cleared successfully', 'success');
          
          // Reset pagination
          this.movieCurrentPage = 1;
        } catch (error) {
          console.error('Failed to clear movie recommendations:', error);
          this.showNotification('Failed to clear movie history. Please try again.', 'error');
        }
      }
    },
    
    // Poster management is now handled by loadDetailsForItems method with lazy loading
    // This method is kept for backward compatibility but is no longer used directly
    async fetchAllPosters() {
      
      return;
    },
    
    async fetchPoster(title, type, signal) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        console.warn(`Attempted to fetch poster for null/undefined ${type} title`);
        return;
      }
      
      // Check if the request has been aborted
      if (signal && signal.aborted) {
        
        return;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      
      // If already loading, skip
      if (this.loadingPosters.get(key)) {
        return;
      }
      
      // If already loaded, skip
      if (this.posters.has(key)) {
        return;
      }
      
      // Mark as loading
      this.loadingPosters.set(key, true);
      
      try {
        let posterUrl;
        
        
        // Check for abort before making request
        if (signal && signal.aborted) {
          
          return;
        }
        
        // Wrap the imageService calls with our fetchWithAbort helper
        if (type === 'tv') {
          posterUrl = await this.fetchWithAbort(
            () => imageService.getPosterForShow(title),
            signal,
            `TV Poster for "${title}"`
          );
          
        } else {
          posterUrl = await this.fetchWithAbort(
            () => imageService.getPosterForMovie(title),
            signal,
            `Movie Poster for "${title}"`
          );
          
        }
        
        // Store the poster URL or fallback if not found
        if (posterUrl) {
          // Check if it's a proxied URL
          if (posterUrl.includes('/api/image-proxy?url=')) {
            // Try to extract the original URL as fallback in case proxy fails
            try {
              const originalUrl = decodeURIComponent(posterUrl.split('url=')[1]);
              
              // Set the original URL instead of the proxy
              this.posters.set(key, originalUrl);
            } catch (err) {
              
              this.posters.set(key, posterUrl);
            }
          } else {
            this.posters.set(key, posterUrl);
          }
        } else {
          // Set fallback image when no poster is found
          const fallbackUrl = imageService.getFallbackImageUrl(title);
          this.posters.set(key, fallbackUrl);
          
        }
      } catch (error) {
        console.error(`Error fetching poster for ${type} "${title}":`, error);
        // Use fallback image on error
        const fallbackUrl = imageService.getFallbackImageUrl(title);
        this.posters.set(key, fallbackUrl);
      } finally {
        this.loadingPosters.set(key, false);
      }
    },
    
    getPosterStyle(title, type) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        return {
          backgroundColor: '#333'
        };
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      
      // If poster is loading, return empty
      if (this.loadingPosters.get(key)) {
        return {};
      }
      
      // If we have a poster URL, use it
      const posterUrl = this.posters.get(key);
      if (posterUrl) {
        return {
          backgroundImage: `url("${posterUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      }
      
      // Otherwise, use fallback
      const fallbackUrl = imageService.getFallbackImageUrl(title);
      return {
        backgroundImage: `url("${fallbackUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    },
    
    isLoadingPoster(title, type) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        return false;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      return !!this.loadingPosters.get(key);
    },
    
    posterExists(title, type) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        return false;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      return !!this.posters.get(key);
    },
    
    async retryLoadPoster(title, type) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        console.warn(`Attempted to retry load poster for null/undefined ${type} title`);
        return;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      
      // Remove existing poster and mark as loading
      this.posters.delete(key);
      this.loadingPosters.set(key, true);
      
      // Fetch with skipCache=true
      try {
        let posterUrl;
        
        if (type === 'tv') {
          posterUrl = await imageService.getPosterForShow(title, true);
        } else {
          posterUrl = await imageService.getPosterForMovie(title, true);
        }
        
        // Store the poster URL or fallback if not found
        if (posterUrl) {
          // Check if it's a proxied URL
          if (posterUrl.includes('/api/image-proxy?url=')) {
            // Try to extract the original URL as fallback in case proxy fails
            try {
              const originalUrl = decodeURIComponent(posterUrl.split('url=')[1]);
              
              // Set the original URL instead of the proxy
              this.posters.set(key, originalUrl);
            } catch (err) {
              
              this.posters.set(key, posterUrl);
            }
          } else {
            this.posters.set(key, posterUrl);
          }
        } else {
          // Set fallback image when no poster is found
          const fallbackUrl = imageService.getFallbackImageUrl(title);
          this.posters.set(key, fallbackUrl);
          
        }
      } catch (error) {
        console.error(`Error retrying poster for ${type} "${title}":`, error);
        // Use fallback image on error
        const fallbackUrl = imageService.getFallbackImageUrl(title);
        this.posters.set(key, fallbackUrl);
      } finally {
        this.loadingPosters.set(key, false);
      }
    },
    
    // These methods are now replaced by loadDetailsForItems with lazy loading
    // Kept for backward compatibility
    async fetchAllDetails() {
      
      return;
    },
    
    async fetchAllTVDetails() {
      
      return;
    },
    
    async fetchAllMovieDetails() {
      
      return;
    },
    
    async fetchTVShowDetails(title) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        console.warn('Attempted to fetch TV details for null/undefined title');
        return;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      // If already loading, skip
      if (this.loadingDetails[title]) return;
      
      // Mark as loading
      this.loadingDetails = { ...this.loadingDetails, [title]: true };
      
      try {
        let seriesInfo = null;
        
        // If TMDB is configured, try using it first
        if (tmdbService.isConfigured()) {
          
          seriesInfo = await tmdbService.findSeriesByTitle(title);
        }
        
        // If TMDB failed or isn't configured and Sonarr is available, fall back to Sonarr
        if (!seriesInfo && sonarrService.isConfigured()) {
          
          seriesInfo = await sonarrService.findSeriesByTitle(title);
        }
        
        if (seriesInfo) {
          this.tvShowDetails = {
            ...this.tvShowDetails,
            [title]: {
              overview: seriesInfo.overview || null,
              year: seriesInfo.year || null,
              network: seriesInfo.network || null,
              status: seriesInfo.status || null
            }
          };
        }
      } catch (error) {
        console.error(`Error fetching TV show details for "${title}":`, error);
      } finally {
        this.loadingDetails = { ...this.loadingDetails, [title]: false };
      }
    },
    
    async fetchMovieDetails(title) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        console.warn('Attempted to fetch movie details for null/undefined title');
        return;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      // If already loading, skip
      if (this.loadingDetails[title]) return;
      
      // Mark as loading
      this.loadingDetails = { ...this.loadingDetails, [title]: true };
      
      try {
        let movieInfo = null;
        
        // If TMDB is configured, try using it first
        if (tmdbService.isConfigured()) {
          
          movieInfo = await tmdbService.findMovieByTitle(title);
        }
        
        // If TMDB failed or isn't configured and Radarr is available, fall back to Radarr
        if (!movieInfo && radarrService.isConfigured()) {
          
          movieInfo = await radarrService.findMovieByTitle(title);
        }
        
        if (movieInfo) {
          this.movieDetails = {
            ...this.movieDetails,
            [title]: {
              overview: movieInfo.overview || null,
              year: movieInfo.year || null,
              studio: movieInfo.studio || null,
              runtime: movieInfo.runtime || null
            }
          };
        }
      } catch (error) {
        console.error(`Error fetching movie details for "${title}":`, error);
      } finally {
        this.loadingDetails = { ...this.loadingDetails, [title]: false };
      }
    },
    
    // Helper to truncate text
    truncateText(text, maxLength) {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength) + '...';
    },
    
    // Sonarr integration
    async addToSonarr(title) {
      this.selectedSeries = title;
      this.showSeriesModal = true;
      this.seriesLoading = true;
      this.existingSeriesInfo = null;
      this.seriesInfo = {};
      this.seriesError = null;
      this.selectedSeasons = {};
      this.qualityProfiles = [];
      this.rootFolders = [];
      this.selectedTags.sonarr = [];
      this.tagInput = '';
      
      // Mark as checking for existence
      this.checkingShowExistence = { ...this.checkingShowExistence, [title]: true };
      
      // Create abort controller with timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 8000); // 8 second timeout
      
      try {
        // Check if Sonarr is configured before proceeding
        if (!sonarrService.isConfigured()) {
          this.seriesError = "Sonarr is not configured. Please configure Sonarr in the settings.";
          return;
        }
        
        // First check if the series already exists with timeout support
        try {
          const existingSeries = await this.fetchWithAbort(
            () => sonarrService.findExistingSeriesByTitle(title),
            abortController.signal,
            'Check Series Existence'
          );
          
          if (existingSeries) {
            this.existingSeriesInfo = existingSeries;
            console.log('Series already exists:', existingSeries);
          }
        } catch (error) {
          if (error.message === 'Request aborted') {
            console.log('Finding existing series was aborted due to timeout');
          } else {
            throw error;
          }
        }

        
        // Only proceed if the request wasn't aborted
        if (!abortController.signal.aborted) {
          // Get series information from Sonarr
          const seriesLookup = await this.fetchWithAbort(
            () => sonarrService.findSeriesByTitle(title),
            abortController.signal,
            'Series Lookup'
          );
          
          if (seriesLookup) {
            this.seriesInfo = seriesLookup;
            
            // Initialize seasons with all selected
            if (seriesLookup.seasons) {
              const updatedSeasons = { ...this.selectedSeasons };
              seriesLookup.seasons.forEach(season => {
                updatedSeasons[season.seasonNumber] = true;
              });
              this.selectedSeasons = updatedSeasons;
            }
            
            // Only proceed if the request wasn't aborted
            if (!abortController.signal.aborted) {
              // Get quality profiles and root folders in parallel for performance
              const [profiles, folders] = await Promise.all([
                this.fetchWithAbort(() => sonarrService.getQualityProfiles(), abortController.signal, 'Sonarr Quality Profiles'),
                this.fetchWithAbort(() => sonarrService.getRootFolders(), abortController.signal, 'Sonarr Root Folders')
              ]);
              
              this.qualityProfiles = profiles || [];
              this.rootFolders = folders || [];
              
              // Default selections
              if (this.qualityProfiles.length > 0) {
                this.selectedQualityProfile = this.qualityProfiles[0].id;
              }
              
              if (this.rootFolders.length > 0) {
                this.selectedRootFolder = this.rootFolders[0].path;
              }
            }
          } else {
            this.seriesError = `Could not find information for "${title}"`;
          }
        }
      } catch (error) {
        if (error.message === 'Request aborted') {
          console.error('Operation timed out');
          this.seriesError = 'Operation timed out. Please try again later.';
        } else {
          console.error('Error getting series information:', error);
          this.seriesError = `Error: ${error.message || 'Failed to get series information'}`;
        }
      } finally {
        clearTimeout(timeoutId);
        this.seriesLoading = false;
        this.checkingShowExistence = { ...this.checkingShowExistence, [title]: false };
      }
    },
    
    closeSeriesModal() {
      this.showSeriesModal = false;
    },
    
    selectAllSeasons() {
      if (this.seriesInfo.seasons) {
        const updatedSeasons = { ...this.selectedSeasons };
        this.seriesInfo.seasons.forEach(season => {
          updatedSeasons[season.seasonNumber] = true;
        });
        this.selectedSeasons = updatedSeasons;
      }
    },
    
    selectNoSeasons() {
      if (this.seriesInfo.seasons) {
        const updatedSeasons = { ...this.selectedSeasons };
        this.seriesInfo.seasons.forEach(season => {
          updatedSeasons[season.seasonNumber] = false;
        });
        this.selectedSeasons = updatedSeasons;
      }
    },
    
    async confirmAddSeries() {
      if (!this.selectedSeries || !this.seriesInfo) return;
      
      // Mark as adding
      this.addingSeries = { ...this.addingSeries, [this.selectedSeries]: true };
      
      try {
        // Convert selectedSeasons to array format expected by SonarrService
        const seasons = Object.entries(this.selectedSeasons)
          .filter(([, selected]) => selected)
          .map(([seasonNumber]) => parseInt(seasonNumber));
        
        // Add the series
        const result = await sonarrService.addSeries(
          this.selectedSeries,
          seasons,
          this.selectedQualityProfile,
          this.selectedRootFolder,
          this.selectedTags.sonarr
        );
        
        if (result && result.id) {
          // Update existing TV shows set and filters
          const seriesTitle = this.selectedSeries.toLowerCase();
          this.existingTVShows = new Set([...this.existingTVShows, seriesTitle]);
          this.applyFilters();
          
          // Close modal
          this.closeSeriesModal();
          
          // Load Sonarr library to refresh all items
          this.loadSonarrLibrary();
        } else {
          throw new Error('Failed to add series. Please check Sonarr logs.');
        }
      } catch (error) {
        console.error('Error adding series:', error);
        // Show error message in modal instead of alert
        this.seriesError = `Error adding series: ${error.message || 'Unknown error'}`;
      } finally {
        this.addingSeries = { ...this.addingSeries, [this.selectedSeries]: false };
      }
    },
    
    // Radarr integration
    async addToRadarr(title) {
      this.selectedMovie = title;
      this.showMovieModal = true;
      this.movieLoading = true;
      this.existingMovieInfo = null;
      this.movieInfo = {};
      this.movieError = null;
      this.movieQualityProfiles = [];
      this.movieRootFolders = [];
      this.selectedTags.radarr = [];
      this.tagInput = '';
      
      // Mark as checking for existence
      this.checkingMovieExistence = { ...this.checkingMovieExistence, [title]: true };
      
      // Create abort controller with timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 8000); // 8 second timeout
      
      try {
        // Check if Radarr is configured before proceeding
        if (!radarrService.isConfigured()) {
          this.movieError = "Radarr is not configured. Please configure Radarr in the settings.";
          return;
        }
        
        // First check if the movie already exists with timeout support
        try {
          const existingMovie = await this.fetchWithAbort(
            () => radarrService.findExistingMovieByTitle(title),
            abortController.signal,
            'Check Movie Existence'
          );
          
          if (existingMovie) {
            this.existingMovieInfo = existingMovie;
            console.log('Movie already exists:', existingMovie);
          }
        } catch (error) {
          if (error.message === 'Request aborted') {
            console.log('Finding existing movie was aborted due to timeout');
          } else {
            throw error;
          }
        }
        
        // Only proceed if the request wasn't aborted
        if (!abortController.signal.aborted) {
          // Get movie information from Radarr
          const movieLookup = await this.fetchWithAbort(
            () => radarrService.findMovieByTitle(title),
            abortController.signal,
            'Movie Lookup'
          );
          
          if (movieLookup) {
            this.movieInfo = movieLookup;
            
            // Only proceed if the request wasn't aborted
            if (!abortController.signal.aborted) {
              // Get quality profiles and root folders in parallel for performance
              const [profiles, folders] = await Promise.all([
                this.fetchWithAbort(() => radarrService.getQualityProfiles(), abortController.signal, 'Radarr Quality Profiles'),
                this.fetchWithAbort(() => radarrService.getRootFolders(), abortController.signal, 'Radarr Root Folders')
              ]);
              
              this.movieQualityProfiles = profiles || [];
              this.movieRootFolders = folders || [];
              
              // Default selections
              if (this.movieQualityProfiles.length > 0) {
                this.selectedMovieQualityProfile = this.movieQualityProfiles[0].id;
              }
              
              if (this.movieRootFolders.length > 0) {
                this.selectedMovieRootFolder = this.movieRootFolders[0].path;
              }
            }
          } else {
            this.movieError = `Could not find information for "${title}"`;
          }
        }
      } catch (error) {
        if (error.message === 'Request aborted') {
          console.error('Operation timed out');
          this.movieError = 'Operation timed out. Please try again later.';
        } else {
          console.error('Error getting movie information:', error);
          this.movieError = `Error: ${error.message || 'Failed to get movie information'}`;
        }
      } finally {
        clearTimeout(timeoutId);
        this.movieLoading = false;
        this.checkingMovieExistence = { ...this.checkingMovieExistence, [title]: false };
      }
    },
    
    closeMovieModal() {
      this.showMovieModal = false;
    },
    
    // TMDB Detail Modal methods
    openTMDBDetailModal(mediaTitle, mediaType) {
      // Only open if TMDB is available
      if (!this.isTMDBAvailable) {
        
        return;
      }
      
      this.selectedMediaTitle = mediaTitle;
      this.selectedMediaType = mediaType;
      this.selectedMediaId = null; // We'll search by title
      this.showTMDBModal = true;
      
    },
    
    closeTMDBModal() {
      this.showTMDBModal = false;
      this.selectedMediaId = null;
      this.selectedMediaTitle = '';
    },
    
    async confirmAddMovie() {
      if (!this.selectedMovie || !this.movieInfo) return;
      
      // Mark as adding
      this.addingMovie = { ...this.addingMovie, [this.selectedMovie]: true };
      
      try {
        // Add the movie
        const result = await radarrService.addMovie(
          this.selectedMovie,
          this.selectedMovieQualityProfile,
          this.selectedMovieRootFolder,
          this.selectedTags.radarr
        );
        
        if (result && result.id) {
          // Update existing movies set and filters
          const movieTitle = this.selectedMovie.toLowerCase();
          this.existingMovies = new Set([...this.existingMovies, movieTitle]);
          this.applyFilters();
          
          // Close modal
          this.closeMovieModal();
          
          // Load Radarr library to refresh all items
          this.loadRadarrLibrary();
        } else {
          throw new Error('Failed to add movie. Please check Radarr logs.');
        }
      } catch (error) {
        console.error('Error adding movie:', error);
        // Show error message in modal instead of alert
        this.movieError = `Error adding movie: ${error.message || 'Unknown error'}`;
      } finally {
        this.addingMovie = { ...this.addingMovie, [this.selectedMovie]: false };
      }
    }
  }
};
</script>

<style scoped>
.history-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 10px;
  color: var(--header-color);
  font-size: 24px;
  text-align: center;
}

.history-user-info {
  text-align: center;
  color: var(--text-color);
  opacity: 0.8;
  font-size: 14px;
  margin-bottom: 20px;
  font-style: italic;
}

.history-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.view-toggle {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toggle-button, .clear-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg-color);
  color: var(--text-color);
}

.toggle-button:hover, .clear-button:hover {
  border-color: var(--button-primary-bg);
}

.toggle-button.active {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-bg);
}

.toggle-icon, .clear-icon, .stat-icon, .item-icon {
  font-size: 16px;
}

.clear-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.clear-button {
  background-color: rgba(255, 59, 48, 0.1);
  border-color: rgba(255, 59, 48, 0.3);
  color: var(--text-color);
}

.clear-button:hover {
  background-color: rgba(255, 59, 48, 0.2);
  border-color: rgba(255, 59, 48, 0.5);
}

.history-stats {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.history-stats-row, .history-controls-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.history-controls-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  padding: 5px 10px;
  border-radius: 15px;
  background-color: rgba(76, 175, 80, 0.1);
}

.stat-item.total {
  background-color: rgba(33, 150, 243, 0.1);
  font-weight: bold;
}

.columns-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.columns-control label, .filter-label {
  font-size: 14px;
  color: var(--text-color);
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.tags-section {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  max-height: 150px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--card-bg-color);
}

.tag-item {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 13px;
}

.tag-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.new-tag-input {
  display: flex;
  gap: 10px;
}

.new-tag-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg-color);
  color: var(--text-color);
}

.new-tag-input button {
  padding: 8px 12px;
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.new-tag-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.columns-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: var(--border-color);
  outline: none;
  border-radius: 3px;
  cursor: pointer;
}

.columns-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--button-primary-bg);
  cursor: pointer;
}

.columns-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--button-primary-bg);
  cursor: pointer;
  border: none;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 0;
  gap: 15px;
}

.spinner, .loading-more-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(76, 175, 80, 0.2);
  border-left-color: var(--button-primary-bg);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-more-spinner {
  width: 24px;
  height: 24px;
  border-width: 3px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-history, .empty-section {
  text-align: center;
  padding: 40px 0;
  color: var(--text-color);
  opacity: 0.7;
}

.loading-more-container {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  gap: 10px;
  color: var(--text-color);
  opacity: 0.7;
  font-size: 14px;
}

.history-section {
  margin-bottom: 30px;
}

.history-section h3 {
  margin-bottom: 15px;
  font-size: 18px;
  color: var(--header-color);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.recommendation-grid {
  display: grid;
  gap: 10px;
}

.recommendation-item {
  background-color: var(--card-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s ease;
  overflow: hidden;
  height: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
}

.recommendation-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--button-primary-bg);
}

.poster-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

.poster {
  position: relative;
  width: 100%;
  padding-bottom: 150%; /* 2:3 aspect ratio for movie posters */
  background-color: var(--card-bg-color);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.poster-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.poster-loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.poster-retry {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.poster:hover .poster-retry {
  opacity: 1;
}


.retry-button {
  background-color: rgba(76, 175, 80, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s ease;
}

.retry-button:hover {
  background-color: rgba(76, 175, 80, 1);
}

.retry-icon {
  font-size: 14px;
}

.item-title {
  padding: 8px 8px 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-description {
  padding: 0 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100px; /* Fixed height for consistent card sizing */
}

.item-overview {
  font-size: 11px;
  color: var(--text-color);
  opacity: 0.8;
  text-align: left;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
}

.item-year {
  font-size: 11px;
  color: var(--text-color);
  opacity: 0.8;
  text-align: left;
  font-weight: 500;
}

.item-actions {
  padding: 0 8px 8px;
  display: flex;
  justify-content: center;
  height: 50px; /* Fixed height for button area */
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.add-button {
  flex: 1;
  background-color: var(--button-primary-bg);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-width: 80px;
}

.hide-button, .unhide-button {
  background-color: var(--button-secondary-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 70px;
  transition: all 0.2s;
}

.hide-button:hover {
  background-color: rgba(240, 55, 40, 0.1);
  border-color: rgba(240, 55, 40, 0.5);
}

.unhide-button:hover {
  background-color: rgba(55, 160, 55, 0.1);
  border-color: rgba(55, 160, 55, 0.5);
}

.hide-icon, .unhide-icon {
  font-size: 12px;
}

.add-button:hover:not(:disabled) {
  background-color: rgba(76, 175, 80, 0.8);
}

.add-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.adding-icon, .checking-icon {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

/* Modal Styles */
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
  z-index: 4;
}

.series-modal, .movie-modal {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
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

.loading-series, .loading-movie {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 15px;
}

.series-error, .movie-error, .series-not-found, .movie-not-found {
  color: #e74c3c;
  text-align: center;
  padding: 20px 0;
}

.series-details, .movie-details {
  display: flex;
  gap: 20px;
}

.series-poster, .movie-poster {
  flex: 0 0 120px;
}

.modal-poster {
  width: 120px;
  height: 180px;
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--card-bg-color);
  background-size: cover;
  background-position: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.series-info, .movie-info {
  flex: 1;
}

.series-info h3, .movie-info h3 {
  margin-top: 0;
  margin-bottom: 5px;
  color: var(--header-color);
  font-size: 18px;
  border-bottom: none;
  padding-bottom: 0;
}

.series-year, .movie-year {
  color: var(--text-color);
  opacity: 0.7;
  margin-bottom: 15px;
}

.existing-warning {
  background-color: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.seasons-selector {
  margin-top: 15px;
}

.seasons-selector h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: var(--header-color);
}

.season-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.season-action-button {
  background-color: var(--button-secondary-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.seasons-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px;
}

.season-item {
  font-size: 13px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.quality-folder-selector {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.quality-profile, .root-folder {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.quality-profile label, .root-folder label {
  font-size: 14px;
  font-weight: 500;
}

.quality-profile select, .root-folder select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-button {
  background-color: var(--button-secondary-bg);
  border: 1px solid var(--border-color);
  color: var(--button-secondary-text);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.add-modal-button {
  background-color: var(--button-primary-bg);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.add-modal-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Notification styling */
.notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 6px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  max-width: 90%;
  width: 400px;
  z-index: 1000;
  font-size: 14px;
  animation: notification-fade-in 0.3s ease;
}

.notification.success {
  background-color: rgba(76, 175, 80, 0.9);
  color: white;
}

.notification.error {
  background-color: rgba(244, 67, 54, 0.9);
  color: white;
}

.notification.info {
  background-color: rgba(33, 150, 243, 0.9);
  color: white;
}

.notification-message {
  flex: 1;
}

.notification-close {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.notification-close:hover {
  opacity: 1;
}

@keyframes notification-fade-in {
  from { opacity: 0; transform: translate(-50%, -10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .history-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .view-toggle, .clear-buttons {
    width: 100%;
  }
  
  .toggle-button, .clear-button {
    flex-grow: 1;
    justify-content: center;
  }
  
  .series-details, .movie-details {
    flex-direction: column;
  }
  
  .series-poster, .movie-poster {
    align-self: center;
    margin-bottom: 15px;
  }
  
  .modal-poster {
    width: 150px;
    height: 225px;
  }
}
.poster.clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.poster.clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
}
</style>
