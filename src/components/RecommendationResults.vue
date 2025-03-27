<template>
  <div v-if="!error && recommendations.length > 0" class="recommendation-list" :style="gridStyle">
    <div v-for="(rec, index) in recommendations" :key="index" class="recommendation-card" :class="{ 'compact-mode': shouldUseCompactMode, 'expanded': expandedCards.has(index) }">
      <!-- Whole card content is clickable for TMDB -->
      <div class="card-content" 
        @click="openTMDBDetailModal(rec)" 
        :class="{ 'clickable': isTMDBAvailable, 'compact-layout': shouldUseCompactMode }"
        :title="isTMDBAvailable ? 'Click for more details' : ''"
      >
        <!-- Poster container -->
        <div class="poster-container">
          <div 
            class="poster" 
            :style="getPosterStyle(rec.title)"
            @click.stop="openTMDBDetailModal(rec)"
            :class="{ 'clickable-poster': isTMDBAvailable }"
          >
            <div v-if="!hasPoster(rec.title)" class="title-fallback" @click.stop="openTMDBDetailModal(rec)">
              {{ getInitials(rec.title) }}
            </div>
            
            <button 
              v-if="isPosterFallback(rec.title)" 
              class="retry-poster-button" 
              :class="{ 'loading': loadingPosters.get(cleanTitle(rec.title)) }"
              @click.stop.prevent="retryPoster(rec.title)"
              title="Retry loading poster"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 12c0 6.075-4.925 11-11 11S1 18.075 1 12 5.925 1 12 1s11 4.925 11 11z"/>
                <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>
                <path d="M12 8v4l3 3"/>
                <path d="M7 6.7l1.5 1.5M17 6.7L15.5 8.2M7 17.3l1.5-1.5M17 17.3l-1.5-1.5"/>
              </svg>
            </button>
          </div>
          
          <div v-if="rec.rating" class="rating-badge" 
            :class="getScoreClass(rec.rating)"
            :data-rating="extractScore(rec.rating) + '%'">
          </div>
        </div>
        
        <div class="details-container">
          <div class="card-header">
            <h3>{{ rec.title }}</h3>
            <div class="card-actions">
              <div class="like-dislike-buttons">
                <button 
                  @click.stop="likeRecommendation(rec.title)" 
                  class="action-btn like-btn"
                  :class="{'active': isLiked(rec.title)}"
                  title="Like this recommendation">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                </button>
                <button 
                  @click.stop="dislikeRecommendation(rec.title)" 
                  class="action-btn dislike-btn"
                  :class="{'active': isDisliked(rec.title)}"
                  title="Dislike this recommendation">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm10-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                  </svg>
                </button>
              </div>
              <button 
                @click.stop="requestSeries(rec.title)" 
                class="request-button"
                :class="{'loading': requestingSeries === rec.title, 'requested': requestStatus[rec.title]?.success}"
                :disabled="requestingSeries || requestStatus[rec.title]?.success"
                :title="isMovieMode ? 'Add to Radarr' : 'Add to Sonarr'">
                <span v-if="requestingSeries === rec.title">
                  <div class="small-spinner"></div>
                </span>
                <span v-else-if="requestStatus[rec.title]?.success">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                <span v-else>Add</span>
              </button>
            </div>
          </div>
          
          <div class="content-container">
            <div v-if="rec.description" class="description">
              <p>{{ rec.description }}</p>
            </div>
            
            <div v-if="rec.reasoning" class="reasoning">
              <div class="reasoning-header">
                <div class="reasoning-icon">✨</div>
                <span class="reasoning-label">Why you might like it</span>
              </div>
              <div class="reasoning-content">
                <p>{{ rec.reasoning }}</p>
              </div>
            </div>
            
            <div v-if="rec.rating" class="rating-info"></div>
            
            
            <div v-if="!rec.description && !rec.reasoning" class="full-text">
              <p>{{ rec.fullText }}</p>
            </div>
          </div>
          
          <!-- Full-width expand button at bottom of card for compact mode -->
          <button v-if="shouldUseCompactMode" 
                  class="full-width-expand-button" 
                  @click.stop="toggleCardExpansion(index)"
                  :title="expandedCards.has(index) ? 'Hide details' : 'Show more details'"
                  :class="{ 'expanded': expandedCards.has(index) }">
            <span>{{ expandedCards.has(index) ? 'Show Less' : 'Show More' }}</span>
            <svg v-if="!expandedCards.has(index)" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="7 13 12 18 17 13"></polyline>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="7 11 12 6 17 11"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import imageService from '../services/ImageService';

