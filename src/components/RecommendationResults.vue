<template>
  <div class="recommendations-container">
    <div v-if="!error && recommendations.length > 0" class="recommendation-list" :style="gridStyle">
      <div v-for="(rec, index) in recommendations" :key="index" class="recommendation-card" :class="{ 'compact-mode': shouldUseCompactMode, 'expanded': expandedCards.has(index) }">
        <!-- Whole card content is clickable for TMDB -->
        <div class="card-content" 
          @click="openTMDBDetailModal(rec)" 
          :class="{ 'clickable': isTMDBAvailable, 'compact-layout': shouldUseCompactMode, 'horizontal-layout': !shouldUseCompactMode }"
          :title="isTMDBAvailable ? 'Click for more details' : ''"
        >
          <!-- Poster container -->
          <div class="poster-container" :class="{ 'poster-left': !shouldUseCompactMode }">
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
                  <span v-else class="add-button-content">
                    <span class="add-text">
                      Add</span>
                  </span>
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
              
              <!-- Updated v-if to check rec.rating OR the presence of any rating in rec.ratings -->
              <div v-if="rec.rating || (rec.ratings && (rec.ratings.imdb || rec.ratings.rottenTomatoes || rec.ratings.metacritic || rec.ratings.tmdb))" class="rating-info">
                <div class="ratings-container">
                  <!-- Recommendarr Rating -->
                  <div v-if="rec.rating" class="rating-item recommendarr-rating">
                    <div class="rating-service-icon recommendarr-icon">
                      <span>RR</span>
                    </div>
                    <span class="rating-text">{{ extractScore(rec.rating) }}%</span>
                  </div>
                  
                  <!-- IMDB Rating - Now checks rec.ratings.imdb -->
                  <div v-if="rec.ratings && rec.ratings.imdb" class="rating-item imdb-rating">
                    <div class="rating-service-icon imdb-icon">
                      <span>IMDb</span>
                    </div>
                    <span class="rating-text">{{ rec.ratings.imdb.value }}</span>
                  </div>
                  
                  <!-- Rotten Tomatoes Rating - Now checks rec.ratings.rottenTomatoes -->
                  <div v-if="rec.ratings && rec.ratings.rottenTomatoes" class="rating-item rt-rating">
                    <div class="rating-service-icon rt-icon">
                      <span>RT</span>
                    </div>
                    <span class="rating-text">{{ rec.ratings.rottenTomatoes.value }}%</span> <!-- Assuming RT value is percentage -->
                  </div>

                  <!-- Metacritic Rating - New -->
                  <div v-if="rec.ratings && rec.ratings.metacritic" class="rating-item metacritic-rating">
                    <div class="rating-service-icon metacritic-icon">
                      <span>MC</span>
                    </div>
                    <span class="rating-text">{{ rec.ratings.metacritic.value }}</span>
                  </div>

                  <!-- TMDB Rating - New -->
                  <div v-if="rec.ratings && rec.ratings.tmdb" class="rating-item tmdb-rating">
                    <div class="rating-service-icon tmdb-icon">
                      <span>TMDB</span>
                    </div>
                    <span class="rating-text">{{ rec.ratings.tmdb.value }}</span>
                  </div>
                </div>
              </div>
              
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
      handler() {
        
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
      // Calculate available width per card based on screen width and columns
      const screenWidth = window.innerWidth;
      const numColumns = this.getNumColumns();
      const availableGap = numColumns > 1 ? (numColumns - 1) * 30 : 0; // Account for gaps between cards
      const availableWidthPerCard = (screenWidth - availableGap) / numColumns;
      
      // Use compact mode when cards would be too narrow for horizontal layout
      // 450px is a good threshold where horizontal layout starts to look cramped
      return availableWidthPerCard < 450;
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
    // New method to get rating meter style
    getRatingStyle(ratingText) {
      const score = parseInt(this.extractScore(ratingText));
      return {
        width: `${score}%`
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
      const score = parseInt(scoreValue);
      
      if (score >= 75) return 'score-high';
      if (score >= 60) return 'score-medium';
      return 'score-low';
    },
    // Like a TV show recommendation
    async likeRecommendation(title) {
      let updatedLiked = [...this.likedRecommendations];
      let updatedDisliked = [...this.dislikedRecommendations];

      const likedIndex = updatedLiked.indexOf(title);
      const dislikedIndex = updatedDisliked.indexOf(title);

      if (likedIndex !== -1) {
        // Already liked, so unlike it
        updatedLiked.splice(likedIndex, 1);
      } else {
        // Not liked, so like it
        updatedLiked.push(title);
        // If it was disliked, remove from disliked
        if (dislikedIndex !== -1) {
          updatedDisliked.splice(dislikedIndex, 1);
          this.$emit('update:dislikedRecommendations', updatedDisliked);
        }
      }
      
      this.$emit('update:likedRecommendations', updatedLiked);
    },
    // Dislike a TV show recommendation
    async dislikeRecommendation(title) {
      let updatedLiked = [...this.likedRecommendations];
      let updatedDisliked = [...this.dislikedRecommendations];

      const likedIndex = updatedLiked.indexOf(title);
      const dislikedIndex = updatedDisliked.indexOf(title);

      if (dislikedIndex !== -1) {
        // Already disliked, so un-dislike it
        updatedDisliked.splice(dislikedIndex, 1);
      } else {
        // Not disliked, so dislike it
        updatedDisliked.push(title);
        // If it was liked, remove from liked
        if (likedIndex !== -1) {
          updatedLiked.splice(likedIndex, 1);
          this.$emit('update:likedRecommendations', updatedLiked);
        }
      }
      
      this.$emit('update:dislikedRecommendations', updatedDisliked);
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
      if (!this.isTMDBAvailable) {
        
        return;
      }
      
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
        
        // Direct check assuming the imageService has this method
        const isAvailable = await imageService.isTMDBAvailable();
        
        this.tmdbAvailable = !!isAvailable;
      } catch (error) {
        console.error('Error checking TMDB availability:', error);
        this.tmdbAvailable = false;
      }
      
    },
    
    // Poster click is now handled directly in the template with @click.stop directive
    
    handleWindowResize() {
      // This triggers a reactivity update for the shouldUseCompactMode computed property
      this.$forceUpdate();
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
/* Add these styles at the top of your existing <style> section */
.recommendations-container {
  height: calc(100vh - 100px); /* Adjust 100px based on your header/navigation height */
  overflow-y: auto;
  padding: 20px;
  /* Improve scrolling experience */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

/* Update existing .recommendation-list styles */
.recommendation-list {
  display: grid;
  width: 100%;
  gap: 30px;
  align-items: start;
  /* Remove any existing margin-top/bottom */
  margin: 0;
}

/* Add custom scrollbar styles */
.recommendations-container::-webkit-scrollbar {
  width: 8px;
}

.recommendations-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.recommendations-container::-webkit-scrollbar-thumb {
  background: rgba(var(--primary-color-rgb), 0.3);
  border-radius: 4px;
}

.recommendations-container::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--primary-color-rgb), 0.5);
}

