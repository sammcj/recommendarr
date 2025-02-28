import axios from 'axios';

class OpenAIService {
  constructor() {
    // Try to restore from localStorage on initialization
    this.apiKey = localStorage.getItem('openaiApiKey') || '';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = localStorage.getItem('openaiModel') || 'gpt-3.5-turbo';
  }

  /**
   * Configure the OpenAI service with API key
   * @param {string} apiKey - Your OpenAI API key
   * @param {string} model - The model to use (default: gpt-3.5-turbo)
   */
  configure(apiKey, model = 'gpt-3.5-turbo') {
    this.apiKey = apiKey;
    if (model) {
      this.model = model;
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
   * @returns {Promise<Array>} - List of recommended TV shows
   */
  async getRecommendations(series) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI service is not configured. Please set apiKey.');
    }

    try {
      // Only extract show titles to minimize token usage
      const showTitles = series.map(show => show.title).join(', ');

      const messages = [
        {
          role: "system",
          content: "You are a TV show recommendation assistant. Your task is to recommend new TV shows based on the user's current library. Be concise and to the point. Format each recommendation with exactly these sections: Description, Why you might like it, Available on."
        },
        {
          role: "user",
          content: `Based on my TV show library, recommend 5 new shows I might enjoy. Be brief and direct - no more than 2-3 sentences per section. Format each recommendation as: \n1. [Show Title]: Description: [brief description]. Why you might like it: [short reason based on my current shows]. Available on: [streaming service].\n\nMy current shows: ${showTitles}`
        }
      ];

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: messages,
          temperature: 0.5,  // Lower temperature for more predictable responses
          max_tokens: 800,   // Reduced token limit
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
      console.error('Error getting recommendations from OpenAI:', error);
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
        // Extract title (first line or up to first colon)
        let title = '';
        let details = section;
        
        if (section.includes(':')) {
          const firstColonIndex = section.indexOf(':');
          title = section.substring(0, firstColonIndex).trim();
          details = section.substring(firstColonIndex + 1).trim();
        } else {
          // If no colon, try to get the first line
          const firstLineBreak = section.indexOf('\n');
          if (firstLineBreak > 0) {
            title = section.substring(0, firstLineBreak).trim();
            details = section.substring(firstLineBreak + 1).trim();
          } else {
            title = section.trim();
            details = '';
          }
        }
        
        // Extract common fields using helper method
        const description = this.extractFieldFromText(details, 'Description', 'Why');
        const reasoning = this.extractFieldFromText(details, 'Why you might like it', 'Available on');
        const streaming = this.extractFieldFromText(details, 'Available on', null);
        
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
    let startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return null;
    
    startIndex += startMarker.length;
    if (text[startIndex] === ':') startIndex++; // Skip colon if present
    
    let endIndex = endMarker ? text.indexOf(endMarker, startIndex) : text.length;
    if (endIndex === -1) endIndex = text.length;
    
    return text.substring(startIndex, endIndex).trim();
  }
}

// Create a singleton instance
const openAIService = new OpenAIService();

export default openAIService;