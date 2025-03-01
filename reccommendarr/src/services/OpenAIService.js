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
   * @returns {Promise<Array>} - List of recommended TV shows
   */
  async getRecommendations(series, count = 5, genre = '') {
    if (!this.isConfigured()) {
      throw new Error('OpenAI service is not configured. Please set apiKey.');
    }

    try {
      // Only extract show titles to minimize token usage
      const showTitles = series.map(show => show.title).join(', ');
      
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);

      // Base prompt
      let userPrompt = `Based on my TV show library, recommend ${recommendationCount} new shows I might enjoy. Be brief and direct - no more than 2-3 sentences per section.`;
      
      // Add genre preference if specified
      if (genre) {
        userPrompt += ` Focus specifically on recommending shows in the ${genre} genre.`;
      }
      
      userPrompt += `\n\nFormat each recommendation EXACTLY as follows (using the exact section titles):
1. [Show Title]: 
Description: [brief description] 
Why you might like it: [short reason based on my current shows] 
Available on: [streaming service]

2. [Next Show Title]:
...and so on.

Do not add extra text, headings, or any formatting. Only use each section title (Description, Why you might like it, Available on) exactly once per show.

My current shows: ${showTitles}`;

      const messages = [
        {
          role: "system",
          content: "You are a TV show recommendation assistant. Your task is to recommend new TV shows based on the user's current library. Be concise and to the point. Do not use any Markdown formatting like ** for bold or * for italic. You MUST use the exact format requested."
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
   * @returns {Promise<Array>} - List of recommended movies
   */
  async getMovieRecommendations(movies, count = 5, genre = '') {
    if (!this.isConfigured()) {
      throw new Error('OpenAI service is not configured. Please set apiKey.');
    }

    try {
      // Only extract movie titles to minimize token usage
      const movieTitles = movies.map(movie => movie.title).join(', ');
      
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);
      
      // Base prompt
      let userPrompt = `Based on my movie library, recommend ${recommendationCount} new movies I might enjoy. Be brief and direct - no more than 2-3 sentences per section.`;
      
      // Add genre preference if specified
      if (genre) {
        userPrompt += ` Focus specifically on recommending movies in the ${genre} genre.`;
      }
      
      userPrompt += `\n\nFormat each recommendation EXACTLY as follows (using the exact section titles):
1. [Movie Title]: 
Description: [brief description] 
Why you might like it: [short reason based on my current movies] 
Available on: [streaming service]

2. [Next Movie Title]:
...and so on.

Do not add extra text, headings, or any formatting. Only use each section title (Description, Why you might like it, Available on) exactly once per movie.

My current movies: ${movieTitles}`;

      const messages = [
        {
          role: "system",
          content: "You are a movie recommendation assistant. Your task is to recommend new movies based on the user's current library. Be concise and to the point. Do not use any Markdown formatting like ** for bold or * for italic. You MUST use the exact format requested."
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
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
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
        const reasoning = this.extractFieldFromText(details, 'Why you might like it', 'Available on');
        const streaming = this.extractFieldFromText(details, 'Available on', null);
        
        // Skip entries where we couldn't extract meaningful content
        if (!description && !reasoning && !streaming) {
          continue;
        }
        
        recommendations.push({
          title,
          description: description || '',
          reasoning: reasoning || '',
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