/* Recommendation list grid layout */
.recommendation-list {
  display: grid;
  width: 100%;
  margin: 20px 0;
  gap: 30px;
  align-items: start; /* Prevent row height from being determined by tallest item */
}

/* Card base styles - more modern and flat */
.recommendation-card {
  background-color: var(--card-bg-color);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

/* Subtle hover effects */
.recommendation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

/* Card content */
.card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  cursor: default;
}

.card-content.clickable {
  cursor: pointer;
}

/* Horizontal layout for non-compact cards */
.card-content.horizontal-layout {
  flex-direction: row;
  height: auto; /* Allow the card to adjust height based on content */
  min-height: 180px; /* Minimum height to ensure poster is fully visible */
}

/* Modernized poster container */
.poster-container {
  position: relative;
  height: 180px;
  overflow: hidden;
  background-color: #f0f0f0;
}

/* Left-aligned poster for non-compact mode */
.poster-container.poster-left {
  width: 150px;
  min-width: 150px;
  height: 100%;
  border-radius: 8px 0 0 8px;
}

.poster {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  transition: transform 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.poster::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.7) 100%);
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.recommendation-card:hover .poster {
  transform: scale(1.03);
}

/* Clickable poster styles */
.clickable-poster {
  cursor: pointer;
  position: relative;
}

