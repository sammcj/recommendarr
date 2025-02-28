<template>
  <div class="app-container">
    <header>
      <img alt="Vue logo" src="./assets/logo.png" class="logo">
      <h1>Reccommendarr</h1>
    </header>
    
    <main>
      <SonarrConnection v-if="!sonarrConnected" @connected="handleSonarrConnected" />
      
      <div v-if="sonarrConnected">
        <AppNavigation 
          :activeTab="activeTab" 
          @navigate="handleNavigate"
          @logout="handleLogout" 
        />
        
        <div class="content">
          <SeriesList 
            v-if="activeTab === 'shows'" 
            ref="seriesList" 
          />
          
          <ShowRecommendations 
            v-if="activeTab === 'recommendations'" 
            :series="series"
            :sonarrConfigured="sonarrConnected"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SonarrConnection from './components/SonarrConnection.vue'
import SeriesList from './components/SeriesList.vue'
import AppNavigation from './components/Navigation.vue'
import ShowRecommendations from './components/Recommendations.vue'
import sonarrService from './services/SonarrService'

export default {
  name: 'App',
  components: {
    SonarrConnection,
    SeriesList,
    AppNavigation,
    ShowRecommendations
  },
  data() {
    return {
      sonarrConnected: false,
      activeTab: 'shows',
      series: []
    }
  },
  created() {
    // Check if Sonarr is already configured on startup
    if (sonarrService.isConfigured()) {
      this.checkSonarrConnection();
    }
  },
  methods: {
    async checkSonarrConnection() {
      try {
        const success = await sonarrService.testConnection();
        if (success) {
          this.sonarrConnected = true;
          this.fetchSeriesData();
        }
      } catch (error) {
        console.error('Failed to connect with stored Sonarr credentials:', error);
      }
    },
    handleSonarrConnected() {
      this.sonarrConnected = true;
      this.fetchSeriesData();
    },
    handleNavigate(tab) {
      this.activeTab = tab;
      
      // If we're switching to the shows tab, refresh the list
      if (tab === 'shows' && this.$refs.seriesList) {
        this.$refs.seriesList.fetchSeries();
      }
      
      // If we're switching to recommendations, ensure we have series data
      if (tab === 'recommendations' && this.series.length === 0) {
        this.fetchSeriesData();
      }
    },
    async fetchSeriesData() {
      try {
        this.series = await sonarrService.getSeries();
      } catch (error) {
        console.error('Failed to fetch series data for recommendations:', error);
      }
    },
    handleLogout() {
      // Clear all stored credentials
      localStorage.removeItem('sonarrBaseUrl');
      localStorage.removeItem('sonarrApiKey');
      localStorage.removeItem('openaiApiKey');
      localStorage.removeItem('openaiModel');
      
      // Reset service configurations
      sonarrService.configure('', '');
      
      // Reset UI state
      this.sonarrConnected = false;
      this.series = [];
      this.activeTab = 'shows';
    }
  }
}
</script>

<style>
body {
  margin: 0;
  background-color: #f5f5f5;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
}

.logo {
  height: 60px;
  margin-right: 15px;
}

h1 {
  margin: 0;
  font-size: 28px;
  color: #2c3e50;
}

main {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.content {
  min-height: 400px;
}
</style>
