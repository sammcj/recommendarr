import axios from 'axios';

class JellyfinService {
  constructor() {
    this.baseUrl = localStorage.getItem('jellyfinBaseUrl') || '';
    this.apiKey = localStorage.getItem('jellyfinApiKey') || '';
    this.userId = localStorage.getItem('jellyfinUserId') || '';
  }

  configure(baseUrl, apiKey, userId) {
    // Ensure baseUrl doesn't end with a slash
    this.baseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : '';
    this.apiKey = apiKey || '';
    this.userId = userId || '';

    localStorage.setItem('jellyfinBaseUrl', this.baseUrl);
    localStorage.setItem('jellyfinApiKey', this.apiKey);
    localStorage.setItem('jellyfinUserId', this.userId);
  }

  isConfigured() {
    return !!this.baseUrl && !!this.apiKey && !!this.userId;
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, message: 'Jellyfin is not configured.' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/System/Info`, {
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });
      
      if (response.status === 200) {
        return { success: true, message: 'Connected to Jellyfin successfully!' };
      } else {
        return { success: false, message: `Error connecting to Jellyfin: ${response.status}` };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Error connecting to Jellyfin: ${error.message || 'Unknown error'}`
      };
    }
  }

  async getRecentlyWatchedMovies(limit = 50, daysAgo = null) {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      // Construct the URL for getting watch history for movies
      const url = `${this.baseUrl}/Users/${this.userId}/Items?IncludeItemTypes=Movie&Recursive=true&SortBy=DatePlayed&SortOrder=Descending&Filters=IsPlayed&Limit=${limit}`;
      
      const response = await axios.get(url, {
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });

      // Filter by date if daysAgo is specified
      const cutoffDate = daysAgo ? new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)) : null;
      
      // Map the response to a standardized format
      const watchedMovies = response.data.Items.map(item => {
        return {
          title: item.Name,
          year: item.ProductionYear,
          viewedAt: new Date(item.UserData.LastPlayedDate),
          ratingKey: item.Id
        };
      });

      // Filter by date if needed
      if (cutoffDate) {
        return watchedMovies.filter(movie => movie.viewedAt > cutoffDate);
      }

      return watchedMovies;
    } catch (error) {
      console.error('Error fetching Jellyfin watched movies:', error);
      return [];
    }
  }

  async getRecentlyWatchedShows(limit = 50, daysAgo = null) {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      // Construct the URL for getting watch history for TV shows
      const url = `${this.baseUrl}/Users/${this.userId}/Items?IncludeItemTypes=Series,Episode&Recursive=true&SortBy=DatePlayed&SortOrder=Descending&Filters=IsPlayed&Limit=${limit}`;
      
      const response = await axios.get(url, {
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });

      // Filter by date if daysAgo is specified
      const cutoffDate = daysAgo ? new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)) : null;
      
      // Process and deduplicate shows
      const showMap = new Map();
      
      response.data.Items.forEach(item => {
        // Handle episode items
        if (item.Type === 'Episode' && item.SeriesName) {
          const seriesId = item.SeriesId;
          if (!showMap.has(seriesId)) {
            showMap.set(seriesId, {
              title: item.SeriesName,
              year: item.SeriesProductionYear,
              viewedAt: new Date(item.UserData.LastPlayedDate),
              ratingKey: seriesId
            });
          } else {
            // Update date if this episode was watched more recently
            const existingDate = showMap.get(seriesId).viewedAt;
            const currentDate = new Date(item.UserData.LastPlayedDate);
            if (currentDate > existingDate) {
              showMap.get(seriesId).viewedAt = currentDate;
            }
          }
        } 
        // Handle series items
        else if (item.Type === 'Series') {
          if (!showMap.has(item.Id) || 
              new Date(item.UserData.LastPlayedDate) > showMap.get(item.Id).viewedAt) {
            showMap.set(item.Id, {
              title: item.Name,
              year: item.ProductionYear,
              viewedAt: new Date(item.UserData.LastPlayedDate),
              ratingKey: item.Id
            });
          }
        }
      });

      // Convert to array and sort by date
      let watchedShows = Array.from(showMap.values());
      watchedShows.sort((a, b) => b.viewedAt - a.viewedAt);

      // Limit results
      watchedShows = watchedShows.slice(0, limit);

      // Filter by date if needed
      if (cutoffDate) {
        return watchedShows.filter(show => show.viewedAt > cutoffDate);
      }

      return watchedShows;
    } catch (error) {
      console.error('Error fetching Jellyfin watched shows:', error);
      return [];
    }
  }
}

// Create a singleton instance
const jellyfinService = new JellyfinService();
export default jellyfinService;