.clickable-poster:hover::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255,255,255,0.08);
  z-index: 1;
}

/* Title fallback for missing posters */
.title-fallback {
  font-size: 32px;
  font-weight: 600;
  color: var(--header-color);
  opacity: 0.5;
}

/* Details container */
.details-container {
  padding: 18px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  gap: 12px;
  overflow: hidden; /* Prevent content overflow */
}

/* Adjust details container for horizontal layout */
.horizontal-layout .details-container {
  padding: 14px;
  overflow-y: visible; /* Show all content without scrolling */
  display: flex;
  flex-direction: column;
}

/* Card header with title and actions */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

/* Adjust header for horizontal layout */
.horizontal-layout .card-header {
  margin-bottom: 8px;
}

.recommendation-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--header-color);
  line-height: 1.3;
}

/* Adjust title for horizontal layout */
.horizontal-layout h3 {
  font-size: 16px;
  line-height: 1.2;
}

.recommendation-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color);
}

/* Action buttons container */
.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Modernized like/dislike buttons */
.like-dislike-buttons {
  display: flex;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  padding: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  color: var(--text-color);
  opacity: 0.6;
  transition: all 0.2s ease;
  height: 28px;
  width: 28px;
}

.action-btn:hover {
  opacity: 0.9;
  background-color: rgba(0, 0, 0, 0.05);
}

.action-btn.active {
  background-color: rgba(var(--primary-color-rgb), 0.12);
  opacity: 1;
  color: var(--primary-color);
}

/* Enhanced Add button */
.request-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  height: 32px;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  position: relative;
  overflow: hidden;
}

.request-button:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.request-button:hover:not(:disabled):before {
  opacity: 1;
}

.request-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.18);
}

.request-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.request-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.request-button.requested {
  background-color: var(--success-color);
  animation: success-pulse 1s ease forwards;
}

.request-button.loading {
  background-color: var(--primary-color-dark);
}

.add-button-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.add-text {
  text-shadow: 0px 1px 2px rgba(0,0,0,0.2);
  font-weight: 600;
  color: var(--text-color);
}

@keyframes success-pulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--success-color-rgb, 40, 167, 69), 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(var(--success-color-rgb, 40, 167, 69), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--success-color-rgb, 40, 167, 69), 0); }
}

/* Content sections */
.content-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Adjust content for horizontal layout */
.horizontal-layout .content-container {
  gap: 10px; /* Tighter spacing between sections */
}

/* Remove ellipsis and line clamping for all content sections in horizontal layout */
.horizontal-layout .description p,
.horizontal-layout .reasoning-content p,
.horizontal-layout .full-text p {
  display: block;
  -webkit-line-clamp: unset;
  -webkit-box-orient: unset;
  overflow: visible;
  text-overflow: unset;
}

/* Remove any max-height constraints */
.horizontal-layout .description,
.horizontal-layout .reasoning,
.horizontal-layout .full-text {
  max-height: none;
  overflow: visible;
}

/* Remove the ellipsis limitation specifically for reasoning-content */
.horizontal-layout .reasoning-content p {
  display: block; /* Override the -webkit-box display */
  -webkit-line-clamp: unset; /* Remove line clamp */
  overflow: visible; /* Allow content to be fully visible */
  text-overflow: unset; /* Remove ellipsis */
}

.description {
  transition: transform 0.2s ease;
}

  /* Minimal Rating section */
  .rating-info {
    margin-top: 6px;
    margin-bottom: 6px;
    padding: 8px;
    background-color: transparent;
    border-radius: 8px;
    transition: all 0.2s ease;
    border: 1px solid rgba(0, 0, 0, 0.04);
  }

  .ratings-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
    row-gap: 8px;
  }

  .rating-item {
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: 4px;
    padding: 2px 6px;
  }

  .rating-service-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 10px;
    min-width: 20px;
    text-align: center;
  }

  .recommendarr-icon {
    color: var(--primary-color);
  }

  .imdb-icon {
    color: #F5C518;
  }

  .rt-icon {
    color: #FA320A; /* Standard Rotten Tomatoes red */
  }

  .metacritic-icon {
    color: #FFCC33; /* Standard Metacritic yellow */
  }

  .tmdb-icon {
    color: #01D277; /* Standard TMDB green */
  }

  .rating-text {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-color);
  }

  /* Dark mode specific styles */
  :root[data-theme="dark"] .rating-info {
    background-color: rgba(255, 255, 255, 0.05);
  }

