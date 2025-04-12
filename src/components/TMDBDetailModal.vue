<template>
  <div class="modal-overlay" v-if="show" @click.self="close">
    <div class="modal-container" :class="{ 'loading': loading }">
      <button class="close-button" @click="close" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      
      <div v-if="loading" class="loading-container">
        <div class="loading-pulse"></div>
        <p>Loading details...</p>
      </div>
      
      <div v-else-if="error" class="error-container">
        <div class="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <p class="error-message">{{ error }}</p>
        <button @click="close" class="error-button">Close</button>
      </div>
      
      <div v-else-if="mediaDetails" class="modal-content">
        <div class="media-header" :style="backgroundStyle">
          <div class="media-header-overlay"></div>
          
          <div class="header-content">
            <div class="poster-container">
              <img 
                v-if="posterUrl" 
                :src="posterUrl" 
                :alt="mediaDetails.title || mediaDetails.name" 
                class="media-poster"
                loading="lazy"
              />
              <div v-else class="poster-placeholder">
                <span>{{ getInitials(mediaDetails.title || mediaDetails.name) }}</span>
              </div>
            </div>
            
            <div class="title-container">
              <h2 class="media-title">{{ mediaDetails.title || mediaDetails.name }}</h2>
              <div class="media-meta">
                <span v-if="releaseYear" class="meta-item">{{ releaseYear }}</span>
                <span v-if="mediaDetails.runtime || (mediaType === 'tv' && mediaDetails.episode_run_time && mediaDetails.episode_run_time.length)" class="meta-item">
                  {{ mediaType === 'movie' ? formatRuntime(mediaDetails.runtime) : formatRuntime(mediaDetails.episode_run_time[0]) }}
                </span>
                <span v-if="mediaDetails.status" class="meta-item status">{{ mediaDetails.status }}</span>
              </div>
              
              <div class="rating-container" v-if="mediaDetails.vote_average">
                <div class="rating-circle" :style="ratingStyle">
                  <span class="rating-text">{{ (mediaDetails.vote_average * 10).toFixed(0) }}</span>
                </div>
                <div class="rating-info">
                  <div class="rating-label">User Score</div>
                  <div class="rating-count">{{ mediaDetails.vote_count }} votes</div>
                </div>
              </div>
              
              <div class="genres" v-if="mediaDetails.genres && mediaDetails.genres.length">
                <span 
                  v-for="genre in mediaDetails.genres" 
                  :key="genre.id"
                  class="genre-tag"
                >
                  {{ genre.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="media-details">
          <div class="detail-tabs">
            <button 
              v-for="tab in tabs" 
              :key="tab.id" 
              class="tab-button" 
              :class="{ 'active': activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
          
          <div class="tab-content">
            <!-- Overview Tab -->
            <div v-if="activeTab === 'overview'" class="overview-tab">
              <div class="overview-section">
                <h3 class="section-title">Overview</h3>
                <p class="overview-text">{{ mediaDetails.overview || "No overview available." }}</p>
              </div>
              
              <div class="info-columns">
                <div class="info-block" v-if="mediaType === 'tv'">
                  <h3 class="section-title">Series Info</h3>
                  <div class="info-grid">
                    <div class="info-item" v-if="mediaDetails.status">
                      <span class="info-label">Status</span>
                      <span class="info-value">{{ mediaDetails.status }}</span>
                    </div>
                    <div class="info-item" v-if="mediaDetails.number_of_seasons">
                      <span class="info-label">Seasons</span>
                      <span class="info-value">{{ mediaDetails.number_of_seasons }}</span>
                    </div>
                    <div class="info-item" v-if="mediaDetails.number_of_episodes">
                      <span class="info-label">Episodes</span>
                      <span class="info-value">{{ mediaDetails.number_of_episodes }}</span>
                    </div>
                    <div class="info-item" v-if="mediaDetails.first_air_date">
                      <span class="info-label">First Aired</span>
                      <span class="info-value">{{ formatDate(mediaDetails.first_air_date) }}</span>
                    </div>
                    <div class="info-item" v-if="mediaDetails.last_air_date">
                      <span class="info-label">Last Aired</span>
                      <span class="info-value">{{ formatDate(mediaDetails.last_air_date) }}</span>
                    </div>
                    <div class="info-item" v-if="mediaDetails.networks && mediaDetails.networks.length">
                      <span class="info-label">Network</span>
                      <span class="info-value">{{ mediaDetails.networks[0].name }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="info-block" v-if="mediaType === 'movie'">
                  <h3 class="section-title">Movie Info</h3>
                  <div class="info-grid">
                    <div class="info-item" v-if="mediaDetails.runtime">
                      <span class="info-label">Runtime</span>
                      <span class="info-value">{{ formatRuntime(mediaDetails.runtime) }}</span>
                    </div>
                    <div class="info-item" v-if="mediaDetails.release_date">
                      <span class="info-label">Released</span>
                      <span class="info-value">{{ formatDate(mediaDetails.release_date) }}</span>
                    </div>
                    <div class="info-item" v-if="mediaDetails.budget">
                      <span class="info-label">Budget</span>
                      <span class="info-value">${{ formatNumber(mediaDetails.budget) }}</span>
                    </div>
                    <div class="info-item" v-if="mediaDetails.revenue">
                      <span class="info-label">Revenue</span>
                      <span class="info-value">${{ formatNumber(mediaDetails.revenue) }}</span>
                    </div>
                    <div class="info-item" v-if="mediaDetails.original_language">
                      <span class="info-label">Language</span>
                      <span class="info-value">{{ formatLanguage(mediaDetails.original_language) }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="info-block" v-if="mediaDetails.production_companies && mediaDetails.production_companies.length">
                  <h3 class="section-title">Production</h3>
                  <div class="companies-list">
                    <div 
                      v-for="company in mediaDetails.production_companies.slice(0, 4)" 
                      :key="company.id" 
                      class="company-item"
                    >
                      <div v-if="company.logo_path" class="company-logo">
                        <img :src="getCompanyLogoUrl(company.logo_path)" :alt="company.name">
                      </div>
                      <div class="company-name">{{ company.name }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Cast Tab -->
            <div v-if="activeTab === 'cast' && cast && cast.length" class="cast-tab">
              <h3 class="section-title">Top Cast</h3>
              <div class="cast-grid">
                <div v-for="actor in cast.slice(0, 8)" :key="actor.id" class="cast-member">
                  <div class="actor-image">
                    <img 
                      v-if="actor.profile_path" 
                      :src="getActorImageUrl(actor.profile_path)" 
                      :alt="actor.name"
                      loading="lazy"
                    />
                    <div v-else class="actor-placeholder">
                      <span>{{ getInitials(actor.name) }}</span>
                    </div>
                  </div>
                  <div class="actor-info">
                    <div class="actor-name">{{ actor.name }}</div>
                    <div class="actor-character">{{ actor.character || '' }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Videos Tab -->
            <div v-if="activeTab === 'videos'" class="videos-tab">
              <div v-if="trailers && trailers.length" class="trailers-section">
                <h3 class="section-title">Trailers & Videos</h3>
                <div class="videos-grid">
                  <div 
                    v-for="video in trailers" 
                    :key="video.id" 
                    class="video-item"
                  >
                    <div class="video-container">
                      <iframe
                        :src="getVideoEmbedUrl(video)"
                        :title="video.name"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                      ></iframe>
                    </div>
                    <div class="video-info">
                      <div class="video-title">{{ video.name }}</div>
                      <div class="video-type">{{ video.type }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="no-videos">
                <div class="empty-state">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                    <line x1="7" y1="2" x2="7" y2="22"></line>
                    <line x1="17" y1="2" x2="17" y2="22"></line>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="2" y1="7" x2="7" y2="7"></line>
                    <line x1="2" y1="17" x2="7" y2="17"></line>
                    <line x1="17" y1="17" x2="22" y2="17"></line>
                    <line x1="17" y1="7" x2="22" y2="7"></line>
                  </svg>
                  <p>No trailers or videos available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <a 
            v-if="tmdbUrl" 
            :href="tmdbUrl" 
            target="_blank" 
            rel="noopener noreferrer"
            class="tmdb-link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="link-icon"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            View on TMDB
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import tmdbService from '../services/TMDBService';
import imageService from '../services/ImageService';

export default {
  name: 'TMDBDetailModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    mediaId: {
      type: Number,
      default: null
    },
    mediaType: {
      type: String,
      default: 'tv', // 'tv' or 'movie'
      validator: value => ['tv', 'movie'].includes(value)
    },
    title: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loading: false,
      error: null,
      mediaDetails: null,
      cast: [],
      trailers: [],
      posterUrl: null,
      backdropUrl: null,
      activeTab: 'overview',
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'cast', label: 'Cast' },
        { id: 'videos', label: 'Videos' }
      ]
    };
  },
  computed: {
    releaseYear() {
      if (this.mediaType === 'movie' && this.mediaDetails?.release_date) {
        return new Date(this.mediaDetails.release_date).getFullYear();
      } else if (this.mediaType === 'tv' && this.mediaDetails?.first_air_date) {
        return new Date(this.mediaDetails.first_air_date).getFullYear();
      }
      return null;
    },
    tmdbUrl() {
      if (!this.mediaDetails) return null;
      const type = this.mediaType === 'tv' ? 'tv' : 'movie';
      const id = this.mediaDetails.id;
      return `https://www.themoviedb.org/${type}/${id}`;
    },
    ratingStyle() {
      if (!this.mediaDetails?.vote_average) return {};
      
      const score = this.mediaDetails.vote_average * 10;
      let color = '#ff0000'; // Red for low scores
      
      if (score >= 70) {
        color = '#4CAF50'; // Green for high scores
      } else if (score >= 50) {
        color = '#FFC107'; // Yellow/orange for average scores
      }
      
      return {
        background: `conic-gradient(${color} ${score}%, transparent ${score}%)`,
        '--rating-color': color
      };
    },
    backgroundStyle() {
      if (this.mediaDetails?.backdrop_path) {
        const backdropUrl = tmdbService.getFullImageUrl(this.mediaDetails.backdrop_path, 'w1280');
        return {
          backgroundImage: `url(${backdropUrl})`
        };
      }
      return {};
    }
  },
  watch: {
    show(newVal) {
      
      
      if (newVal && (this.mediaId || this.title)) {
        
        this.loadDetails();
        // Reset to the overview tab when opening
        this.activeTab = 'overview';
      } else if (!newVal) {
        // Reset data when modal is closed
        
        this.mediaDetails = null;
        this.cast = [];
        this.posterUrl = null;
        this.backdropUrl = null;
        this.error = null;
      }
    },
    mediaId(newVal) {
      if (newVal && this.show) {
        this.loadDetails();
      }
    },
    title(newVal) {
      if (newVal && this.show && !this.mediaId) {
        this.loadDetails();
      }
    }
  },
  methods: {
    async loadDetails() {
      
      this.loading = true;
      this.error = null;
      
      try {
        if (!tmdbService.isConfigured()) {
          console.error('TMDB not configured');
          throw new Error('TMDB is not configured. Please add your API key in Settings.');
        }
        
        let details;
        
        if (this.mediaId) {
          
          // If we already have the ID, fetch directly
          details = await this.fetchDetailsById();
        } else if (this.title) {
          
          // Otherwise search by title
          details = await this.fetchDetailsByTitle();
        } else {
          console.error('No ID or title provided');
          throw new Error('No media ID or title provided');
        }
        
        if (!details) {
          console.error('No details found');
          throw new Error(`Unable to find ${this.mediaType === 'tv' ? 'TV show' : 'movie'} details`);
        }
        
        
        this.mediaDetails = details;
        
        // Load cast and trailers if available
        await Promise.all([
          this.loadCast(),
          this.loadTrailers()
        ]);
        
        // Get poster URL
        if (details.poster_path) {
          this.posterUrl = tmdbService.getFullImageUrl(details.poster_path);
          
        } else {
          
          this.posterUrl = null;
        }
        
        // Get backdrop URL
        if (details.backdrop_path) {
          this.backdropUrl = tmdbService.getFullImageUrl(details.backdrop_path, 'w1280');
          
        } else {
          
          this.backdropUrl = null;
        }
      } catch (error) {
        console.error('Error loading media details:', error);
        this.error = error.message || 'Failed to load details';
      } finally {
        this.loading = false;
        
      }
    },
    
    async fetchDetailsById(id) {
      const mediaId = id || this.mediaId;
      
      
      const endpoint = this.mediaType === 'tv' 
        ? `/tv/${mediaId}`
        : `/movie/${mediaId}`;
      
      
      
      try {
        const details = await tmdbService._apiRequest(endpoint);
        
        return details;
      } catch (error) {
        console.error('Error fetching details by ID:', error);
        return null;
      }
    },
    
    async fetchDetailsByTitle() {
      
      // Search for the media by title
      try {
        const endpoint = this.mediaType === 'tv' ? '/search/tv' : '/search/movie';
        
        
        const searchResults = await tmdbService._apiRequest(
          endpoint,
          { query: this.title }
        );
        
        console.log('Search results:', searchResults ? 
          `Found ${searchResults.results?.length || 0} results` : 'No results');
        
        if (searchResults && searchResults.results && searchResults.results.length > 0) {
          // Get the first result's ID and fetch its full details
          const mediaId = searchResults.results[0].id;
          
          const details = await this.fetchDetailsById(mediaId);
          return details;
        }
        
        
        return null;
      } catch (error) {
        console.error('Error searching for media:', error);
        return null;
      }
    },
    
    async loadCast() {
      if (!this.mediaDetails || !this.mediaDetails.id) return;
      
      try {
        const creditsEndpoint = this.mediaType === 'tv'
          ? `/tv/${this.mediaDetails.id}/credits`
          : `/movie/${this.mediaDetails.id}/credits`;
        
        const credits = await tmdbService._apiRequest(creditsEndpoint);
        
        if (credits && credits.cast) {
          this.cast = credits.cast;
        }
      } catch (error) {
        console.error('Error loading cast information:', error);
        this.cast = [];
      }
    },
    
    async loadTrailers() {
      if (!this.mediaDetails || !this.mediaDetails.id) return;
      
      try {
        const videosEndpoint = this.mediaType === 'tv'
          ? `/tv/${this.mediaDetails.id}/videos`
          : `/movie/${this.mediaDetails.id}/videos`;
        
        const videosResponse = await tmdbService._apiRequest(videosEndpoint);
        
        if (videosResponse && videosResponse.results) {
          // Filter for trailers only, prioritize official trailers in English
          const allVideos = videosResponse.results;
          
          // First, try to find official trailers
          let officialTrailers = allVideos.filter(video => 
            (video.type === 'Trailer' || video.type === 'Teaser') && 
            video.official === true &&
            (video.site === 'YouTube' || video.site === 'Vimeo') &&
            video.iso_639_1 === 'en'
          );
          
          // If no official English trailers, look for any trailers
          if (!officialTrailers.length) {
            officialTrailers = allVideos.filter(video => 
              (video.type === 'Trailer' || video.type === 'Teaser') &&
              (video.site === 'YouTube' || video.site === 'Vimeo')
            );
          }
          
          // Sort trailers by popularity (if available) or by name
          this.trailers = officialTrailers.sort((a, b) => {
            // If popularity data exists, use it
            if (a.popularity && b.popularity) {
              return b.popularity - a.popularity;
            }
            // Otherwise sort by published date (newest first)
            return new Date(b.published_at || 0) - new Date(a.published_at || 0);
          });
          
          
        }
      } catch (error) {
        console.error('Error loading trailer information:', error);
        this.trailers = [];
      }
    },
    
    getActorImageUrl(path) {
      return tmdbService.getFullImageUrl(path);
    },
    
    getCompanyLogoUrl(path) {
      return tmdbService.getFullImageUrl(path, 'w200');
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Unknown';
      
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    
    formatRuntime(minutes) {
      if (!minutes) return 'Unknown';
      
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      return hours > 0 
        ? `${hours}h ${mins}m`
        : `${mins}m`;
    },
    
    formatNumber(num) {
      if (!num) return '0';
      return num.toLocaleString('en-US');
    },
    
    formatLanguage(code) {
      if (!code) return 'Unknown';
      
      const languages = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ru': 'Russian'
      };
      
      return languages[code] || code;
    },
    
    getInitials(name) {
      return imageService.getInitials(name);
    },
    
    getVideoEmbedUrl(video) {
      if (!video || !video.key) return null;
      
      // Format based on the site (YouTube or Vimeo)
      if (video.site === 'YouTube') {
        return `https://www.youtube.com/embed/${video.key}`;
      } else if (video.site === 'Vimeo') {
        return `https://player.vimeo.com/video/${video.key}`;
      }
      
      return null;
    },
    
    getThumbnailUrl(video) {
      if (!video || !video.key) return null;
      
      // Get thumbnail based on provider
      if (video.site === 'YouTube') {
        return `https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`;
      }
      
      // For other providers, we can't easily get thumbnails
      return null;
    },
    
    close() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
:root {
  --primary-color: #1976d2;
  --primary-dark: #1565c0;
  --primary-light: #2196f3;
  --success-color: #4CAF50;
  --warning-color: #FFC107;
  --error-color: #f44336;
  --text-light: #f8f9fa;
  --text-dark: #212529;
  --bg-light: #ffffff;
  --bg-dark: #1a1a1a;
  --card-light: #f1f3f5;
  --card-dark: #262626;
  --border-radius: 12px;
  --box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  --transition: all 0.3s ease;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #000000; /* Completely solid black background */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 4; /* Above navigation */
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}

.modal-container {
  position: relative;
  background-color: #ffffff; /* Completely solid white background */
  color: #000000; /* Pure black text */
  border-radius: var(--border-radius);
  max-width: 850px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); /* Stronger shadow */
  animation: modal-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  scrollbar-width: thin;
  border: 1px solid rgba(0, 0, 0, 0.2); /* Stronger border */
  z-index: 4; /* Same as modal overlay */
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .modal-container {
    background-color: #121212; /* Solid dark background */
    color: #ffffff; /* Pure white text */
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
}

.modal-container::-webkit-scrollbar {
  width: 8px;
}

.modal-container::-webkit-scrollbar-track {
  background: transparent;
}

.modal-container::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 20px;
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  z-index: 10;
  transition: var(--transition);
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.6);
  transform: rotate(90deg);
}

.close-button svg {
  width: 20px;
  height: 20px;
}

.loading-container, .error-container {
  padding: 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background-color: var(--bg-light);
}

@media (prefers-color-scheme: dark) {
  .loading-container, .error-container {
    background-color: var(--bg-dark);
    color: var(--text-light);
  }
}

.loading-pulse {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--primary-color);
  animation: pulse 1.5s ease-in-out infinite;
  margin-bottom: 20px;
}

.error-icon {
  color: var(--error-color);
  margin-bottom: 16px;
}

.error-message {
  color: var(--error-color);
  margin-bottom: 20px;
  font-weight: 500;
}

.error-button {
  padding: 10px 20px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: var(--border-radius);
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: var(--transition);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.error-button:hover {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

@media (prefers-color-scheme: dark) {
  .error-button {
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
}

.modal-content {
  overflow: hidden;
  border-radius: var(--border-radius);
}

.media-header {
  position: relative;
  background-size: cover;
  background-position: center top;
  padding: 0;
  height: 350px;
  display: flex;
  align-items: flex-end;
}

.media-header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 1) 100%); /* Darker, more solid gradient */
  z-index: 1;
}

.header-content {
  position: relative;
  z-index: 2;
  display: flex;
  padding: 30px;
  width: 100%;
}

.poster-container {
  flex: 0 0 200px;
  margin-right: 24px;
  transform: translateY(30px);
}

.media-poster {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  border: 3px solid rgba(255, 255, 255, 0.1);
  transition: var(--transition);
}

.media-poster:hover {
  transform: scale(1.02);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.4);
}