export default {
  name: 'RecommendationResults',
  props: {
    recommendations: {
      type: Array,
      required: true,
      default: () => []
    },
    error: {
      type: Object,
      default: null
    },
    requestStatus: {
      type: Object,
      required: true,
      default: () => ({})
    },
    requestingSeries: {
      type: String,
      default: null
    },
    isMovieMode: {
      type: Boolean,
      required: true
    },
    likedRecommendations: {
      type: Array,
      required: true,
      default: () => []
    },
    dislikedRecommendations: {
      type: Array,
      required: true,
      default: () => []
    },
    columnsCount: {
      type: Number,
      default: 2
    }
  },
  watch: {
    // Watch for changes to recommendations to update posters
    recommendations: {
      handler(newRecommendations) {
        // If we have recommendations and their length changed, fetch all posters
        if (newRecommendations.length > 0) {
          // Check if we need to fetch new posters
          const needsFetch = newRecommendations.some(rec => {
            const cleanTitle = this.cleanTitle(rec.title);
            return !this.posters.has(cleanTitle);
          });
          
          if (needsFetch) {
            this.fetchPosters();
          }
        }
      },
      immediate: false
    },
    // If movie mode changes, we need to reset and reload all posters
    isMovieMode: {
      handler() {
        // Clear all posters and states
        this.posters.clear();
        this.loadingPosters.clear();
        this.expandedCards.clear();
        
        // Reload posters for all current recommendations
        if (this.recommendations.length > 0) {
          this.fetchPosters();
        }
        
        // Also recheck TMDB availability as it might be different for movies vs TV
        this.checkTMDBAvailability();
      }
    },
    // Watch for changes to columnsCount
    columnsCount: {
      handler(newValue) {
        console.log('Columns count changed to:', newValue);
        // Force update to recalculate layout
        this.$forceUpdate();
      }
    }
  },
  data() {
    return {
      expandedCards: new Set(), // Track which cards are in expanded view
      loadingPosters: new Map(), // Track which posters are being loaded
      posters: new Map(), // Using a reactive Map for poster URLs
      tmdbAvailable: false // Track TMDB availability
    };
  },
  computed: {
    shouldUseCompactMode() {
      // Improved compact mode detection that works better on all screen sizes
      const screenWidth = window.innerWidth;
      const numColumns = this.getNumColumns();
      
      // Use compact mode if screen is narrow or user has selected many columns
      return screenWidth < 768 || numColumns > 2;
    },
    isTMDBAvailable() {
      return this.tmdbAvailable;
    },
    gridStyle() {
      const numColumns = this.getNumColumns();
      const gap = window.innerWidth < 600 ? '20px' : '30px';
      
      return {
        'grid-template-columns': `repeat(${numColumns}, 1fr)`,
        'gap': gap
      };
    }
  },
  methods: {
    getNumColumns() {
      const screenWidth = window.innerWidth;
      
      // Use the parent's columnsCount but be responsive on small screens
      if (screenWidth < 600) return 1;
      
      // On larger screens, respect the parent's columnsCount setting
      return this.columnsCount;
    },
    // Toggle card expansion in compact mode
    toggleCardExpansion(index) {
      if (this.expandedCards.has(index)) {
        this.expandedCards.delete(index);
      } else {
        this.expandedCards.add(index);
      }
    },
    // Clean title for consistent poster lookup
    cleanTitle(title) {
      return title.replace(/[:.!?]+$/, '').trim();
    },
    // Check if we have a poster for this title
    hasPoster(title) {
      const clean = this.cleanTitle(title);
      return this.posters.has(clean);
    },
    // Check if poster is a fallback and should have retry button
    isPosterFallback(title) {
      const clean = this.cleanTitle(title);
      const posterUrl = this.posters.get(clean);
      return posterUrl && posterUrl.includes('fallback');
    },
    // Retry loading a poster for a specific title
    async retryPoster(title) {
      const clean = this.cleanTitle(title);
      
      // Set loading state
      this.loadingPosters.set(clean, true);
      
      try {
        // Try to get a real poster
        const posterUrl = this.isMovieMode
          ? await imageService.getPosterForMovie(clean)
          : await imageService.getPosterForShow(clean);
        
        if (posterUrl) {
          this.posters.set(clean, posterUrl);
        }
      } catch (error) {
        console.error('Error retrying poster:', error);
      } finally {
        // Clear loading state
        this.loadingPosters.set(clean, false);
      }
    },
    // Get poster style for CSS
    getPosterStyle(title) {
      const clean = this.cleanTitle(title);
      const posterUrl = this.posters.get(clean);
      
      if (posterUrl) {
        return {
          'background-image': `url(${posterUrl})`,
          'background-size': 'cover',
          'background-position': 'center'
        };
      }
      
      return {
        'background-color': 'var(--card-bg-color)'
      };
    },
    // Get initials for fallback display
    getInitials(title) {
      if (!title) return '';
      
      return title
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    },
    // Extract just the numeric score from the rating text
    extractScore(ratingText) {
      if (!ratingText || ratingText === 'N/A') {
        return '0';
      }
      
      // First try to match a standard percentage pattern like "85%"
      const percentMatch = ratingText.match(/(\d+)%/);
      if (percentMatch) {
        return percentMatch[1];
      }
      
      // Try to match a decimal rating like "8.5/10"
      const decimalMatch = ratingText.match(/(\d+(\.\d+)?)\s*\/\s*10/);
      if (decimalMatch) {
        // Convert from 0-10 scale to 0-100
        return Math.round(parseFloat(decimalMatch[1]) * 10).toString();
      }
      
      // If no pattern matches, return 0
      return '0';
    },
    // Determine CSS class for Recommendarr Rating
    getScoreClass(scoreText) {
      if (!scoreText || scoreText === 'N/A') {
        return 'score-na';
      }
      
      // Get a numeric score from the text using our extract method
      const scoreValue = this.extractScore(scoreText);
      const score = parseInt(scoreValue, 10);
      
      if (score >= 75) return 'score-high';
      if (score >= 60) return 'score-medium';
      return 'score-low';
    },
    // Like a TV show recommendation
    async likeRecommendation(title) {
      // If it's already liked, remove it from liked list (toggle behavior)
      if (this.isLiked(title)) {
        this.$emit('update:likedRecommendations', this.likedRecommendations.filter(item => item !== title));
        return;
      }
      
      // Remove from disliked list if it was there
      if (this.isDisliked(title)) {
        this.$emit('update:dislikedRecommendations', this.dislikedRecommendations.filter(item => item !== title));
      }
      
      // Add to liked list
      this.$emit('update:likedRecommendations', [...this.likedRecommendations, title]);
    },
    // Dislike a TV show recommendation
    async dislikeRecommendation(title) {
      // If it's already disliked, remove it from disliked list (toggle behavior)
      if (this.isDisliked(title)) {
        this.$emit('update:dislikedRecommendations', this.dislikedRecommendations.filter(item => item !== title));
        return;
      }
      
      // Remove from liked list if it was there
      if (this.isLiked(title)) {
        this.$emit('update:likedRecommendations', this.likedRecommendations.filter(item => item !== title));
      }
      
      // Add to disliked list
      this.$emit('update:dislikedRecommendations', [...this.dislikedRecommendations, title]);
    },
    // Check if a TV show is liked
    isLiked(title) {
      return this.likedRecommendations.includes(title);
    },
    // Check if a TV show is disliked
    isDisliked(title) {
      return this.dislikedRecommendations.includes(title);
    },
    // Open TMDB detail modal
    openTMDBDetailModal(recommendation) {
      console.log('RecommendationResults: Opening TMDB modal for:', recommendation.title);
      // Make sure we emit the entire recommendation object
      this.$emit('open-tmdb-modal', recommendation);
    },
    
    // The handlePosterClick method was removed since the entire card is now using a single click handler
    // Request series
    requestSeries(title) {
      this.$emit('request-series', title);
    },
    async checkTMDBAvailability() {
      try {
        console.log('Checking TMDB availability...');
        // Direct check assuming the imageService has this method
        const isAvailable = await imageService.isTMDBAvailable();
        console.log('TMDB availability result:', isAvailable);
        this.tmdbAvailable = !!isAvailable;
      } catch (error) {
        console.error('Error checking TMDB availability:', error);
        this.tmdbAvailable = false;
      }
      console.log('TMDB availability set to:', this.tmdbAvailable);
    },
    
    // Poster click is now handled directly in the template with @click.stop directive
    
    handleWindowResize() {
      // This triggers a reactivity update for the shouldUseCompactMode computed property
      this.$forceUpdate();
      
      // Force a re-computation of computed properties affected by screen size:
      // - gridStyle for layout
      // - shouldUseCompactMode for card display mode
      // This ensures both the layout and card presentation adapt properly to changes
      
      // Log current status to help with troubleshooting
      const isCompact = this.shouldUseCompactMode;
      const columns = this.getNumColumns();
      console.log(`Window resize: Compact mode ${isCompact ? 'active' : 'inactive'}, Columns: ${columns}`);
    },
    
    // Method to fetch posters for all recommendations
    async fetchPosters() {
      // Clear existing loading states
      this.loadingPosters.clear();
      
      // Create requests for all recommendations
      const posterPromises = this.recommendations.map(async (rec) => {
        try {
          // Extract clean title (removing any punctuation at the end)
          const cleanTitle = this.cleanTitle(rec.title);
          
          // Use the appropriate poster fetching method based on content type
          const posterUrl = this.isMovieMode 
            ? await imageService.getPosterForMovie(cleanTitle)
            : await imageService.getPosterForShow(cleanTitle);
          
          if (posterUrl) {
            // Update posters state using Map methods
            this.posters.set(cleanTitle, posterUrl);
          } else {
            // Set fallback image
            this.posters.set(cleanTitle, imageService.getFallbackImageUrl(cleanTitle));
          }
        } catch (error) {
          console.error(`Error fetching poster for "${rec.title}":`, error);
          // Fallback image
          this.posters.set(rec.title, imageService.getFallbackImageUrl(rec.title));
        }
      });
      
      // Wait for all requests to complete
      await Promise.all(posterPromises);
    }
  },
  mounted() {
    // Check TMDB availability
    this.checkTMDBAvailability();
    
    // Initialize posters for all recommendations
    if (this.recommendations.length > 0) {
      this.fetchPosters();
    }
    
    // Add window resize listener
    window.addEventListener('resize', this.handleWindowResize);
  },
  beforeUnmount() {
    // Remove window resize listener
    window.removeEventListener('resize', this.handleWindowResize);
  }
};
</script>

