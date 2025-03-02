import axios from 'axios';

class OpenAIService {
  constructor() {
    // Try to restore from localStorage on initialization
    this.apiKey = localStorage.getItem('openaiApiKey') || '';
    this.baseUrl = localStorage.getItem('aiApiUrl') || 'https://api.openai.com/v1';
    this.model = localStorage.getItem('openaiModel') || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(localStorage.getItem('aiMaxTokens') || '800');
    this.temperature = parseFloat(localStorage.getItem('aiTemperature') || '0.5');
    
    // Ensure the chat completions endpoint
    this.apiUrl = this.getCompletionsUrl();
  }

  /**
   * Get the chat completions URL based on the base URL
   * @returns {string} - The full URL for chat completions
   */
  getCompletionsUrl() {
    // Normalize the base URL by removing trailing slashes
    const baseUrl = this.baseUrl ? this.baseUrl.replace(/\/+$/, '') : '';
    return `${baseUrl}/chat/completions`;
  }

  /**
   * Configure the OpenAI service with full parameters
   * @param {string} apiKey - Your API key
   * @param {string} model - The model to use
   * @param {string} baseUrl - The base API URL
   * @param {number} maxTokens - Maximum tokens for completion
   * @param {number} temperature - Temperature for randomness
   */
  configure(apiKey, model = 'gpt-3.5-turbo', baseUrl = null, maxTokens = null, temperature = null) {
    this.apiKey = apiKey;
    
    if (model) {
      this.model = model;
    }
    
    if (baseUrl) {
      // Normalize the base URL by removing trailing slashes
      this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
      this.apiUrl = this.getCompletionsUrl();
    }
    
    if (maxTokens !== null) {
      this.maxTokens = maxTokens;
    }
    
    if (temperature !== null) {
      this.temperature = temperature;
    }
  }