.poster-placeholder {
  width: 100%;
  aspect-ratio: 2/3;
  background-color: var(--primary-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: white;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  border: 3px solid rgba(255, 255, 255, 0.1);
}

.title-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.media-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  line-height: 1.2;
}

.media-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
}

.meta-item {
  position: relative;
}

.meta-item:not(:last-child)::after {
  content: "•";
  position: absolute;
  right: -10px;
  top: 0;
  color: rgba(255, 255, 255, 0.6);
}

.status {
  padding: 3px 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.rating-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.rating-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
  position: relative;
  margin-right: 14px;
  border: 3px solid var(--rating-color, var(--primary-color));
}

.rating-circle::before {
  content: "%";
  font-size: 10px;
  position: absolute;
  right: 8px;
  top: 12px;
}

.rating-info {
  display: flex;
  flex-direction: column;
}

.rating-label {
  font-weight: 600;
  color: white;
  font-size: 14px;
}

.rating-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.genres {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.genre-tag {
  padding: 6px 12px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 13px;
  transition: var(--transition);
  border: 1px solid rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); /* Improve text readability */
}

.genre-tag:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.5);
}

.media-details {
  padding: 30px;
  padding-top: 50px;
}

.detail-tabs {
  display: flex;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

@media (prefers-color-scheme: dark) {
  .detail-tabs {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.tab-button {
  padding: 10px 20px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-dark);
  cursor: pointer;
  position: relative;
  transition: var(--transition);
}

.tab-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.tab-button.active {
  color: var(--primary-color);
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 3px;
  background-color: var(--primary-color);
  border-radius: 3px 3px 0 0;
}

@media (prefers-color-scheme: dark) {
  .tab-button {
    color: var(--text-light);
  }
  
  .tab-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.tab-content {
  animation: fade-in 0.3s ease;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 16px;
  color: var(--text-dark);
  position: relative;
  padding-left: 14px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  background-color: var(--primary-color);
  border-radius: 2px;
}

@media (prefers-color-scheme: dark) {
  .section-title {
    color: var(--text-light);
  }
}

.overview-text {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-dark);
  margin-bottom: 30px;
  font-weight: 400;
}

@media (prefers-color-scheme: dark) {
  .overview-text {
    color: rgba(255, 255, 255, 1); /* Full white for better contrast */
  }
}

.info-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 30px;
}

.info-block {
  background-color: #f5f5f5; /* Solid light gray background */
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: var(--transition);
  border: 1px solid #dddddd; /* Solid border */
}

.info-block:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  transform: translateY(-3px);
}