<style scoped>
/* Recommendation list grid layout */
.recommendation-list {
  display: grid;
  width: 100%;
  margin: 20px 0;
  gap: 30px;
}

/* Modern card redesign */
.recommendation-card {
  background-color: var(--card-bg-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.recommendation-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.recommendation-card:hover .poster {
  transform: scale(1.08);
}

.recommendation-card:hover .poster::after {
  opacity: 1;
}

.recommendation-card:hover .rating-badge::before {
  opacity: 0.95;
}

.recommendation-card:hover .details-container:before {
  opacity: 1;
}

.recommendation-card h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--header-color);
  line-height: 1.3;
}

.recommendation-card p {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-color);
}

.card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  cursor: default;
}

.card-content.clickable {
  cursor: pointer;
}

.poster-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.clickable-poster {
  cursor: pointer;
}

.clickable-poster::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
  pointer-events: none;
}

.clickable-poster:hover::before {
  opacity: 1;
}

.poster {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  transition: transform 0.5s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2; /* Ensure the poster is above other elements */
}

.poster::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%);
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

/* Card and poster are clickable when TMDB is available */
.clickable {
  cursor: pointer !important;
}

.clickable-poster {
  cursor: pointer !important;
  position: relative;
}

.clickable-poster:hover::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255,255,255,0.1);
  z-index: 1;
}

