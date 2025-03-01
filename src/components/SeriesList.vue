<template>
  <div class="series-list">
    <h2>TV Shows</h2>
    
    <div v-if="loading" class="loading">
      Loading TV shows...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else-if="!series.length" class="no-shows">
      No TV shows found. Make sure your Sonarr instance contains series.
    </div>
    
    <div v-else class="series-grid">
      <div v-for="show in series" :key="show.id" class="series-card">
        <div class="poster" :style="posterStyle(show)">
          <div v-if="!show.images || !show.images.length" class="no-poster">
            {{ show.title }}
          </div>
        </div>
        <div class="series-info">
          <h3>{{ show.title }}</h3>
          <div class="details">
            <span class="year" v-if="show.year">{{ show.year }}</span>
            <span class="status">{{ show.status }}</span>
          </div>
          <div class="network" v-if="show.network">{{ show.network }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import sonarrService from '../services/SonarrService';

export default {
  name: 'SeriesList',
  data() {
    return {
      series: [],
      loading: false,
      error: null
    };
  },
  methods: {
    async fetchSeries() {
      this.loading = true;
      this.error = null;
      
      try {
        this.series = await sonarrService.getSeries();
      } catch (error) {
        console.error('Failed to fetch TV shows:', error);
        this.error = 'Failed to load TV shows. Please check your connection.';
      } finally {
        this.loading = false;
      }
    },
    posterStyle(show) {
      // Find poster image in the show's images array
      const poster = show.images?.find(img => img.coverType === 'poster');
      
      if (poster?.remoteUrl) {
        return { backgroundImage: `url(${poster.remoteUrl})` };
      } else {
        return { backgroundColor: '#2c3e50' };
      }
    }
  },
  mounted() {
    if (sonarrService.isConfigured()) {
      this.fetchSeries();
    } else {
      this.error = 'Sonarr is not configured. Please connect to your Sonarr instance first.';
    }
  }
};
</script>

<style scoped>
.series-list {
  padding: 20px;
}

.loading, .error, .no-shows {
  padding: 20px;
  text-align: center;
}

.error {
  color: #f44336;
}

.series-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.series-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: white;
  transition: transform 0.3s ease;
}

.series-card:hover {
  transform: translateY(-5px);
}

.poster {
  height: 270px;
  background-size: cover;
  background-position: center;
  position: relative;
}

.no-poster {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  text-align: center;
  color: white;
  font-weight: bold;
}

.series-info {
  padding: 12px;
}

h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.details {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.network {
  font-size: 14px;
  color: #666;
}
</style>