@media (prefers-color-scheme: dark) {
  .info-block {
    background-color: #1e1e1e; /* Solid dark background */
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    border: 1px solid #333333; /* Solid border */
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary-color);
  margin-bottom: 6px;
}

.info-value {
  font-size: 15px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85); /* Darker text for light theme */
}

@media (prefers-color-scheme: dark) {
  .info-value {
    color: #ffffff; /* Full white for better visibility */
  }
  
  .info-label {
    color: #64b5f6; /* Brighter blue in dark mode for better visibility */
  }
}

.companies-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.company-item {
  text-align: center;
  background-color: #f0f0f0; /* Solid light gray background */
  border-radius: 8px;
  padding: 12px;
  transition: var(--transition);
  border: 1px solid #dddddd;
}

.company-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .company-item {
    background-color: #2a2a2a; /* Solid dark background */
    border: 1px solid #333333;
  }
}

.company-logo {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.company-logo img {
  max-height: 40px;
  max-width: 100%;
  object-fit: contain;
}

.company-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (prefers-color-scheme: dark) {
  .company-name {
    color: var(--text-light);
  }
}

.cast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
}

.cast-member {
  border-radius: 12px;
  overflow: hidden;
  background-color: #f0f0f0; /* Solid light gray background */
  transition: var(--transition);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #dddddd; /* Solid border */
}

