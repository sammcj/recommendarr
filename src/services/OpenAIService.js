import axios from 'axios';

class OpenAIService {
  constructor() {
    // Try to restore from localStorage on initialization
    this.apiKey = localStorage.getItem('openaiApiKey') || '';
    this.baseUrl = localStorage.getItem('aiApiUrl') || 'https://api.openai.com/v1';
    this.model = localStorage.getItem('openaiModel') || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(localStorage.getItem('aiMaxTokens') || '800');
    this.temperature = parseFloat(localStorage.getItem('aiTemperature') || '0.5');
    this.useSampledLibrary = localStorage.getItem('useSampledLibrary') === 'true' || false;
    this.sampleSize = parseInt(localStorage.getItem('librarySampleSize') || '20');
    
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
   * @param {boolean} useSampledLibrary - Whether to use sampled library for recommendations
   * @param {number} sampleSize - Sample size to use when sampling the library
   */
  configure(apiKey, model = 'gpt-3.5-turbo', baseUrl = null, maxTokens = null, temperature = null, useSampledLibrary = null, sampleSize = null) {
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
    
    if (useSampledLibrary !== null) {
      this.useSampledLibrary = useSampledLibrary;
      localStorage.setItem('useSampledLibrary', useSampledLibrary.toString());
    }
    
    if (sampleSize !== null) {
      this.sampleSize = sampleSize;
      localStorage.setItem('librarySampleSize', sampleSize.toString());
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
      let sourceText;
      let primarySource = [];
      let libraryTitles = '';
      
      if (plexOnlyMode && recentlyWatchedShows && recentlyWatchedShows.length > 0) {
        // Only use the Plex watch history
        sourceText = "my Plex watch history";
        primarySource = recentlyWatchedShows.map(show => show.title);
        
        // Add library titles to exclusions to prevent recommending what user already has
        if (series && series.length > 0) {
          const sonarrTitles = series.map(show => show.title);
          previousRecommendations = [...new Set([...previousRecommendations, ...sonarrTitles])];
        }
      } else {
        // Use the Sonarr library + liked shows as the main library
        sourceText = "my TV show library";
        const sonarrTitles = series.map(show => show.title);
        primarySource = [...sonarrTitles];
        
        // Include liked recommendations in the source library
        if (likedRecommendations.length > 0) {
          primarySource = [...primarySource, ...likedRecommendations];
        }
      }
      
      // Create combined exclusion list (everything that shouldn't be recommended)
      // We're not adding the library titles to the exclusion list to save tokens
      // For the sampled approach, we're betting on the AI being varied enough to avoid extreme duplication.
      
      // Determine if we're using the full library or sampled approach
      if (this.useSampledLibrary) {
        // Use a sampled approach for efficiency
        const sampleShows = this.getSampleItems(primarySource, this.sampleSize);
        libraryTitles = sampleShows.join(', ');
      } else {
        // Use the full library approach
        libraryTitles = primarySource.join(', ');
      }
      
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);

      // Base prompt
      let userPrompt = `Based on ${sourceText}, recommend ${recommendationCount} new shows I might enjoy that are CRITICALLY ACCLAIMED and HIGHLY RATED. Be brief and direct - no more than 2-3 sentences per section.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus specifically on recommending shows in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add instructions for diverse, high-quality recommendations
      userPrompt += ` Prioritize shows that match these criteria:
1. Highest overall quality and critical acclaim
2. Strong thematic or stylistic connections to my current library
3. Diverse in content (not just the most obvious recommendations)
4. Include a mix of both popular and lesser-known hidden gems
5. Focus on complete or ongoing shows with consistent quality, not canceled after 1-2 seasons`;
      
      // Add library information with appropriate context based on mode
      if (this.useSampledLibrary) {
        userPrompt += `\n\nHere are some examples from my library (${primarySource.length} shows total) to understand my taste: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any shows that I already have in my library.`;
      } else {
        userPrompt += `\n\nMy current shows: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any shows from the list above as I already have them in my library.`;
      }
      
      // Add previous recommendations to avoid repeating them
      if (previousRecommendations.length > 0) {
        userPrompt += ` You also MUST NOT recommend these previously suggested shows: ${previousRecommendations.join(', ')}`;
      }
      
      // Add disliked shows as explicit negative examples
      if (dislikedRecommendations.length > 0) {
        userPrompt += `\n\nI specifically dislike these shows, so don't recommend anything too similar: ${dislikedRecommendations.join(', ')}`;
      }
      
      // Add recently watched shows from Plex if available and not already using them as the primary source
      if (!plexOnlyMode && recentlyWatchedShows && recentlyWatchedShows.length > 0) {
        const recentTitles = recentlyWatchedShows.map(show => show.title).join(', ');
        userPrompt += `\n\nI've recently watched these shows, so please consider them for better recommendations: ${recentTitles}`;
      }
      
      userPrompt += `\n\nABSOLUTELY CRITICAL: Before suggesting ANY show, you MUST verify it's not something I already have or dislike.

FORMATTING REQUIREMENTS: You MUST follow this EXACT format for each recommendation with no deviation:
1. [Show Title]: 
Description: [brief description] 
Why you might like it: [short reason based on my current shows] 
Recommendarr Rating: [score]% - [brief qualitative assessment]
Available on: [streaming service]

For the Recommendarr Rating, silently calculate a score from 0-100% by privately considering available ratings from sources like IMDB, Rotten Tomatoes, TVDB, Metacritic, and other audience ratings. Then provide:
- Just a single percentage number (e.g., "85%")
- A brief qualitative assessment of the show that explains its strengths/weaknesses
DO NOT mention or cite any specific external rating sources or scores in your explanation.

2. [Next Show Title]:
...and so on.

STRICT RULES:
- Do NOT add any extra text, headings, or formatting
- Use each section title (Description, Why you might like it, Recommendarr Rating, Available on) EXACTLY once per show
- Do NOT use Markdown formatting like bold or italics
- Do NOT include additional information outside the required format
- NEVER recommend any show in my library or exclusion list`;

      const messages = [
        {
          role: "system",
          content: "You are a TV show recommendation assistant. Your task is to recommend new TV shows based on the user's current library and recently watched content. Be concise and follow EXACTLY the required output format. You MUST adhere to these CRITICAL rules:\n\n1. NEVER recommend shows that exist in the user's library or exclusion list\n2. Only recommend shows that truly match the user's preferences\n3. VERIFY each recommendation is not in the exclusion list before suggesting it\n4. DO NOT use any Markdown formatting like ** for bold or * for italic\n5. DO NOT include any extra text, explanations, or headings\n6. Format each recommendation EXACTLY as instructed\n7. Follow the numbering format precisely (1., 2., etc.)"
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
      let sourceText;
      let primarySource = [];
      let libraryTitles = '';
      
      if (plexOnlyMode && recentlyWatchedMovies && recentlyWatchedMovies.length > 0) {
        // Only use the Plex watch history
        sourceText = "my Plex watch history";
        primarySource = recentlyWatchedMovies.map(movie => movie.title);
        
        // Add library titles to exclusions to prevent recommending what user already has
        if (movies && movies.length > 0) {
          const radarrTitles = movies.map(movie => movie.title);
          previousRecommendations = [...new Set([...previousRecommendations, ...radarrTitles])];
        }
      } else {
        // Use the Radarr library + liked movies as the main library
        sourceText = "my movie library";
        const radarrTitles = movies.map(movie => movie.title);
        primarySource = [...radarrTitles];
        
        // Include liked recommendations in the source library
        if (likedRecommendations.length > 0) {
          primarySource = [...primarySource, ...likedRecommendations];
        }
      }
      
      // Create combined exclusion list (everything that shouldn't be recommended)
      // We're not adding the library titles to the exclusion list to save tokens
      // For the sampled approach, we're betting on the AI being smart enough to avoid recommending library items
      // even without an explicit exclusion list
      
      // Determine if we're using the full library or sampled approach
      if (this.useSampledLibrary) {
        // Use a sampled approach for efficiency
        const sampleMovies = this.getSampleItems(primarySource, this.sampleSize);
        libraryTitles = sampleMovies.join(', ');
      } else {
        // Use the full library approach
        libraryTitles = primarySource.join(', ');
      }
      
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);
      
      // Base prompt
      let userPrompt = `Based on ${sourceText}, recommend ${recommendationCount} new movies I might enjoy that are CRITICALLY ACCLAIMED and HIGHLY RATED. Be brief and direct - no more than 2-3 sentences per section.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus specifically on recommending movies in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add instructions for diverse, high-quality recommendations
      userPrompt += ` Prioritize movies that match these criteria:
1. Highest overall quality and critical acclaim
2. Strong thematic or stylistic connections to my current library
3. Diverse in content (not just the most obvious recommendations)
4. Include a mix of both popular and lesser-known hidden gems
5. Consider both classic and recent releases that have stood the test of time`;
      
      // Add library information with appropriate context based on mode
      if (this.useSampledLibrary) {
        userPrompt += `\n\nHere are some examples from my library (${primarySource.length} movies total) to understand my taste: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any movies that I already have in my library.`;
      } else {
        userPrompt += `\n\nMy current movies: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any movies from the list above as I already have them in my library.`;
      }
      
      // Add previous recommendations to avoid repeating them
      if (previousRecommendations.length > 0) {
        userPrompt += ` You also MUST NOT recommend these previously suggested movies: ${previousRecommendations.join(', ')}`;
      }
      
      // Add disliked movies as explicit negative examples
      if (dislikedRecommendations.length > 0) {
        userPrompt += `\n\nI specifically dislike these movies, so don't recommend anything too similar: ${dislikedRecommendations.join(', ')}`;
      }
      
      // Add recently watched movies from Plex if available and not already using them as the primary source
      if (!plexOnlyMode && recentlyWatchedMovies && recentlyWatchedMovies.length > 0) {
        const recentTitles = recentlyWatchedMovies.map(movie => movie.title).join(', ');
        userPrompt += `\n\nI've recently watched these movies, so please consider them for better recommendations: ${recentTitles}`;
      }
      
      userPrompt += `\n\nABSOLUTELY CRITICAL: Before suggesting ANY movie, you MUST verify it's not something I already have or dislike.

FORMATTING REQUIREMENTS: You MUST follow this EXACT format for each recommendation with no deviation:
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

STRICT RULES:
- Do NOT add any extra text, headings, or formatting
- Use each section title (Description, Why you might like it, Recommendarr Rating, Available on) EXACTLY once per movie
- Do NOT use Markdown formatting like bold or italics
- Do NOT include additional information outside the required format
- NEVER recommend any movie in my library or exclusion list`;

      const messages = [
        {
          role: "system",
          content: "You are a movie recommendation assistant. Your task is to recommend new movies based on the user's current library and recently watched content. Be concise and follow EXACTLY the required output format. You MUST adhere to these CRITICAL rules:\n\n1. NEVER recommend movies that exist in the user's library or exclusion list\n2. Only recommend movies that truly match the user's preferences\n3. VERIFY each recommendation is not in the exclusion list before suggesting it\n4. DO NOT use any Markdown formatting like ** for bold or * for italic\n5. DO NOT include any extra text, explanations, or headings\n6. Format each recommendation EXACTLY as instructed\n7. Follow the numbering format precisely (1., 2., etc.)"
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
   * Get a sample of items from an array
   * @param {Array} items - The array of items to sample from
   * @param {number} count - The number of items to sample
   * @returns {Array} - The sampled items
   */
  getSampleItems(items, count) {
    if (!items || items.length === 0) return [];
    if (items.length <= count) return items;
    
    // Shuffle array using Fisher-Yates algorithm
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Return the first 'count' items
    return shuffled.slice(0, count);
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

      // Check if response contains expected data structure
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        console.error('Unexpected API response format:', response.data);
        throw new Error('The AI API returned an unexpected response format. Please try again.');
      }
      
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
    
    // Validate content
    if (!content || typeof content !== 'string') {
      console.error('Invalid content for parsing:', content);
      return recommendations; // Return empty array instead of throwing
    }
    
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
          // Remove any markdown formatting and brackets
          title = title.replace(/\*\*/g, '').trim();
          title = title.replace(/^\[|\]$/g, '').trim();
          details = section.substring(firstColonIndex + 1).trim();
        } else {
          // If no colon, try to get the first line
          const firstLineBreak = section.indexOf('\n');
          if (firstLineBreak > 0) {
            title = section.substring(0, firstLineBreak).trim();
            // Remove any markdown formatting and brackets
            title = title.replace(/\*\*/g, '').trim();
            title = title.replace(/^\[|\]$/g, '').trim();
            details = section.substring(firstLineBreak + 1).trim();
          } else {
            title = section.trim();
            // Remove any markdown formatting and brackets
            title = title.replace(/\*\*/g, '').trim();
            title = title.replace(/^\[|\]$/g, '').trim();
            details = '';
          }
        }
        
        // Handle case where title might be surrounded by brackets
        // Some LLMs might return "[Title Name]:" instead of "Title Name:"
        const bracketMatch = title.match(/^\[(.*)\]$/);
        if (bracketMatch && bracketMatch[1]) {
          title = bracketMatch[1].trim();
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
        
        // Fix case where "Description:" is malformed into the title portion
        if (title.toLowerCase().includes("description")) {
          // Try to extract the actual title from before "description"
          const descIndex = title.toLowerCase().indexOf("description");
          if (descIndex > 0) {
            const possibleTitle = title.substring(0, descIndex).trim();
            // Only use it if it seems like a reasonable title
            if (possibleTitle.length > 0 && possibleTitle.length < 50 && 
                !possibleTitle.toLowerCase().includes("here are")) {
              title = possibleTitle;
            }
          }
        }
        
        // Extract common fields using helper method with fallbacks for flexibility
        let description = this.extractFieldFromText(details, 'Description', 'Why you might like it');
        let reasoning = this.extractFieldFromText(details, 'Why you might like it', 'Recommendarr Rating');
        let rating = this.extractFieldFromText(details, 'Recommendarr Rating', 'Available on');
        let streaming = this.extractFieldFromText(details, 'Available on', null);
        
        // Try alternative patterns if primary extraction failed
        if (!description) {
          description = this.extractFieldFromText(details, 'description', 'why you might like it') ||
                        this.extractFieldFromText(details, 'Synopsis', 'Why') ||
                        this.extractFieldFromText(details, 'About', 'Why');
        }
        
        if (!reasoning) {
          reasoning = this.extractFieldFromText(details, 'why you might like it', 'recommendarr rating') ||
                      this.extractFieldFromText(details, 'Why', 'Rating') ||
                      this.extractFieldFromText(details, 'Appeal', 'Rating');
        }
        
        if (!rating) {
          rating = this.extractFieldFromText(details, 'recommendarr rating', 'available on') ||
                  this.extractFieldFromText(details, 'Rating', 'Available') ||
                  this.extractFieldFromText(details, 'Score', 'Available');
        }
        
        if (!streaming) {
          streaming = this.extractFieldFromText(details, 'available on', null) ||
                     this.extractFieldFromText(details, 'Streaming', null) ||
                     this.extractFieldFromText(details, 'Watch on', null);
        }
        
        // Skip entries where we couldn't extract meaningful content after fallbacks
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