/* Reasoning section */
.reasoning {
  background-color: rgba(var(--primary-color-rgb), 0.04);
  border-radius: 8px;
  padding: 12px;
  margin-top: 4px;
  transition: all 0.2s ease;
  border: 1px solid rgba(var(--primary-color-rgb), 0.06);
}

/* Adjust reasoning section for horizontal layout */
.horizontal-layout .reasoning {
  padding: 10px;
  margin-top: 2px;
}

.horizontal-layout .reasoning-header {
  margin-bottom: 4px;
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: 6px;
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
  font-size: 14px;
  line-height: 1.5;
}

.full-text {
  transition: transform 0.2s ease;
}


/* Retry poster button */
.retry-poster-button {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  transition: all 0.2s ease;
  backdrop-filter: blur(2px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.retry-poster-button:hover {
  background-color: rgba(0, 0, 0, 0.8);
  transform: scale(1.05);
}

.retry-poster-button.loading {
  pointer-events: none;
  opacity: 0.7;
}

.retry-poster-button svg {
  width: 16px;
  height: 16px;
}

/* Spinner */
.small-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Compact mode */
.recommendation-card.compact-mode {
  display: flex;
  flex-direction: column;
  height: auto; /* Allow each card to determine its own height */
}

.recommendation-card.compact-mode .poster-container {
  height: 140px;
}

.recommendation-card.compact-mode .details-container {
  padding: 14px;
}

.recommendation-card.compact-mode h3 {
  font-size: 16px;
}

.recommendation-card.compact-mode:not(.expanded) .description,
.recommendation-card.compact-mode:not(.expanded) .reasoning,
.recommendation-card.compact-mode:not(.expanded) .rating-info {
  display: none;
}

.recommendation-card.compact-mode.expanded {
  height: auto;
  z-index: 1; /* Ensure expanded cards appear above others */
}

/* Expand/collapse button */
.full-width-expand-button {
  width: 100%;
  background: none;
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 10px;
  margin-top: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-color);
  opacity: 0.8;
  font-size: 13px;
  transition: all 0.2s ease;
  border-radius: 0 0 10px 10px;
}

.full-width-expand-button:hover {
  background-color: rgba(0, 0, 0, 0.03);
  opacity: 1;
}

.full-width-expand-button.expanded {
  background-color: rgba(var(--primary-color-rgb), 0.04);
}

/* Smooth transition for expanded content */
.recommendation-card.compact-mode .content-container {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out, opacity 0.2s ease-out;
  opacity: 0;
}

.recommendation-card.compact-mode.expanded .content-container {
  max-height: 500px;
  transition: max-height 0.3s ease-in, opacity 0.3s ease-in;
  opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .recommendation-list {
    gap: 24px;
  }
  
  .details-container {
    padding: 16px;
  }
}

@media (max-width: 600px) {
  .recommendation-list {
    gap: 20px;
  }
  
  .recommendation-card p {
    font-size: 13px;
  }
  
  .recommendation-card {
    border-radius: 8px;
  }
  
  .recommendation-card:hover {
    transform: translateY(-1px);
  }
  
  .poster-container {
    height: 160px;
  }
  
  .details-container {
    padding: 14px;
  }
}

/* Touch device optimizations */
@media (hover: none) {
  .recommendation-card:hover {
    transform: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  
  .recommendation-card:hover .poster {
    transform: none;
  }
  
  .action-btn:hover {
    opacity: 0.6;
    background: none;
  }
  
  .action-btn:active {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .request-button:hover {
    background-color: var(--primary-color);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  .request-button:active {
    background-color: var(--primary-color-dark);
  }
}
</style>