  /**
   * Check if the service is configured with API key
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * Get show recommendations based on current library
   * @param {Array} series - List of TV shows from Sonarr
   * @param {number} [count=5] - Number of recommendations to generate
   * @param {string} [genre=''] - Optional genre preference
   * @param {Array} [previousRecommendations=[]] - List of shows to exclude from recommendations
   * @param {Array} [likedRecommendations=[]] - List of shows the user has liked
   * @param {Array} [dislikedRecommendations=[]] - List of shows the user has disliked
   * @param {Array} [recentlyWatchedShows=[]] - List of recently watched shows from Plex
   * @param {boolean} [plexOnlyMode=false] - Whether to use only Plex history for recommendations
   * @returns {Promise<Array>} - List of recommended TV shows
   */
  async getRecommendations(series, count = 5, genre = '', previousRecommendations = [], likedRecommendations = [], dislikedRecommendations = [], recentlyWatchedShows = [], plexOnlyMode = false) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI service is not configured. Please set apiKey.');
    }

    try {
      // Determine if we should use only Plex history or include the library
      let sourceText, sourceLibrary;
      
      if (plexOnlyMode && recentlyWatchedShows && recentlyWatchedShows.length > 0) {
        // Only use the Plex watch history
        sourceText = "my Plex watch history";
        sourceLibrary = recentlyWatchedShows.map(show => show.title).join(', ');
        
        // Add library titles to exclusions to prevent recommending what user already has
        if (series && series.length > 0) {
          const libraryTitles = series.map(show => show.title);
          previousRecommendations = [...new Set([...previousRecommendations, ...libraryTitles])];
        }
      } else {
        // Use the Sonarr library + liked shows as the main library
        sourceText = "my TV show library";
        const showTitles = series.map(show => show.title).join(', ');
        sourceLibrary = likedRecommendations.length > 0 
          ? `${showTitles}, ${likedRecommendations.join(', ')}`
          : showTitles;
      }
      
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);

      // Base prompt
      let userPrompt = `Based on ${sourceText}, recommend ${recommendationCount} new shows I might enjoy. Be brief and direct - no more than 2-3 sentences per section.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus specifically on recommending shows in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add exclusion list for previous recommendations and disliked shows
      const exclusions = [...previousRecommendations, ...dislikedRecommendations];
      if (exclusions.length > 0) {
        userPrompt += `\n\nIMPORTANT: DO NOT recommend any of these shows that I've already seen, been recommended before, or disliked: ${exclusions.join(', ')}`;
      }
      
      // Add disliked shows as explicit negative examples
      if (dislikedRecommendations.length > 0) {
        userPrompt += `\n\nI specifically dislike these shows, so don't recommend anything too similar: ${dislikedRecommendations.join(', ')}`;
      }
      
      // Add recently watched shows from Plex if available and not already using them as the primary source
      if (!plexOnlyMode && recentlyWatchedShows && recentlyWatchedShows.length > 0) {
        const recentShowTitles = recentlyWatchedShows.map(show => show.title).join(', ');
        userPrompt += `\n\nI've recently watched these shows on Plex, so please consider them for better recommendations: ${recentShowTitles}`;
        console.log('Adding recently watched shows to prompt:', recentShowTitles);
      } else if (!recentlyWatchedShows || recentlyWatchedShows.length === 0) {
        console.log('No recently watched shows to add to prompt');
      }
      
      userPrompt += `\n\nFormat each recommendation EXACTLY as follows (using the exact section titles):
1. [Show Title]: 
Description: [brief description] 
Why you might like it: [short reason based on my current shows] 
Recommendarr Rating: [score]% - [brief qualitative assessment]
Available on: [streaming service]

For the Recommendarr Rating, silently calculate a score from 0-100% by privately considering available ratings from sources like IMDB, Rotten Tomatoes, TVDB, Metacritic, and other audience ratings. Then provide:
- Just a single percentage number (e.g., "85%")
- A brief qualitative assessment of the show/movie that explains its strengths/weaknesses
DO NOT mention or cite any specific external rating sources or scores in your explanation.

2. [Next Show Title]:
...and so on.

Do not add extra text, headings, or any formatting. Only use each section title (Description, Why you might like it, Recommendarr Rating, Available on) exactly once per show.

My current shows: ${sourceLibrary}`;

      const messages = [
        {
          role: "system",
          content: "You are a TV show recommendation assistant. Your task is to recommend new TV shows based on the user's current library and recently watched content. Be concise and to the point. Do not use any Markdown formatting like ** for bold or * for italic. You MUST use the exact format requested."
        },
        {
          role: "user",
          content: userPrompt
        }
      ];
      
      return this.getFormattedRecommendations(messages);
    } catch (error) {
      console.error('Error getting TV show recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Get movie recommendations based on current library
   * @param {Array} movies - List of movies from Radarr
   * @param {number} [count=5] - Number of recommendations to generate
   * @param {string} [genre=''] - Optional genre preference
   * @param {Array} [previousRecommendations=[]] - List of movies to exclude from recommendations
   * @param {Array} [likedRecommendations=[]] - List of movies the user has liked
   * @param {Array} [dislikedRecommendations=[]] - List of movies the user has disliked
   * @param {Array} [recentlyWatchedMovies=[]] - List of recently watched movies from Plex
   * @param {boolean} [plexOnlyMode=false] - Whether to use only Plex history for recommendations
   * @returns {Promise<Array>} - List of recommended movies
   */
  async getMovieRecommendations(movies, count = 5, genre = '', previousRecommendations = [], likedRecommendations = [], dislikedRecommendations = [], recentlyWatchedMovies = [], plexOnlyMode = false) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI service is not configured. Please set apiKey.');
    }

    try {
      // Determine if we should use only Plex history or include the library
      let sourceText, sourceLibrary;
      
      if (plexOnlyMode && recentlyWatchedMovies && recentlyWatchedMovies.length > 0) {
        // Only use the Plex watch history
        sourceText = "my Plex watch history";
        sourceLibrary = recentlyWatchedMovies.map(movie => movie.title).join(', ');
        
        // Add library titles to exclusions to prevent recommending what user already has
        if (movies && movies.length > 0) {
          const libraryTitles = movies.map(movie => movie.title);
          previousRecommendations = [...new Set([...previousRecommendations, ...libraryTitles])];
        }
      } else {
        // Use the Radarr library + liked movies as the main library
        sourceText = "my movie library";
        const movieTitles = movies.map(movie => movie.title).join(', ');
        sourceLibrary = likedRecommendations.length > 0 
          ? `${movieTitles}, ${likedRecommendations.join(', ')}`
          : movieTitles;
      }
      
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);
      
      // Base prompt
      let userPrompt = `Based on ${sourceText}, recommend ${recommendationCount} new movies I might enjoy. Be brief and direct - no more than 2-3 sentences per section.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus specifically on recommending movies in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add exclusion list for previous recommendations and disliked movies
      const exclusions = [...previousRecommendations, ...dislikedRecommendations];
      if (exclusions.length > 0) {
        userPrompt += `\n\nIMPORTANT: DO NOT recommend any of these movies that I've already seen, been recommended before, or disliked: ${exclusions.join(', ')}`;
      }
      
      // Add disliked movies as explicit negative examples
      if (dislikedRecommendations.length > 0) {
        userPrompt += `\n\nI specifically dislike these movies, so don't recommend anything too similar: ${dislikedRecommendations.join(', ')}`;
      }
      
      // Add recently watched movies from Plex if available and not already using them as the primary source
      if (!plexOnlyMode && recentlyWatchedMovies && recentlyWatchedMovies.length > 0) {
        const recentMovieTitles = recentlyWatchedMovies.map(movie => movie.title).join(', ');
        userPrompt += `\n\nI've recently watched these movies on Plex, so please consider them for better recommendations: ${recentMovieTitles}`;
        console.log('Adding recently watched movies to prompt:', recentMovieTitles);
      } else if (!recentlyWatchedMovies || recentlyWatchedMovies.length === 0) {
        console.log('No recently watched movies to add to prompt');
      }
      
      userPrompt += `\n\nFormat each recommendation EXACTLY as follows (using the exact section titles):
1. [Movie Title]: 
Description: [brief description] 
Why you might like it: [short reason based on my current movies] 
Recommendarr Rating: [score]% - [brief qualitative assessment]
Available on: [streaming service]

For the Recommendarr Rating, silently calculate a score from 0-100% by privately considering available ratings from sources like IMDB, Rotten Tomatoes, TVDB, Metacritic, and other audience ratings. Then provide:
- Just a single percentage number (e.g., "85%")
- A brief qualitative assessment of the movie that explains its strengths/weaknesses
DO NOT mention or cite any specific external rating sources or scores in your explanation.

2. [Next Movie Title]:
...and so on.

Do not add extra text, headings, or any formatting. Only use each section title (Description, Why you might like it, Recommendarr Rating, Available on) exactly once per movie.

My current movies: ${sourceLibrary}`;

      const messages = [
        {
          role: "system",
          content: "You are a movie recommendation assistant. Your task is to recommend new movies based on the user's current library and recently watched content. Be concise and to the point. Do not use any Markdown formatting like ** for bold or * for italic. You MUST use the exact format requested."
        },
        {
          role: "user",
          content: userPrompt
        }
      ];
      
      return this.getFormattedRecommendations(messages);
    } catch (error) {
      console.error('Error getting movie recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Generic method to get recommendations from AI with formatted messages
   * @param {Array} messages - Chat messages to send to the AI
   * @returns {Promise<Array>} - List of formatted recommendations
   */
  async getFormattedRecommendations(messages) {
    try {
      // Define headers based on the API endpoint
      const headers = {};
      
      // Add authentication header based on the API endpoint
      if (this.baseUrl === 'https://api.anthropic.com/v1') {
        headers['x-api-key'] = this.apiKey;
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      headers['Content-Type'] = 'application/json';

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          presence_penalty: 0.1,  // Slightly discourage repetition
          frequency_penalty: 0.1  // Slightly encourage diversity
        },
        { headers }
      );

      // Parse the recommendations from the response
      const recommendations = this.parseRecommendations(response.data.choices[0].message.content);
      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations from AI:', error);
      throw error;
    }
  }

  /**
   * Parse recommendations from the AI response
   * @param {string} content - The AI response content
   * @returns {Array} - List of parsed recommendations
   */
  parseRecommendations(content) {
    // Optimized parsing method
    const recommendations = [];
    
    // Split the response by numbered entries (1., 2., etc.)
    const sections = content.split(/\d+\.\s+/).filter(Boolean);
    
    if (sections.length > 0) {
      // Process each section
      for (const section of sections) {
        // Skip intro text like "Here are five recommendations..."
        if (section.toLowerCase().includes("here are") && 
            (section.toLowerCase().includes("recommendation") || 
             section.toLowerCase().includes("tv show") ||
             section.toLowerCase().includes("movie"))) {
          continue;
        }
        
        // Extract title (first line or up to first colon)
        let title = '';
        let details = section;
        
        if (section.includes(':')) {
          const firstColonIndex = section.indexOf(':');
          title = section.substring(0, firstColonIndex).trim();
          // Remove any markdown formatting (like ** for bold)
          title = title.replace(/\*\*/g, '').trim();
          details = section.substring(firstColonIndex + 1).trim();
        } else {
          // If no colon, try to get the first line
          const firstLineBreak = section.indexOf('\n');
          if (firstLineBreak > 0) {
            title = section.substring(0, firstLineBreak).trim();
            // Remove any markdown formatting (like ** for bold)
            title = title.replace(/\*\*/g, '').trim();
            details = section.substring(firstLineBreak + 1).trim();
          } else {
            title = section.trim();
            // Remove any markdown formatting (like ** for bold)
            title = title.replace(/\*\*/g, '').trim();
            details = '';
          }
        }
        
        // Skip if the title looks like an introduction or section header rather than a show name
        if (title.toLowerCase().includes("here are") || 
            title.toLowerCase().includes("recommendation") ||
            title.toLowerCase().includes("available on") ||
            title.toLowerCase() === "why you might like it" ||
            title.toLowerCase() === "description" ||
            title.length > 50) {
          continue;
        }
        
        // Extract common fields using helper method
        const description = this.extractFieldFromText(details, 'Description', 'Why you might like it');
        const reasoning = this.extractFieldFromText(details, 'Why you might like it', 'Recommendarr Rating');
        const rating = this.extractFieldFromText(details, 'Recommendarr Rating', 'Available on');
        const streaming = this.extractFieldFromText(details, 'Available on', null);
        
        // Skip entries where we couldn't extract meaningful content
        if (!description && !reasoning && !streaming) {
          continue;
        }
        
        recommendations.push({
          title,
          description: description || '',
          reasoning: reasoning || '',
          rating: rating || 'N/A',
          streaming: streaming || 'Unknown',
          fullText: section.trim()
        });
      }
    } else if (content.trim()) {
      // If parsing failed, return whole content
      recommendations.push({
        title: 'Recommendations',
        description: '',
        reasoning: '',
        rating: 'N/A',
        streaming: '',
        fullText: content.trim()
      });
    }
    
    return recommendations;
  }
  
  /**
   * Helper method to extract a field from text
   * @param {string} text - The text to extract from
   * @param {string} startMarker - The start marker to look for
   * @param {string} endMarker - The end marker to look for (optional)
   * @returns {string|null} - The extracted field or null if not found
   */
  extractFieldFromText(text, startMarker, endMarker) {
    // Use case-insensitive search for reliability
    const lowerText = text.toLowerCase();
    const lowerStartMarker = startMarker.toLowerCase();
    const lowerEndMarker = endMarker ? endMarker.toLowerCase() : null;
    
    let startIndex = lowerText.indexOf(lowerStartMarker);
    if (startIndex === -1) return null;
    
    // Get the actual case from the original text
    const actualStartMarker = text.substring(startIndex, startIndex + startMarker.length);
    startIndex += actualStartMarker.length;
    
    // Skip colon and whitespace if present
    if (text[startIndex] === ':') startIndex++;
    while (startIndex < text.length && /\s/.test(text[startIndex])) startIndex++;
    
    let endIndex;
    if (lowerEndMarker) {
      endIndex = lowerText.indexOf(lowerEndMarker, startIndex);
      if (endIndex === -1) endIndex = text.length;
    } else {
      endIndex = text.length;
    }
    
    // Get result, ensuring we don't grab section markers
    const result = text.substring(startIndex, endIndex).trim();
    
    // Sanity check - if result is too short or just punctuation, return null
    if (result.length < 2 || /^[.,;:\s]*$/.test(result)) {
      return null;
    }
    
    return result;
  }
}

// Create a singleton instance
const openAIService = new OpenAIService();

export default openAIService;