.cast-member:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  border-color: #cccccc;
}

@media (prefers-color-scheme: dark) {
  .cast-member {
    background-color: #1e1e1e; /* Solid dark background */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    border: 1px solid #333333; /* Solid border */
  }
  
  .cast-member:hover {
    border-color: #444444;
  }
}

.actor-image {
  height: 0;
  padding-bottom: 150%; /* 2:3 aspect ratio */
  position: relative;
  overflow: hidden;
}

.actor-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition);
}

.cast-member:hover .actor-image img {
  transform: scale(1.05);
}

.actor-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--primary-color);
  background-image: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
}

.actor-info {
  padding: 12px;
}

.actor-name {
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(0, 0, 0, 0.9);
  margin-bottom: 4px;
}

.actor-character {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
}

@media (prefers-color-scheme: dark) {
  .actor-name {
    color: #ffffff;
  }
  
  .actor-character {
    color: rgba(255, 255, 255, 0.8);
  }
}

.footer {
  padding: 20px;
  border-top: 1px solid #dddddd;
  text-align: center;
  background-color: #f5f5f5; /* Solid light gray background */
}

@media (prefers-color-scheme: dark) {
  .footer {
    border-top: 1px solid #333333;
    background-color: #1a1a1a; /* Solid dark background */
  }
}