.title-fallback {
  font-size: 36px;
  font-weight: bold;
  color: var(--header-color);
}

.details-container {
  padding: 15px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.details-container:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, var(--primary-color), var(--accent-color));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.like-dislike-buttons {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  color: var(--text-color);
  opacity: 0.6;
  transition: all 0.2s ease;
}

.action-btn:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.05);
}

.action-btn.active {
  opacity: 1;
  color: var(--primary-color);
}

.request-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  height: 28px;
}

.request-button:hover {
  background-color: var(--primary-color-dark);
}

.request-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.request-button.requested {
  background-color: var(--success-color);
}

.content-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.description {
  margin-bottom: 10px;
  transition: transform 0.3s ease;
}

.reasoning {
  background-color: rgba(var(--primary-color-rgb), 0.05);
  border-radius: 8px;
  padding: 12px;
  margin-top: 5px;
  transition: all 0.3s ease, transform 0.3s ease;
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.reasoning-icon {
  font-size: 16px;
}

.reasoning-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--primary-color);
}

.reasoning-content p {
  font-size: 15px;
  line-height: 1.4;
}

.full-text {
  transition: transform 0.3s ease;
}

.rating-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  z-index: 2;
}

.rating-badge::before {
  content: attr(data-rating);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  opacity: 0.9;
  transition: opacity 0.3s ease;
}