.tmdb-link {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #01b4e4; /* TMDB's blue color */
  color: white !important; /* Ensure text is always white */
  text-decoration: none;
  border-radius: var(--border-radius);
  font-size: 15px;
  font-weight: 600;
  transition: var(--transition);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 0, 0, 0.2); /* Add stronger border for better visibility */
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3); /* Add text shadow for better contrast */
}

.tmdb-link:hover {
  background-color: #0099c9; /* Darker TMDB blue for hover state */
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
}

.link-icon {
  margin-right: 8px;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .poster-container {
    flex: 0 0 150px;
    transform: translateY(0);
  }
  
  .media-title {
    font-size: 24px;
  }
  
  .media-header {
    height: auto;
    min-height: 250px;
  }
  
  .header-content {
    padding: 20px;
  }
  
  .media-details {
    padding: 20px;
  }
  
  .info-columns {
    grid-template-columns: 1fr;
  }
}

/* Videos tab styles */
.videos-tab {
  margin-bottom: 20px;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.video-item {
  border-radius: 12px;
  overflow: hidden;
  background-color: #f0f0f0;
  transition: var(--transition);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #dddddd;
}

.video-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  border-color: #cccccc;
}

@media (prefers-color-scheme: dark) {
  .video-item {
    background-color: #1e1e1e;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    border: 1px solid #333333;
  }
  
  .video-item:hover {
    border-color: #444444;
  }
}

.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.video-info {
  padding: 12px;
}

.video-title {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--text-dark);
  line-height: 1.3;
}

.video-type {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
  font-weight: 500;
}

@media (prefers-color-scheme: dark) {
  .video-title {
    color: var(--text-light);
  }
  
  .video-type {
    color: rgba(255, 255, 255, 0.7);
  }
}

.no-videos .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(0, 0, 0, 0.5);
  background-color: #f8f8f8;
  border-radius: 12px;
  border: 1px dashed #ccc;
  margin-bottom: 20px;
}

@media (prefers-color-scheme: dark) {
  .no-videos .empty-state {
    color: rgba(255, 255, 255, 0.5);
    background-color: #252525;
    border: 1px dashed #444;
  }
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

@media (max-width: 640px) {
  .header-content {
    flex-direction: column;
  }
  
  .poster-container {
    margin-right: 0;
    margin-bottom: 20px;
    max-width: 140px;
  }
  
  .cast-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .videos-grid {
    grid-template-columns: 1fr;
  }
  
  .media-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .meta-item::after {
    display: none;
  }
  
  .tab-button {
    padding: 10px 15px;
    font-size: 14px;
  }
  
  .section-title {
    font-size: 18px;
  }
}
</style>