.score-high::before {
  background-color: #4CAF50;
}

.score-medium::before {
  background-color: #FFC107;
}

.score-low::before {
  background-color: #F44336;
}

.score-na::before {
  background-color: #9E9E9E;
}

.retry-poster-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  transition: background-color 0.2s ease;
}

.retry-poster-button:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

.retry-poster-button.loading {
  pointer-events: none;
  opacity: 0.7;
}

.small-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Add a gradient border effect to the cards */
.recommendation-card:after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  padding: 2px;
  background: linear-gradient(to bottom right, var(--primary-color), var(--accent-color));
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.recommendation-card:hover:after {
  opacity: 1;
}

.recommendation-card:hover {
  animation: card-lift 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes card-lift {
  0% { transform: translateY(0); }
  100% { transform: translateY(-8px); }
}

/* Compact mode adjustments */
.recommendation-card.compact-mode {
  display: flex;
  flex-direction: column;
}

.recommendation-card.compact-mode .poster-container {
  height: 150px;
}

.recommendation-card.compact-mode .details-container {
  padding: 12px;
}

.recommendation-card.compact-mode h3 {
  font-size: 16px;
}

.recommendation-card.compact-mode:not(.expanded) .description,
.recommendation-card.compact-mode:not(.expanded) .reasoning {
  display: none;
}

.recommendation-card.compact-mode.expanded {
  height: auto;
}

.full-width-expand-button {
  width: 100%;
  background: none;
  border: none;
  border-top: 1px solid var(--border-color);
  padding: 8px;
  margin-top: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--text-color);
  opacity: 0.8;
  transition: all 0.2s ease;
}

.full-width-expand-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  opacity: 1;
}

.full-width-expand-button.expanded {
  background-color: rgba(var(--primary-color-rgb), 0.05);
}

/* Ensure expanded content doesn't disrupt the grid layout */
.recommendation-card.expanded .content-container {
  min-height: fit-content;
}

.recommendation-card:hover .description,
.recommendation-card:hover .reasoning,
.recommendation-card:hover .full-text {
  transform: translateY(-3px);
}

.recommendation-card:hover .description p {
  color: var(--header-color);
}

.recommendation-card:hover .reasoning {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

body.dark-theme .recommendation-card:hover .reasoning {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .recommendation-list {
    gap: 20px;
  }
  
  .recommendation-card p {
    font-size: 15px;
  }
  
  .recommendation-card {
    transform: none !important;
  }
  
  .recommendation-card:hover {
    transform: translateY(-5px) !important;
  }
  
  .recommendation-card:hover .description,
  .recommendation-card:hover .reasoning,
  .recommendation-card:hover .full-text {
    transform: none;
  }
}
</style>
