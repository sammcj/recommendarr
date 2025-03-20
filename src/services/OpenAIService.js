import credentialsService from './CredentialsService';

class OpenAIService {
  constructor() {
    this.apiKey = '';
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-3.5-turbo';
    this.maxTokens = 4000;
    this.temperature = 0.8;
    this.useSampledLibrary = false;
    this.sampleSize = 20;
    this.useStructuredOutput = false; // Default to legacy output format
    this.promptStyle = 'vibe'; // Default prompt style
    
    // Ensure the chat completions endpoint
    this.apiUrl = this.getCompletionsUrl();
    
    // Initialize conversation history for maintaining context
    this.tvConversation = [];
    this.movieConversation = [];
    
    // Load credentials when instantiated
    this.loadCredentials();
    
    // Try to get model from localStorage if it exists
    this.loadModelFromLocalStorage();
    
    // Try to get prompt style from localStorage if it exists
    this.loadPromptStyleFromLocalStorage();
  }
  
  /**
   * Reset conversation history when switching between TV and movie modes
   * Ensures fresh recommendations without context contamination
   */
  resetConversation() {
    console.log('Resetting conversation history');
    this.tvConversation = [];
    this.movieConversation = [];
  }
  
  /**
   * Load credentials and settings from server-side storage
   * @param {number} retries - Number of retries if loading fails (default: 1)
   * @param {number} delay - Delay between retries in ms (default: 1000)
   * @returns {Promise<boolean>} - Whether credentials were successfully loaded
   */
  async loadCredentials(retries = 1, delay = 1000) {
    try {
      console.log('Loading OpenAI credentials from server...');
      const credentials = await credentialsService.getCredentials('openai');
      
      if (credentials) {
        console.log('Received OpenAI credentials from server');
        this.apiKey = credentials.apiKey || '';
        if (credentials.apiUrl) this.baseUrl = credentials.apiUrl;
        if (credentials.model) this.model = credentials.model;
        if (credentials.maxTokens) this.maxTokens = parseInt(credentials.maxTokens);
        if (credentials.temperature) this.temperature = parseFloat(credentials.temperature);
        if (credentials.useSampledLibrary !== undefined) this.useSampledLibrary = credentials.useSampledLibrary === true;
        if (credentials.sampleSize) this.sampleSize = parseInt(credentials.sampleSize);
        if (credentials.useStructuredOutput !== undefined) this.useStructuredOutput = credentials.useStructuredOutput === true;
        
        // Update API URL if baseUrl changed
        this.apiUrl = this.getCompletionsUrl();
        return true;
      } else {
        console.log('No OpenAI credentials found on server');
        return false;
      }
    } catch (error) {
      console.error('Error loading OpenAI credentials:', error);
      
      // Retry with delay if we have retries left
      if (retries > 0) {
        console.log(`Retrying OpenAI credentials load in ${delay}ms (${retries} ${retries === 1 ? 'retry' : 'retries'} left)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.loadCredentials(retries - 1, delay);
      }
      
      return false;
    }
  }
  
  /**
   * Load the model from localStorage if it exists
   * Falls back to the model stored in credentials if localStorage model doesn't exist
   */
  loadModelFromLocalStorage() {
    const localStorageModel = localStorage.getItem('openaiModel');
    if (localStorageModel) {
      this.model = localStorageModel;
    }
  }
  
  /**
   * Load the prompt style from localStorage if it exists
   * Falls back to the default 'vibe' style if localStorage style doesn't exist
   */
  loadPromptStyleFromLocalStorage() {
    const localStoragePromptStyle = localStorage.getItem('openaiPromptStyle');
    if (localStoragePromptStyle) {
      this.promptStyle = localStoragePromptStyle;
    }
  }
  
  /**
   * Set the prompt style and save it to localStorage
   * @param {string} style - The prompt style ('vibe', 'analytical', 'creative', 'technical')
   */
  setPromptStyle(style) {
    this.promptStyle = style;
    localStorage.setItem('openaiPromptStyle', style);
  }
  
  /**
   * Get the appropriate system content based on the current prompt style
   * @param {boolean} isMovie - Whether we're getting TV show or movie recommendations
   * @returns {string} - The system prompt content
   */
  getSystemContentByStyle(isMovie, promptStyle = null) {
    // Use provided promptStyle if available, otherwise fall back to this.promptStyle
    const activeStyle = promptStyle || this.promptStyle;
  
    // Common base JSON format instructions that should be included regardless of style
    const jsonFormatInstructions = isMovie 
      ? `Provide recommendations in this JSON format: { "recommendations": [ { "title": "Movie Title", "year": YYYY, "description": "Brief description of the movie", "reason": "Why this movie matches their preferences" } ] }`
      : `Provide recommendations in this JSON format: { "recommendations": [ { "title": "Show Title", "network": "Network/platform name", "description": "Brief description of the show", "reason": "Why this show matches their preferences" } ] }`;
    
    // Select system content based on prompt style
    switch (activeStyle) {
      case 'analytical':
        return isMovie
          ? `You are an expert film analyst with deep knowledge of cinema history, theory, and criticism. Your recommendations are based on meticulous analysis of cinematic elements including narrative structure, visual composition, thematic development, character arcs, editing techniques, sound design, and directorial vision. You excel at identifying patterns across seemingly different films, recognizing how various directors approach similar themes, and understanding the evolution of filmmaking techniques across eras and movements. 

You prioritize substantive analysis over surface-level genre similarities, looking at how films utilize techniques like non-linear storytelling, visual motifs, character studies, tonal shifts, philosophical explorations, and technical innovations. You consider elements such as pacing, shot composition, color theory, performance styles, and narrative conventions when making connections between works.

When recommending films, you identify precise connections between a user's library and your suggestions, articulating the specific technical, thematic, and stylistic elements that create meaningful parallels. Your analysis is perceptive and intellectually rigorous, focusing on form, composition, and substance rather than plot similarities alone. ${jsonFormatInstructions}`
          : `You are an expert television analyst with comprehensive knowledge of TV history, production methodologies, and narrative architecture. Your recommendations stem from thorough examination of episodic structure, season arcs, character development, dialogue patterns, visual language, production design, and showrunner tendencies. You excel at identifying patterns in writers' room approaches, recognizing how different creative teams handle similar premises, and understanding how the medium of television shapes storytelling.

You prioritize substantive analysis over superficial genre classifications, examining how series employ techniques like narrative complexity, character evolution, tonal consistency, thematic exploration, and format experimentation. You consider elements such as episode structure, visual storytelling, acting techniques, directorial consistency, and serialized vs. procedural approaches when making connections between shows.

When recommending series, you identify precise connections between a user's viewing history and your suggestions, articulating the specific writing techniques, production qualities, and narrative approaches that create meaningful parallels. Your analysis is perceptive and intellectually rigorous, focusing on storytelling craft and artistic choices rather than plot similarities alone. ${jsonFormatInstructions}`;
          
      case 'creative':
        return isMovie
          ? `You are a visionary film curator with an exceptional ability to discover unexpected connections between movies based on their emotional resonance, artistic vision, and creative spirit. You see beyond conventional categorizations, identifying the subtle emotional threads, aesthetic sensibilities, and thematic undercurrents that link seemingly disparate films. Your recommendations emerge from an intuitive understanding of how cinema affects viewers on a personal, emotional, and intellectual level.

You excel at recognizing the distinctive creative voices of filmmakers and their unique approaches to visual storytelling, atmosphere creation, and emotional truth. You understand that films can share spiritual connections through their artistic courage, innovative approaches, or emotional authenticity, even when their genres, settings, or premises differ dramatically.

When recommending films, you prioritize works that will evoke similar emotional responses, challenge viewers in comparable ways, or reveal new dimensions of the cinematic experiences they already value. You consider how films create specific moods, tackle universal human experiences through unique perspectives, or employ distinctive visual languages. Your recommendations are bold, insightful, and often reveal surprising connections that conventional algorithms would never detect. ${jsonFormatInstructions}`
          : `You are a visionary television curator with an exceptional ability to discover unexpected connections between series based on their emotional impact, creative storytelling, and artistic ambition. You see beyond conventional genre classifications, identifying the subtle emotional threads, narrative innovations, and thematic explorations that link seemingly unrelated shows. Your recommendations emerge from an intuitive understanding of how television narratives resonate with viewers on personal, emotional, and intellectual levels.

You excel at recognizing the distinctive voices of showrunners, writers, and creative teams and their unique approaches to character development, world-building, and tonal balance. You understand that series can share spiritual connections through their storytelling courage, narrative experimentation, or emotional authenticity, even when their genres, settings, or premises appear completely different.

When recommending shows, you prioritize series that will evoke similar emotional responses, challenge viewers in comparable ways, or reveal new dimensions of the narrative experiences they already value. You consider how shows create specific atmospheres, explore universal themes through unique lenses, or employ distinctive narrative structures. Your recommendations are bold, perceptive, and often reveal surprising connections that conventional algorithms would never detect. ${jsonFormatInstructions}`;
          
      case 'technical':
        return isMovie
          ? `You are a master film technician with extensive knowledge of production methodologies, technological innovation, and the craft of filmmaking. Your recommendations are grounded in precise understanding of directing techniques, cinematography approaches, editing styles, sound design philosophies, practical vs. digital effects, production design choices, and technical achievements that define a film's creation. You comprehend how technical decisions shape the viewer's experience and how different directors utilize their technical toolkit.

You analyze films through the lens of their technical execution: camera movement styles, lighting techniques, aspect ratio choices, color grading approaches, editing rhythms, practical vs. CGI effects, sound mixing innovations, and production challenges overcome. You recognize the distinctive technical signatures of cinematographers, editors, sound designers, and other key craftspeople, understanding their influence on a film's final form.

When recommending films, you identify precise technical parallels between works, articulating how specific production techniques, visual approaches, or technological innovations create meaningful connections. You can discern when films share technical DNA despite surface-level differences, recognizing when they employ similar approaches to choreography, stunts, VFX integration, or technical problem-solving. Your recommendations highlight works that demonstrate technical excellence in ways that will appeal to viewers who appreciate the craft elements in their favorite films. ${jsonFormatInstructions}`
          : `You are a television production expert with deep knowledge of the technical elements that define quality series. Your recommendations are grounded in precise understanding of production models, filming techniques, post-production approaches, VFX integration, practical staging, location vs. studio shooting, and the logistics of episodic storytelling. You comprehend how technical decisions in television differ from film, including considerations of consistency across episodes, budget allocation, shooting schedules, and maintaining quality with rotating directors.

You analyze series through the lens of their technical execution: visual continuity strategies, lighting designs for recurring sets, blocking techniques for ensemble casts, location management, practical vs. VFX solutions, episode-to-episode consistency, and production challenges specific to television. You recognize the distinctive technical approaches of different networks, streaming platforms, and production companies, understanding how they influence a show's ultimate form.

When recommending shows, you identify precise technical parallels between series, articulating how specific production techniques, visual language choices, or technical innovations create meaningful connections. You can discern when shows share production DNA despite surface-level differences, recognizing when they employ similar approaches to effects integration, location filming, technical problem-solving, or resource utilization. Your recommendations highlight series that demonstrate technical excellence in ways that will appeal to viewers who appreciate the craft elements in their favorite shows. ${jsonFormatInstructions}`;
          
      case 'vibe':
      default:
        return isMovie
          ? `You are an intuitive film recommendation specialist with an exceptional ability to capture the essence, mood, and emotional texture of movies. You understand that viewers often connect with films based on intangible qualities: the overall feeling a movie creates, its emotional atmosphere, its specific energy, or the unique sensibility of its creator. Your recommendations prioritize matching these qualities over plot similarities or genre classifications.

You have a rare talent for identifying a film's distinctive vibe—whether it's the sun-drenched melancholy of a particular director, the electric tension of certain thrillers, the lived-in authenticity of specific character studies, the dreamy surrealism of certain visual stylists, or the warm nostalgia of period pieces filmed in particular ways. You understand how elements like lighting, music, pacing, dialogue style, setting, and performance approach combine to create a film's unique emotional signature.

When recommending movies, you prioritize works that will evoke similar emotional states, create comparable atmospheres, or capture the same ineffable qualities that viewers connect with in their favorites. You recognize that someone who loves a particular film might be seeking that specific feeling rather than merely similar plot elements or themes. Your recommendations aim to recreate the emotional experience of films in a viewer's library, matching mood, tone, and sensibility with remarkable precision. ${jsonFormatInstructions}`
          : `You are an intuitive television recommendation specialist with an exceptional ability to capture the essence, mood, and emotional texture of series. You understand that viewers often connect with shows based on intangible qualities: the overall feeling a series creates, its emotional atmosphere, its specific energy, or the unique sensibility of its creators. Your recommendations prioritize matching these qualities over plot similarities or genre classifications.

You have a rare talent for identifying a show's distinctive vibe—whether it's the cozy comfort of certain comedies, the tense atmosphere of particular dramas, the specific charm of certain ensemble casts, the distinctive visual flavor of certain showrunners, or the unique tone that defines certain series. You understand how elements like cinematography, music choices, dialogue rhythm, character dynamics, setting, and narrative pacing combine to create a show's unique emotional signature.

When recommending series, you prioritize works that will evoke similar emotional states, create comparable atmospheres, or capture the same ineffable qualities that viewers connect with in their favorites. You recognize that someone who loves a particular show might be seeking that specific feeling rather than merely similar plot elements or themes. Your recommendations aim to recreate the emotional experience of series in a viewer's library, matching mood, tone, and sensibility with remarkable precision. ${jsonFormatInstructions}`;
    }
  }
  
  /**
   * Get the appropriate user prompt addition based on the current prompt style
   * @param {boolean} isMovie - Whether we're getting TV show or movie recommendations
   * @returns {string} - Additional text to add to the user prompt
   */
  getUserPromptAdditionByStyle(isMovie, promptStyle = null) {
    // Use provided promptStyle if available, otherwise fall back to this.promptStyle
    const activeStyle = promptStyle || this.promptStyle;
    
    switch (activeStyle) {
      case 'analytical':
        return isMovie
          ? ` When analyzing my library, please perform a deep analytical examination of the following aspects:
          
1. Narrative architecture: Identify common story structures, non-linear techniques, framing devices, plot complexity levels, and narrative innovations across my collection.
2. Thematic patterns: Recognize recurring philosophical inquiries, social commentaries, moral explorations, or intellectual preoccupations that appear in multiple films.
3. Visual composition: Examine directorial signatures in framing, shot length tendencies, visual motifs, color theory applications, and compositional approaches.
4. Character development methodologies: Analyze how different filmmakers approach character arcs, internal conflicts, relational dynamics, and psychological depth.
5. Cinematic techniques: Identify patterns in the use of specific techniques like tracking shots, depth of field, montage styles, visual effects integration, or distinctive editing approaches.
          
From this analytical foundation, recommend films that employ comparable approaches to cinema's formal elements rather than merely sharing genre classifications. Articulate the specific cinematic, thematic, and formal techniques that connect your recommendations to my collection. Your analysis should reveal substantive connections a casual viewer might miss.`
          : ` When analyzing my library, please perform a deep analytical examination of the following aspects:
          
1. Series architecture: Identify common narrative structures, episode-to-season relationships, serialized vs. procedural approaches, and structural innovations across my collection.
2. Character development methodologies: Analyze how different shows approach character arcs, ensemble dynamics, protagonist journeys, and recurring character patterns.
3. Thematic exploration: Recognize recurring philosophical inquiries, social commentaries, moral explorations, or intellectual preoccupations that appear across multiple series.
4. Production approaches: Examine showrunner signatures, writers' room patterns, and production models that shape the final creative output.
5. Visual and auditory language: Identify patterns in cinematography approaches, visual consistency methods, title sequence design, and sound design philosophies.
          
From this analytical foundation, recommend series that employ comparable approaches to television's formal elements rather than merely sharing genre classifications. Articulate the specific narrative, thematic, and production techniques that connect your recommendations to my collection. Your analysis should reveal substantive connections a casual viewer might miss.`;
          
      case 'creative':
        return isMovie
          ? ` When exploring my library, please look beyond conventional categorizations to discover the deeper creative connections between films:
          
1. Emotional signatures: Identify the specific emotional journeys, character transformations, and affective experiences that define my favorite films.
2. Artistic vision: Recognize the distinctive creative voices, auteur signatures, and unique worldviews expressed through my collection.
3. Aesthetic sensibilities: Examine the visual languages, stylistic choices, and artistic approaches that resonate throughout my library.
4. Creative courage: Note films that take risks, defy conventions, or push boundaries in ways that might indicate my appreciation for creative boldness.
5. Thematic undercurrents: Uncover the subtle thematic threads, symbolic patterns, and metaphorical approaches that create spiritual connections between seemingly different works.
          
From these insights, recommend films that will provide fresh cinematic experiences while speaking to the same emotional, aesthetic, and creative sensibilities I value. Prioritize works that might create unexpected connections or reveal new dimensions of the cinematic experiences I already appreciate. Your recommendations should surprise me with their perceptiveness while feeling intuitively right.`
          : ` When exploring my library, please look beyond conventional categorizations to discover the deeper creative connections between series:
          
1. Emotional journeys: Identify the specific emotional experiences, character moments, and affective tones that define my favorite shows.
2. Narrative innovation: Recognize distinctive storytelling approaches, format experimentation, and unique narrative strategies employed across my collection.
3. Creative worldbuilding: Examine how different series establish their universes, balance realism with invention, and create distinctive environments.
4. Tone and atmosphere: Analyze the specific atmospheric qualities, tonal balances (between elements like humor/drama, light/dark), and mood signatures of my preferred shows.
5. Thematic resonance: Uncover the subtle thematic explorations, symbolic patterns, and metaphorical approaches that create connections between seemingly different works.
          
From these insights, recommend series that will provide fresh viewing experiences while speaking to the same emotional, narrative, and creative sensibilities I value. Prioritize works that might create unexpected connections or reveal new dimensions of the television experiences I already appreciate. Your recommendations should surprise me with their perceptiveness while feeling intuitively right.`;
          
      case 'technical':
        return isMovie
          ? ` When analyzing my library, please focus on the technical craft and production elements that define these films:
          
1. Directorial techniques: Identify patterns in staging, blocking, camera movement, actor direction, scene transitions, and visual storytelling methods.
2. Cinematography approaches: Examine lighting philosophies, camera placement strategies, lens choices, framing techniques, and visual texture preferences.
3. Editing methodologies: Recognize pacing preferences, cutting styles, montage techniques, visual rhythm patterns, and time manipulation approaches.
4. Sound design and music: Analyze how sound is used technically, including sound mixing innovations, foley techniques, music integration, and audio-visual relationship.
5. Production elements: Consider production design, practical vs. digital effects preferences, location shooting approaches, set construction methods, and technical problem-solving.
          
From this technical analysis, recommend films that demonstrate similar technical excellence, craft innovations, or production approaches. Focus on how technical decisions shape the viewing experience rather than plot or genre similarities. Your recommendations should highlight works that showcase comparable technical mastery or innovative approaches to the filmmaking craft.`
          : ` When analyzing my library, please focus on the technical craft and production elements that define these television series:
          
1. Production models: Identify patterns in how my preferred shows handle episode direction, maintain visual consistency with rotating directors, balance budgets across episodes, and manage the logistics of long-form storytelling.
2. Technical execution: Examine approaches to cinematography in television contexts, lighting design for recurring sets, location vs. studio balances, and visual language consistency.
3. Post-production techniques: Recognize editing styles, visual effects integration methods, color grading approaches, and sound design philosophies.
4. Season-to-episode relationships: Analyze how series technically handle story arcs across episodes, maintain production quality throughout seasons, and technically approach serialized narratives.
5. Practical craft elements: Consider blocking techniques for ensemble casts, multi-camera vs. single-camera approaches, set utilization strategies, and production design evolution.
          
From this technical analysis, recommend series that demonstrate similar technical excellence, production approaches, or craft innovations. Focus on how technical decisions shape the viewing experience rather than plot or genre similarities. Your recommendations should highlight works that showcase comparable technical mastery or innovative approaches to television production.`;
          
      case 'vibe':
      default:
        return isMovie
          ? ` When exploring my library, please focus on identifying and matching the distinctive emotional atmosphere and sensory experience of these films:
          
1. Emotional texture: Identify the specific feeling states, emotional tones, and affective qualities that define my favorite films—whether it's melancholy, exhilaration, contemplative reflection, cozy nostalgia, or any other emotional signature.
2. Atmospheric qualities: Recognize the distinctive mood, ambiance, and sensory experience created through elements like lighting, color palette, sound design, music, pacing, and setting.
3. Directorial presence: Identify the specific sensibilities of directors whose work appears in my collection, focusing on their unique approach to creating tone and atmosphere.
4. Cinematic texture: Note preferences for certain visual and auditory experiences—like grain vs. sharpness, bold vs. muted colors, orchestral vs. electronic scores, dialogue-heavy vs. visual storytelling, etc.
5. Emotional journey: Understand the emotional arc and viewing experience I might be seeking, rather than just similar story elements.
          
From these insights, recommend films that evoke comparable emotional states and atmospheres, even if their plots, settings, or genres seem different. Prioritize matching the ineffable feeling and unique sensory experience of the films I love. Your recommendations should aim to recreate specific emotional textures and moods rather than merely matching plot points or conventional categorizations.`
          : ` When exploring my library, please focus on identifying and matching the distinctive emotional atmosphere and sensory experience of these series:
          
1. Tonal signature: Identify the specific feeling states, emotional balances, and affective qualities that define my favorite shows—whether it's warmth, tension, humor, melancholy, excitement, or any other emotional signature.
2. Viewing experience: Recognize the distinctive watching experience created through elements like pacing, dialogue style, visual approach, performance style, and narrative density.
3. Creator sensibility: Identify the specific creative voices of showrunners whose work appears in my collection, focusing on their unique approach to creating tone and narrative flow.
4. Atmospheric qualities: Note preferences for certain production approaches that create specific moods—like lighting styles, location choices, music integration, cinematography approaches, etc.
5. Engagement style: Understand the specific kind of viewer engagement I might be seeking—intellectual stimulation, emotional immersion, comfort viewing, edge-of-seat tension, etc.
          
From these insights, recommend series that evoke comparable emotional states and viewing experiences, even if their plots, settings, or genres seem different. Prioritize matching the ineffable feeling and unique atmosphere of the shows I love. Your recommendations should aim to recreate specific emotional textures and tonal qualities rather than merely matching plot points or conventional categorizations.`;
    }
  }

  /**
   * Get the chat completions URL based on the base URL
   * @returns {string} - The full URL for chat completions
   */
  getCompletionsUrl() {
    // Normalize the base URL by removing trailing slashes
    const baseUrl = this.baseUrl ? this.baseUrl.replace(/\/+$/, '') : '';
    
    // Special handling for Google AI API (generativelanguage)
    if (baseUrl.includes('generativelanguage.googleapis.com')) {
      if (baseUrl.includes('/openai')) {
        return `${baseUrl}/chat/completions`;
      } else {
        return `${baseUrl}/openai/chat/completions`;
      }
    }
    
    // Default for OpenAI and other providers
    return `${baseUrl}/chat/completions`;
  }
  
  /**
   * Get the models URL based on the base URL
   * @returns {string} - The full URL for models endpoint
   */
  getModelsUrl() {
    // Normalize the base URL by removing trailing slashes
    const baseUrl = this.baseUrl ? this.baseUrl.replace(/\/+$/, '') : '';
    
    // Special handling for Anthropic API
    if (baseUrl === 'https://api.anthropic.com/v1') {
      console.log('Using Anthropic models endpoint');
      return `${baseUrl}/models`;
    }
    
    // Special handling for Google AI API (generativelanguage)
    if (baseUrl.includes('generativelanguage.googleapis.com')) {
      if (baseUrl.includes('/openai')) {
        return `${baseUrl}/models`;
      } else {
        return `${baseUrl}/openai/models`;
      }
    }
    
    // Special handling for LLM servers (like LMStudio)
    if (baseUrl.match(/192\.168\.\d+\.\d+/) || baseUrl.match(/\d+\.\d+\.\d+\.\d+/) || baseUrl.includes('lmstudio')) {
      if (baseUrl.endsWith('/v1')) {
        return `${baseUrl}/models`;
      } else {
        return `${baseUrl}/v1/models`;
      }
    }
    
    // Default for OpenAI and other providers
    return `${baseUrl}/models`;
  }
  
  /**
   * Fetch available models from the API
   * @returns {Promise<Array>} - List of available models
   */
  async fetchModels() {
    // Only validate basic configuration, not API key
    if (!this.baseUrl) {
      throw new Error('OpenAI service is not configured. Please set API URL.');
    }
    
    // Only validate API key when using official OpenAI API
    if (this.baseUrl.startsWith('https://api.openai') && (!this.apiKey || this.apiKey.trim() === '')) {
      throw new Error('API key cannot be empty when using OpenAI API. Please provide a valid API key.');
    }
    
    // Prepare headers based on the API endpoint
    const headers = {};
    
    // Set appropriate authentication headers based on the API
    if (this.baseUrl === 'https://api.anthropic.com/v1') {
      if (this.apiKey && this.apiKey.trim() !== '') {
        headers['x-api-key'] = this.apiKey;
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        headers['anthropic-version'] = '2023-06-01';
        console.log('Using Anthropic headers for models request');
      } else {
        console.log('No API key provided for Anthropic API request');
      }
    } 
    // Google AI API authentication
    else if (this.baseUrl.includes('generativelanguage.googleapis.com')) {
      if (this.apiKey && this.apiKey.trim() !== '') {
        // For Google AI, try both methods - some endpoints use Authorization header
        // and some use API key as a query parameter
        this.googleApiKey = this.apiKey.trim();
        
        // Add Authorization header
        headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
        console.log('Using Google AI API with Authorization header');
      } else {
        console.log('No API key provided for Google AI API request');
      }
    } 
    // Default OpenAI-compatible authentication
    else {
      // Only add Authorization header if apiKey is present and not empty
      if (this.apiKey && this.apiKey.trim() !== '') {
        // Ensure the authorization header is properly formatted for OpenAI API
        // Always include Bearer prefix and ensure no extra whitespace
        // Use correct header case for OpenAI API (capital 'A')
        headers['Authorization'] = `Bearer ${this.apiKey.trim()}`; // OpenAI expects 'Authorization'
        console.log('Using OpenAI headers for models request');
        console.log('Authorization header format:', headers['Authorization'].substring(0, 15) + '...');
      } else {
        console.log('No API key provided, skipping Authorization header');
      }
    }
    
    // Add Accept header for all APIs
    if (this.baseUrl.includes('openai.com') || this.baseUrl.includes('generativelanguage.googleapis.com')) {
      headers['Accept'] = 'application/json';        // OpenAI/Google expect 'Accept'
    } else {
      headers['accept'] = 'application/json';
    }
    
    // We intentionally DO NOT set Content-Type for GET requests to the models endpoint
    // as this causes the OpenAI API to reject the request with a 400 error
    console.log('Not setting Content-Type header for models GET request to avoid OpenAI API errors');
    
    // Ensure we preserve existing Anthropic specific headers
    if (this.baseUrl === 'https://api.anthropic.com/v1') {
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      headers['anthropic-version'] = '2023-06-01';
      console.log('Preserved Anthropic-specific headers');
    }
    
    // Special handling for LMStudio
    if (this.baseUrl.includes('lmstudio') || this.baseUrl.match(/192\.168\.\d+\.\d+/) || this.baseUrl.match(/\d+\.\d+\.\d+\.\d+/)) {
      console.log('Detected LMStudio or local LLM server, adding additional headers');
      headers['accept'] = 'application/json, text/plain, */*';
      // Removed user-agent header which browsers block in XHR requests
    }
    
    let modelsUrl = this.getModelsUrl();
    
    // For Google AI API, we'll handle the key in the proxy request params
    // instead of appending it to the URL to avoid duplicates
    if (this.baseUrl.includes('generativelanguage.googleapis.com')) {
      console.log('Detected Google AI API, will send API key via params to avoid duplication');
      // We'll use the params object instead of directly modifying the URL
      if (this.apiKey && this.apiKey.trim() !== '') {
        this.googleApiKey = this.apiKey.trim();
      } else {
        console.warn('No API key provided for Google AI API - requests will likely fail');
      }
    }
    
    console.log(`Fetching models from: ${modelsUrl}`);
    
    try {
      // Always use the proxy, no direct requests to avoid mixed content errors
      const apiService = (await import('./ApiService')).default;
      
      let response;
      
      try {
        // Always use the proxy service for models request to avoid mixed content errors
        console.log('Using proxy service for models request');
        
        // Configure parameters for different API providers
        const params = {};
        let apiOptions = {
          url: modelsUrl,
          method: 'GET',
          headers: headers
        };
        
        // Special handling for Google AI
        if (this.baseUrl.includes('generativelanguage.googleapis.com') && this.googleApiKey) {
          // For Google AI, we need to properly format the key as a parameter
          // Check if the API key is already in the URL
          if (!modelsUrl.includes('key=')) {
            params.key = this.googleApiKey;
            apiOptions.params = params;
            console.log('Added Google API key as query parameter');
          } else {
            console.log('Google API key already in URL, not adding as parameter');
          }
        } else {
          // For other APIs, include any params if needed
          if (Object.keys(params).length > 0) {
            apiOptions.params = params;
          }
        }
        
        console.log('Sending model request with configuration:', {
          url: apiOptions.url,
          method: apiOptions.method,
          hasParams: apiOptions.params ? true : false,
          headers: { ...apiOptions.headers, Authorization: apiOptions.headers.Authorization ? '[REDACTED]' : undefined }
        });
        
        response = await apiService.proxyRequest(apiOptions);
      } catch (proxyError) {
        console.log('Proxy request failed:', proxyError.message);
        
        // Log error but avoid excessive details
        console.error('Proxy error:', proxyError.message);
        
        // Try a direct request as fallback for all API endpoints
        // (Previously this was limited to specific endpoints, but now we try for all)
        console.log('Attempting direct request to LLM server as fallback...');
        try {
          const axios = (await import('axios')).default;
          // Prepare headers for direct request based on API type
          const directHeaders = {
            'Accept': 'application/json, text/plain, */*'
            // Removed User-Agent header which browsers block in XHR/fetch requests
          };
          
          // Special handling for OpenAI API
          if (this.baseUrl.includes('openai.com')) {
            console.log('Using special headers for direct OpenAI API request');
            directHeaders['Authorization'] = `Bearer ${this.apiKey.trim()}`;
            // For GET requests to model endpoints, we must NOT include Content-Type
            // as OpenAI will reject the request with a 400 error
            directHeaders['Accept'] = 'application/json';
          }
          // Special handling for Google AI API
          else if (this.baseUrl.includes('generativelanguage.googleapis.com')) {
            console.log('Using special headers for direct Google AI API request');
            
            // Add Authorization header
            if (this.googleApiKey) {
              directHeaders['Authorization'] = `Bearer ${this.googleApiKey}`;
              
              // Only add key as query parameter if not already present
              if (!modelsUrl.includes('key=')) {
                const separator = modelsUrl.includes('?') ? '&' : '?';
                modelsUrl = `${modelsUrl}${separator}key=${this.googleApiKey}`;
              }
            }
            
            // Set standard headers
            // For GET requests, omit Content-Type to avoid errors
            if (this.getModelsMethod !== 'GET') {
              directHeaders['Content-Type'] = 'application/json';
            }
            directHeaders['Accept'] = 'application/json';
          }
          // Special handling for Anthropic API
          else if (this.baseUrl === 'https://api.anthropic.com/v1') {
            console.log('Using special headers for direct Anthropic API request');
            directHeaders['x-api-key'] = this.apiKey;
            directHeaders['anthropic-version'] = '2023-06-01';
            directHeaders['anthropic-dangerous-direct-browser-access'] = 'true';
          }
          
          // For GET requests, ensure we don't send a request body
          const directRequestConfig = {
            url: modelsUrl,
            method: 'GET',
            headers: directHeaders,
            // Explicitly set no data for GET requests to model endpoints
            data: undefined
          };
          
          console.log('Sending direct request with configuration:', {
            url: directRequestConfig.url,
            method: directRequestConfig.method,
            headers: { ...directRequestConfig.headers, Authorization: directRequestConfig.headers.Authorization ? '[REDACTED]' : undefined }
          });
          
          const directResponse = await axios(directRequestConfig);
          
          console.log('Direct request successful!', directResponse.status);
          
          // Process the response data from direct request
          
          // For OpenAI API
          if (this.baseUrl.includes('openai.com')) {
            console.log('Processing OpenAI API direct response');
            if (directResponse.data && directResponse.data.data && Array.isArray(directResponse.data.data)) {
              console.log(`Successfully retrieved ${directResponse.data.data.length} OpenAI models`);
              return directResponse.data.data;
            }
          }
          
          // For Google AI API
          if (this.baseUrl.includes('generativelanguage.googleapis.com')) {
            console.log('Processing Google AI API direct response');
            if (directResponse.data && directResponse.data.data && Array.isArray(directResponse.data.data)) {
              console.log(`Successfully retrieved ${directResponse.data.data.length} Google AI models`);
              return directResponse.data.data;
            } else if (directResponse.data && Array.isArray(directResponse.data)) {
              console.log(`Successfully retrieved ${directResponse.data.length} Google AI models (array format)`);
              return directResponse.data.map(model => ({
                id: model.id || model.name,
                object: 'model',
                owned_by: 'google'
              }));
            }
          }
          
          // For Anthropic API
          else if (this.baseUrl === 'https://api.anthropic.com/v1') {
            console.log('Processing Anthropic API direct response');
            
            // Handle format with data array property
            if (directResponse.data && directResponse.data.data && Array.isArray(directResponse.data.data)) {
              console.log(`Successfully retrieved ${directResponse.data.data.length} Anthropic models (data array format)`);
              return directResponse.data.data.map(model => ({
                id: model.id,
                object: 'model',
                owned_by: 'anthropic',
                display_name: model.display_name
              }));
            }
            // Handle direct array format
            else if (Array.isArray(directResponse.data)) {
              console.log(`Successfully retrieved ${directResponse.data.length} Anthropic models (direct array format)`);
              return directResponse.data.map(model => ({
                id: model.id || model.name,
                object: 'model',
                owned_by: 'anthropic'
              }));
            }
          }
          
          // For LMStudio format
          if (directResponse.data && directResponse.data.object === 'list' && Array.isArray(directResponse.data.data)) {
            console.log(`Successfully retrieved ${directResponse.data.data.length} models from direct request`);
            // Return processed models directly instead of wrapping
            return directResponse.data.data;
          }
          
          // If data is in a different format, wrap it in a proxy-like response
          return {
            status: directResponse.status,
            data: directResponse.data,
            headers: directResponse.headers
          };
        } catch (directError) {
          console.error('Direct request failed:', directError.message);
          // For direct request errors, combine the error messages for better diagnosis
          throw new Error(`Failed to connect to LLM server at ${this.baseUrl}. Original proxy error: ${proxyError.message}. Direct request error: ${directError.message}`);
        }
      }
      
      console.log(`Models response status: ${response.status}`);
      
      // Check if the request was successful
      if (response && response.status >= 200 && response.status < 300 && response.data) {
        
        // Handle provider-specific formats first
        
        // Google AI API format
        if (this.baseUrl.includes('generativelanguage.googleapis.com')) {
          // Google data array format
          if (response.data && response.data.data && Array.isArray(response.data.data)) {
            console.log(`Successfully retrieved ${response.data.data.length} Google AI models`);
            return response.data.data.map(model => ({
              id: model.id || model.name,
              object: 'model',
              owned_by: 'google'
            }));
          }
          // Google direct array format 
          else if (Array.isArray(response.data)) {
            console.log(`Successfully retrieved ${response.data.length} Google AI models (array format)`);
            return response.data.map(model => ({
              id: model.id || model.name,
              object: 'model',
              owned_by: 'google'
            }));
          }
        }
        
        // Anthropic API format
        else if (this.baseUrl === 'https://api.anthropic.com/v1') {
          // Anthropic format with data array
          if (response.data.data && Array.isArray(response.data.data)) {
            console.log(`Successfully retrieved ${response.data.data.length} Anthropic models (data array format)`);
            return response.data.data.map(model => ({
              id: model.id,
              object: 'model',
              owned_by: 'anthropic',
              display_name: model.display_name
            }));
          }
          // Anthropic direct array format
          else if (Array.isArray(response.data)) {
            console.log(`Successfully retrieved ${response.data.length} Anthropic models (direct array format)`);
            return response.data.map(model => ({
              id: model.id || model.name,
              object: 'model',
              owned_by: 'anthropic'
            }));
          }
        }
        
        // Standard OpenAI API format
        if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`Successfully retrieved ${response.data.data.length} models (standard format)`);
          return response.data.data;
        } 
        
        // LMStudio format with object=list
        if (response.data && response.data.object === 'list' && Array.isArray(response.data.data)) {
          console.log(`Successfully retrieved ${response.data.data.length} models (LMStudio format)`);
          return response.data.data;
        }
        
        // Generic direct array format for other providers
        if (response.data && Array.isArray(response.data)) {
          console.log(`Successfully retrieved ${response.data.length} models (direct array format)`);
          return response.data.map(model => ({ 
            id: model.id || model.name || String(model),
            object: model.object || 'model',
            owned_by: model.owned_by || 'local'
          }));
        }
        
        // Fallback: try to interpret any JSON object as a model list
        else if (response.data && typeof response.data === 'object') {
          console.warn('Non-standard API response format, attempting to extract models:', response.data);
          
          // Look for any array property that might contain models
          for (const key in response.data) {
            if (Array.isArray(response.data[key])) {
              console.log(`Found array in response.data.${key}, using as models list`);
              return response.data[key].map(model => ({
                id: model.id || model.name || String(model),
                object: model.object || 'model',
                owned_by: model.owned_by || 'local'
              }));
            }
          }
          
          // If no arrays found but we have a data object, create a single model entry
          const modelId = response.data.id || response.data.name || 'default-model';
          console.log(`Creating single model entry with ID: ${modelId}`);
          return [{ 
            id: modelId,
            object: 'model',
            owned_by: 'local'
          }];
        }
        
        // No valid model format found
        console.warn('Response successful but could not extract models:', response.data);
      }
      
      throw new Error('Failed to fetch models: Invalid response format');
    } catch (error) {
      console.error('Error fetching models:', error);
      
      // Handle specific known error patterns
      if (error.error?.message?.includes('Incorrect API key provided') || 
          (error.data?.error?.message && error.data.error.message.includes('Incorrect API key provided'))) {
        throw new Error('Invalid API key. Please check your API key and try again.');
      }
      
      throw error;
    }
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
   * @param {boolean} useStructuredOutput - Whether to use structured output in API requests
   */
  async configure(apiKey, model = 'gpt-3.5-turbo', baseUrl = null, maxTokens = null, temperature = null, useSampledLibrary = null, sampleSize = null, useStructuredOutput = null) {
    // Trim the API key to remove any accidental whitespace
    this.apiKey = apiKey ? apiKey.trim() : '';
    
    if (model) {
      this.model = model;
      // When model is updated, also store it in localStorage for easy access
      localStorage.setItem('openaiModel', model);
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
    }
    
    if (sampleSize !== null) {
      this.sampleSize = sampleSize;
    }
    
    if (useStructuredOutput !== null) {
      this.useStructuredOutput = useStructuredOutput;
    }
    
    // Store credentials server-side (including model selection as backup)
    await credentialsService.storeCredentials('openai', {
      apiKey: this.apiKey,
      apiUrl: this.baseUrl,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      useSampledLibrary: this.useSampledLibrary,
      sampleSize: this.sampleSize,
      useStructuredOutput: this.useStructuredOutput
    });
  }

  /**
   * Check if the service is configured properly
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    // For a properly configured service, we need:
    // 1. A base URL for the API endpoint
    // 2. A selected model
    // 3. For official OpenAI API, we need an API key that's not empty
    
    const hasBasicConfig = this.baseUrl !== '' && this.model !== '';
    
    // If it's specifically the official OpenAI API URL, we must have an API key
    if (this.baseUrl.startsWith('https://api.openai')) {
      return hasBasicConfig && this.apiKey && this.apiKey.trim() !== '';
    }
    
    // For other services (including self-hosted/local models), the API key might be optional
    return hasBasicConfig;
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
   * @param {string} [customVibe=''] - Optional custom vibe/mood for recommendations
   * @param {string} [language=''] - Optional language preference for recommendations
   * @param {string} [promptStyle=null] - Optional prompt style to use (vibe, analytical, creative, technical)
   * @returns {Promise<Array>} - List of recommended TV shows
   */
  async getRecommendations(series, count = 5, genre = '', previousRecommendations = [], likedRecommendations = [], dislikedRecommendations = [], recentlyWatchedShows = [], plexOnlyMode = false, customVibe = '', language = '', promptStyle = null) {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('OpenAI service is not configured. Please set apiKey.');
      }
    }
    
    // Use provided promptStyle if available, otherwise fall back to this.promptStyle
    const activePromptStyle = promptStyle || this.promptStyle;

    try {
      // Only initialize conversation history if it doesn't exist yet
      if (this.tvConversation.length === 0) {
        
        // Determine if we should use only watch history or include the library
        let sourceText;
        let primarySource = [];
        let libraryTitles = '';
        
        if (plexOnlyMode && recentlyWatchedShows && recentlyWatchedShows.length > 0) {
        // Only use the watch history
        sourceText = "my watch history";
        primarySource = recentlyWatchedShows.map(show => show.title);
        
        // Add library titles to exclusions to prevent recommending what user already has
        if (series && series.length > 0) {
          const sonarrTitles = series.map(show => show.title);
          previousRecommendations = [...new Set([...previousRecommendations, ...sonarrTitles])];
        }
      } else if (series && series.length > 0) {
        // Use the Sonarr library as the main library
        sourceText = "my TV show library";
        const sonarrTitles = series.map(show => show.title);
        primarySource = [...sonarrTitles];
        
        // We don't add liked recommendations to the primary source anymore,
        // as they will be filtered later. This ensures liked items won't be
        // recommended again, even if they're not part of the actual library.
      } else if (recentlyWatchedShows && recentlyWatchedShows.length > 0) {
        // If no Sonarr library but we have watch history, use that
        sourceText = "my watch history";
        primarySource = recentlyWatchedShows.map(show => show.title);
      } else {
        // Fallback for empty state
        sourceText = "general preferences";
        primarySource = [];
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
      let userPrompt = `Based on ${sourceText}, recommend ${recommendationCount} high-quality shows I might enjoy. Be brief and direct - no more than 2-3 sentences per section.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus specifically on recommending shows in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add custom vibe if specified
      if (customVibe && customVibe.trim()) {
        userPrompt += ` Try to match this specific vibe/mood: "${customVibe.trim()}".`;
      }
      
      // Add language preference if specified
      if (language) {
        userPrompt += ` Please ONLY recommend TV shows in ${language} language.`;
      }
      
      // Add instructions based on the selected prompt style
      userPrompt += this.getUserPromptAdditionByStyle(false, activePromptStyle); // false = TV show recommendations
      
      // Add library information with appropriate context based on mode
      if (this.useSampledLibrary) {
        userPrompt += `\n\nHere are some examples from my library (${primarySource.length} shows total) to understand my taste: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any shows that I already have in my library.`;
      } else {
        userPrompt += `\n\nMy current shows: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any shows from the list above as I already have them in my library.`;
      }
      
      // We no longer include previous recommendations in the prompt
      // We'll use verifyRecommendations to filter out duplicates afterward
      
      // Add liked shows as explicit examples to not recommend again
      if (likedRecommendations.length > 0) {
        userPrompt += `\n\nI like these shows, but DO NOT recommend them again as I've already seen them: ${likedRecommendations.join(', ')}`;
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
      
      userPrompt += `\n\nABSOLUTELY CRITICAL: Before suggesting ANY show, you MUST verify it's not something I already have or dislike.`;
      
      // Always include JSON formatting instructions regardless of structured output mode
      userPrompt += `

⚠️ FORMATTING REQUIREMENTS: YOU MUST FOLLOW THIS EXACT JSON FORMAT WITHOUT ANY DEVIATION ⚠️

The format below is MANDATORY. Any deviation will COMPLETELY BREAK the application:

\`\`\`json
{
  "recommendations": [
    {
      "title": "Show Title",
      "description": "Brief description of the show",
      "reasoning": "Short reason why I might like it based on my current shows",
      "rating": "85% - Brief qualitative assessment",
      "streaming": "Available streaming service"
    },
    {
      "title": "Another Show Title",
      "description": "Brief description of the show",
      "reasoning": "Short reason why I might like it based on my current shows",
      "rating": "90% - Brief qualitative assessment",
      "streaming": "Available streaming service"
    }
    // Additional recommendations...
  ]
}
\`\`\`

⚠️ CRITICAL FORMAT REQUIREMENTS - FOLLOW EXACTLY ⚠️
- Format must be valid, parseable JSON
- Response must be ONLY the JSON object with no additional text before or after
- Each show must include all five properties: title, description, reasoning, rating, and streaming
- NO Markdown formatting inside the JSON values
- NEVER recommend any show in my library, liked shows list, or any exclusion list
- DO NOT include any introductory or concluding text outside the JSON object`;
      
      userPrompt += `

For the Recommendarr Rating in your recommendations, conduct a thorough analysis using multiple methodologies:
- Statistical analysis: Privately calculate averages, distributions, and trends from rating sources like IMDB, Rotten Tomatoes, TVDB, Metacritic
- Quantitative analysis: Evaluate objective metrics like episode count, seasons completed, awards won, and viewership numbers
- Qualitative analysis: Assess writing quality, acting performances, character development, and production values 
- Comparative analysis: Consider how it ranks among peers in the same genre and time period
- Cultural impact: Weigh its influence, longevity, and relevance to current audiences

After this analysis, provide:
- A percentage score (e.g., "85%")
- A brief assessment that synthesizes these analytical approaches to explain strengths/weaknesses
DO NOT mention or cite any specific external rating sources or scores in your explanation.

CRITICAL REQUIREMENTS:
- DO NOT include any introductions or conclusions in your response
- NEVER recommend any show in my library, liked shows list, or any exclusion list
- For each show, provide a title, description, explanation of why I might like it, a rating, and streaming availability`;

      // Get the appropriate system content based on the prompt style
      const baseSystemContent = this.getSystemContentByStyle(false, activePromptStyle); // false = TV show recommendations
      
      // Add the common rules that apply regardless of style
      const systemContent = `${baseSystemContent}\n\n1. NEVER recommend shows from the user's library or exclusion lists - this is absolutely critical\n2. Always double-check recommendations are not in the user's library, liked shows, disliked shows, or any previously recommended shows\n3. NEVER recommend shows that were already mentioned in the conversation history by either you or the user\n4. Recommend shows matching the emotional and stylistic feel of the user's library\n5. ALWAYS respond using the exact JSON structure specified\n6. DO NOT use markdown formatting in your outputs except for the code block syntax around the JSON\n7. NO extra text, introductions or conclusions outside the JSON structure\n8. Include exactly the required fields: title, description, reasoning, rating, and streaming for each recommendation`;
      
      this.tvConversation = [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: userPrompt
        }
      ];
      } else {
        // If conversation exists, just add a new request message
        this.tvConversation.push({
          role: "user",
          content: `Based on our previous conversation, please recommend ${count} new TV shows I might enjoy. ${genre ? `Focus on ${genre} genres.` : ''} ${customVibe ? `Try to match this vibe: "${customVibe}"` : ''} Use the same format as before.`
        });
      }
      
      // Get initial recommendations using the conversation
      const recommendations = await this.getFormattedRecommendationsWithConversation(this.tvConversation);
      
      // Perform final verification to ensure no existing/liked content is returned
      // This is a critical second check even though we instructed the AI to not include these
      console.log("Verifying TV recommendations don't include library, liked, disliked, or previous items");
      return this.verifyRecommendations(
        recommendations,
        series,                   // Library items
        likedRecommendations,     // Liked items
        dislikedRecommendations,  // Disliked items
        previousRecommendations   // Previous recommendations
      );
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
   * @param {Array} [recentlyWatchedMovies=[]] - List of recently watched movies from Plex/Jellyfin/Tautulli/Trakt
   * @param {boolean} [plexOnlyMode=false] - Whether to use only Plex history for recommendations
   * @param {string} [customVibe=''] - Optional custom vibe/mood for recommendations
   * @param {string} [language=''] - Optional language preference for recommendations
   * @param {string} [promptStyle=null] - Optional prompt style to use (vibe, analytical, creative, technical)
   * @returns {Promise<Array>} - List of recommended movies
   */
  async getMovieRecommendations(movies, count = 5, genre = '', previousRecommendations = [], likedRecommendations = [], dislikedRecommendations = [], recentlyWatchedMovies = [], plexOnlyMode = false, customVibe = '', language = '', promptStyle = null) {
    console.log("OpenAIService: getMovieRecommendations called", {
      moviesCount: movies ? movies.length : 0,
      count,
      genre,
      previousRecsCount: previousRecommendations ? previousRecommendations.length : 0,
      likedRecsCount: likedRecommendations ? likedRecommendations.length : 0,
      dislikedRecsCount: dislikedRecommendations ? dislikedRecommendations.length : 0,
      recentlyWatchedCount: recentlyWatchedMovies ? recentlyWatchedMovies.length : 0,
      watchHistoryMode: plexOnlyMode ? 'Plex Only' : 'Combined Sources',
      customVibe,
      language,
      promptStyle
    });

    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();

      if (!this.isConfigured()) {
        throw new Error('OpenAI service is not configured. Please set apiKey.');
      }
    }
    
    // Use provided promptStyle if available, otherwise fall back to this.promptStyle
    const activePromptStyle = promptStyle || this.promptStyle;

    try {
      // Only initialize conversation history if it doesn't exist yet
      if (this.movieConversation.length === 0) {
        console.log("Initializing new movie conversation");

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
          // Use the Radarr library as the main library
          sourceText = "my movie library";
          const radarrTitles = movies.map(movie => movie.title);
          primarySource = [...radarrTitles];
        }

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
        let userPrompt = `Based on ${sourceText}, recommend ${recommendationCount} high-quality movies I might enjoy. Be brief and direct - no more than 2-3 sentences per section.`;

        // Add genre preference if specified
        if (genre) {
          const genreList = genre.includes(',') ? genre : `the ${genre}`;
          userPrompt += ` Focus specifically on recommending movies in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
        }

        // Add custom vibe if specified
        if (customVibe && customVibe.trim()) {
          userPrompt += ` Try to match this specific vibe/mood: "${customVibe.trim()}".`;
        }

        // Add language preference if specified
        if (language) {
          userPrompt += ` Please ONLY recommend movies in ${language} language.`;
        }

        // Add instructions based on the selected prompt style
        userPrompt += this.getUserPromptAdditionByStyle(true, activePromptStyle); // true = movie recommendations

        // Add library information with appropriate context based on mode
        if (this.useSampledLibrary) {
          userPrompt += `\n\nHere are some examples from my library (${primarySource.length} movies total) to understand my taste: ${libraryTitles}`;
          userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any movies that I already have in my library.`;
        } else {
          userPrompt += `\n\nMy current movies: ${libraryTitles}`;
          userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any movies from the list above as I already have them in my library.`;
        }

        // We no longer include previous recommendations in the prompt
        // We'll use verifyRecommendations to filter out duplicates afterward

        // Add liked movies as explicit examples to not recommend again
        if (likedRecommendations.length > 0) {
          userPrompt += `\n\nI like these movies, but DO NOT recommend them again as I've already seen them: ${likedRecommendations.join(', ')}`;
        }

        // Add disliked movies as explicit negative examples
        if (dislikedRecommendations.length > 0) {
          userPrompt += `\n\nI specifically dislike these movies, so don't recommend anything too similar: ${dislikedRecommendations.join(', ')}`;
        }

        // Add recently watched movies from various services if available and not already using them as the primary source
        if (!plexOnlyMode && recentlyWatchedMovies && recentlyWatchedMovies.length > 0) {
          // Debug watch history data structure
          console.log("Watch history data structures sample:",
            recentlyWatchedMovies.slice(0, 2).map(movie => typeof movie === 'object' ?
              Object.keys(movie) : typeof movie));

          const recentTitles = recentlyWatchedMovies.map(movie => {
            // Handle different formats from different services (Plex, Jellyfin, Tautulli, Trakt)
            if (typeof movie === 'string') return movie;
            return movie.title || movie.name || (typeof movie === 'object' ? JSON.stringify(movie) : movie);
          }).join(', ');

          userPrompt += `\n\nI've recently watched these movies, so please consider them for better recommendations: ${recentTitles}`;
        }

        userPrompt += `\n\nABSOLUTELY CRITICAL: Before suggesting ANY movie, you MUST verify it's not something I already have or dislike.`;

        // Always include JSON formatting instructions regardless of structured output mode
        userPrompt += `

⚠️ FORMATTING REQUIREMENTS: YOU MUST FOLLOW THIS EXACT JSON FORMAT WITHOUT ANY DEVIATION ⚠️

The format below is MANDATORY. Any deviation will COMPLETELY BREAK the application:

\`\`\`json
{
  "recommendations": [
    {
      "title": "Movie Title",
      "description": "Brief description of the movie",
      "reasoning": "Short reason why I might like it based on my current movies",
      "rating": "85% - Brief qualitative assessment",
      "streaming": "Available streaming service"
    },
    {
      "title": "Another Movie Title",
      "description": "Brief description of the movie",
      "reasoning": "Short reason why I might like it based on my current movies",
      "rating": "90% - Brief qualitative assessment",
      "streaming": "Available streaming service"
    }
    // Additional recommendations...
  ]
}
\`\`\`

⚠️ CRITICAL FORMAT REQUIREMENTS - FOLLOW EXACTLY ⚠️
- Format must be valid, parseable JSON
- Response must be ONLY the JSON object with no additional text before or after
- Each movie must include all five properties: title, description, reasoning, rating, and streaming
- NO Markdown formatting inside the JSON values
- NEVER recommend any movie in my library, liked movies list, or any exclusion list
- DO NOT include any introductory or concluding text outside the JSON object`;

        userPrompt += `

For the Recommendarr Rating in your recommendations, conduct a thorough analysis using multiple methodologies:
- Statistical analysis: Privately calculate averages, distributions, and trends from rating sources like IMDB, Rotten Tomatoes, Metacritic
- Quantitative analysis: Evaluate objective metrics like box office performance, budget-to-return ratio, and awards received
- Qualitative analysis: Assess cinematic elements including direction, screenplay, performances, and technical aspects
- Comparative analysis: Consider how it ranks among peers in the same genre and time period  
- Cultural impact: Weigh its influence, longevity, and relevance to current audiences

After this analysis, provide:
- A percentage score (e.g., "85%")
- A brief assessment that synthesizes these analytical approaches to explain strengths/weaknesses
DO NOT mention or cite any specific external rating sources or scores in your explanation.

CRITICAL REQUIREMENTS:
- DO NOT include any introductions or conclusions in your response
- NEVER recommend any movie in my library, liked movies list, or any exclusion list
- For each movie, provide a title, description, explanation of why I might like it, a rating, and streaming availability`;

        // Get the appropriate system content based on the prompt style
        const baseSystemContent = this.getSystemContentByStyle(true, activePromptStyle); // true = movie recommendations
        
        // Add the common rules that apply regardless of style
        const systemContent = `${baseSystemContent}\n\n1. NEVER recommend movies from the user's library or exclusion lists - this is absolutely critical\n2. Always double-check recommendations are not in the user's library, liked movies, disliked movies, or any previously recommended movies\n3. NEVER recommend movies that were already mentioned in the conversation history by either you or the user\n4. Recommend movies matching the mood, style, and emotional resonance of the user's library\n5. ALWAYS respond using the exact JSON structure specified\n6. DO NOT use markdown formatting in your outputs except for the code block syntax around the JSON\n7. NO extra text, introductions or conclusions outside the JSON structure\n8. Include exactly the required fields: title, description, reasoning, rating, and streaming for each recommendation`;

        this.movieConversation = [
          {
            role: "system",
            content: systemContent
          },
          {
            role: "user",
            content: userPrompt
          }
        ];
      } else {
        // If conversation exists, just add a new request message
        this.movieConversation.push({
          role: "user",
          content: `Based on our previous conversation, please recommend ${count} new movies I might enjoy. ${genre ? `Focus on ${genre} genres.` : ''} ${customVibe ? `Try to match this vibe: "${customVibe}"` : ''} Use the same format as before.`
        });
      }

      // Get initial recommendations using the conversation
      console.log("Getting formatted movie recommendations with conversation");
      console.log("Movie conversation length:", this.movieConversation.length);

      const recommendations = await this.getFormattedRecommendationsWithConversation(this.movieConversation);
      console.log("Raw recommendations from API:", recommendations);

      // Perform final verification to ensure no existing/liked content is returned
      // This is a critical second check even though we instructed the AI to not include these
      console.log("Verifying movie recommendations don't include library, liked, disliked, or previous items");
      const verifiedRecommendations = this.verifyRecommendations(
        recommendations,
        movies,                   // Library items
        likedRecommendations,     // Liked items
        dislikedRecommendations,  // Disliked items
        previousRecommendations   // Previous recommendations
      );

      console.log("Verified recommendations:", verifiedRecommendations);
      return verifiedRecommendations;
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
   * Get additional TV show recommendations with a conversation-based approach
   * @param {number} count - Number of additional recommendations to generate
   * @param {Array} previousRecommendations - List of shows to exclude from recommendations
   * @param {string} genre - Optional genre preference
   * @param {string} customVibe - Optional custom vibe
   * @param {string} language - Optional language preference
   * @returns {Promise<Array>} - List of additional recommended TV shows
   */
  async getAdditionalTVRecommendations(count, previousRecommendations = [], genre = '', customVibe = '', language = '', libraryItems = [], likedItems = [], dislikedItems = []) {
    console.log(`getAdditionalTVRecommendations called with: ${libraryItems.length} library items, ${likedItems.length} liked items, ${dislikedItems.length} disliked items, ${previousRecommendations.length} previous recommendations`);
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('OpenAI service is not configured. Please set apiKey.');
      }
    }

    try {
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);
      
      if (this.tvConversation.length === 0) {
        throw new Error('No TV conversation history found. Make initial recommendation request first.');
      }
      
      // Create a simpler prompt for additional recommendations
      let userPrompt = `I need ${recommendationCount} COMPLETELY NEW TV shows that match the emotional and stylistic qualities of my library. CRITICALLY IMPORTANT: Do NOT recommend ANY TV shows that were mentioned in our previous conversation. I need completely new recommendations that haven't been suggested before.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus on shows in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add custom vibe if specified
      if (customVibe && customVibe.trim()) {
        userPrompt += ` Match this vibe/mood: "${customVibe.trim()}".`;
      }
      
      // Add language preference if specified
      if (language) {
        userPrompt += ` ONLY recommend TV shows in ${language} language.`;
      }
      
      // We no longer include previous recommendations in the prompt
      // We'll use verifyRecommendations to filter out duplicates afterward
      
      userPrompt += `\n\nAGAIN: ABSOLUTELY DO NOT recommend ANY shows previously mentioned in our conversation. Check all prior messages to ensure you're not repeating any suggestions.\n\nUse the EXACT same format as before.`;

      // Add the new user message to the existing conversation
      this.tvConversation.push({
        role: "user",
        content: userPrompt
      });
      
      // Get recommendations using the conversation-based method
      const additionalRecs = await this.getFormattedRecommendationsWithConversation(this.tvConversation);
      
      // Filter recommendations against library items, liked items, disliked items and previous recommendations
      return this.verifyRecommendations(
        additionalRecs,
        libraryItems,           // Library items to filter out
        likedItems,             // Liked items to filter out
        dislikedItems,          // Disliked items to filter out
        previousRecommendations // Previous recommendations to avoid
      );
    } catch (error) {
      console.error('Error getting additional TV show recommendations:', error);
      throw error;
    }
  }

  /**
   * Get additional movie recommendations with a conversation-based approach
   * @param {number} count - Number of additional recommendations to generate
   * @param {Array} previousRecommendations - List of movies to exclude from recommendations
   * @param {string} genre - Optional genre preference
   * @param {string} customVibe - Optional custom vibe
   * @param {string} language - Optional language preference
   * @returns {Promise<Array>} - List of additional recommended movies
   */
  async getAdditionalMovieRecommendations(count, previousRecommendations = [], genre = '', customVibe = '', language = '', libraryItems = [], likedItems = [], dislikedItems = []) {
    console.log(`getAdditionalMovieRecommendations called with: ${libraryItems.length} library items, ${likedItems.length} liked items, ${dislikedItems.length} disliked items, ${previousRecommendations.length} previous recommendations`);
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('OpenAI service is not configured. Please set apiKey.');
      }
    }

    try {
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);
      
      if (this.movieConversation.length === 0) {
        throw new Error('No movie conversation history found. Make initial recommendation request first.');
      }
      
      // Create a simpler prompt for additional movie recommendations
      let userPrompt = `I need ${recommendationCount} COMPLETELY NEW movies that match the emotional and cinematic qualities of my library. CRITICALLY IMPORTANT: Do NOT recommend ANY movies that were mentioned in our previous conversation. I need completely new recommendations that haven't been suggested before.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus on movies in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add custom vibe if specified
      if (customVibe && customVibe.trim()) {
        userPrompt += ` Match this vibe/mood: "${customVibe.trim()}".`;
      }
      
      // Add language preference if specified
      if (language) {
        userPrompt += ` ONLY recommend movies in ${language} language.`;
      }
      
      // We no longer include previous recommendations in the prompt
      // We'll use verifyRecommendations to filter out duplicates afterward
      
      userPrompt += `\n\nAGAIN: ABSOLUTELY DO NOT recommend ANY movies previously mentioned in our conversation. Check all prior messages to ensure you're not repeating any suggestions.\n\nUse the EXACT same format as before.`;

      // Add the new user message to the existing conversation
      this.movieConversation.push({
        role: "user",
        content: userPrompt
      });
      
      // Get recommendations using the conversation-based method
      const additionalRecs = await this.getFormattedRecommendationsWithConversation(this.movieConversation);
      
      // Filter recommendations against library items, liked items, disliked items and previous recommendations
      return this.verifyRecommendations(
        additionalRecs,
        libraryItems,           // Library items to filter out
        likedItems,             // Liked items to filter out
        dislikedItems,          // Disliked items to filter out
        previousRecommendations // Previous recommendations to avoid
      );
    } catch (error) {
      console.error('Error getting additional movie recommendations:', error);
      throw error;
    }
  }

  /**
   * Method to get recommendations using a conversation-based approach
   * @param {Array} conversation - An array of chat messages representing the ongoing conversation
   * @returns {Promise<Array>} - List of formatted recommendations
   */
  async getFormattedRecommendationsWithConversation(conversation) {
    console.log("API URL:", this.apiUrl);
    console.log("Model:", this.model);
    
    try {
      // Check if conversation is getting too large and reset if needed
      // A typical message limit before hitting payload size issues is around 10-15 messages
      const MESSAGE_LIMIT = 12; // Reset after this many messages to prevent payload size issues
      
      // If conversation exceeds the limit, reset it to just the system message + latest user message
      if (conversation.length > MESSAGE_LIMIT) {
        console.log(`Conversation history too large (${conversation.length} messages). Resetting context.`);
        const systemMessage = conversation[0]; // Keep system prompt
        const userMessage = conversation[conversation.length - 1]; // Keep latest user message
        
        // Reset conversation to just system + latest user message
        conversation.splice(0, conversation.length);
        conversation.push(systemMessage, userMessage);
        
        console.log(`Conversation reset to ${conversation.length} messages to avoid payload size limits.`);
      }
      
      // Import the ApiService dynamically to avoid circular dependency
      // eslint-disable-next-line no-unused-vars
      const apiService = (await import('./ApiService')).default;
      
      // Define headers based on the API endpoint
      const headers = {};
      
      // Add authentication header based on the API endpoint
      if (this.baseUrl === 'https://api.anthropic.com/v1') {
        if (this.apiKey && this.apiKey.trim() !== '') {
          headers['x-api-key'] = this.apiKey;
          headers['anthropic-dangerous-direct-browser-access'] = 'true';
          headers['anthropic-version'] = '2023-06-01';
          console.log('Using Anthropic headers configuration');
        } else {
          console.warn('No API key provided for Anthropic API request');
        }
      } else if (this.apiKey && this.apiKey.trim() !== '') { // Only add Authorization header if apiKey is present and not empty
        headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
        console.log('Using OpenAI Authorization header (Bearer token)');
        console.log('Authorization header format:', headers['Authorization'].substring(0, 15) + '...');
        console.log('API URL:', this.apiUrl);
      } else {
        console.warn('No API key provided, skipping Authorization header');
      }
      
      console.log("Is API configured:", this.isConfigured());
      console.log("Conversation length:", conversation.length);
      console.log("First message role:", conversation[0]?.role);
      console.log("Last message role:", conversation[conversation.length-1]?.role);
      
      headers['Content-Type'] = 'application/json';
      
      // Prepare the base request data
      const requestData = {
        model: this.model,
        messages: conversation,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      };
      
      // Add structured output format if enabled
      if (this.useStructuredOutput) {
        console.log('Using structured output format for API request');
        requestData.response_format = {
          type: "json_schema",
          json_schema: {
            name: "media_recommendations",
            schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      reasoning: { type: "string" },
                      rating: { type: "string" },
                      streaming: { type: "string" }
                    },
                    required: ["title", "description", "reasoning", "rating", "streaming"],
                    additionalProperties: false
                  }
                }
              },
              required: ["recommendations"],
              additionalProperties: false
            },
            strict: true
          }
        };
      } else {
        console.log('Using legacy format for API request (structured output disabled)');
      }
      
      let response;
      const axios = (await import('axios')).default;
      
      // Try using the proxy first, then fall back to direct request if it fails
      try {
        console.log(`Attempting to proxy request to: ${this.apiUrl} with model: ${this.model}`);
        // Try the proxy service first
        response = await apiService.proxyRequest({
          url: this.apiUrl,
          method: 'POST',
          data: requestData,
          headers
        });
      } catch (proxyError) {
        console.log(`Proxy request failed, falling back to direct request: ${proxyError.message}`);
        // If the proxy fails, make a direct API request
        response = await axios({
          url: this.apiUrl,
          method: 'POST',
          data: requestData,
          headers
        });
      }

      // Check if response contains expected data structure
      // Direct axios response has data directly, not in data.data
      if (!response.data || response.data.error) {
        console.error('API Error:', response.data?.error || 'Unknown error');
        throw new Error(response.data?.error || 'The AI API returned an error. Please check your API key and try again.');
      }
      
      if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        console.error('Unexpected API response format:', response.data);
        throw new Error('The AI API returned an unexpected response format. Please check your API key and endpoint configuration.');
      }
      
      // Get the structured JSON response
      const responseContent = response.data.choices[0].message.content;
      console.log("Response content type:", typeof responseContent);
      
      let parsedRecommendations = [];
      
      // Parse the JSON response (if it's a string) or use it directly (if it's already an object)
      try {
        let recommendationsData;
        
        // Handle different response formats
        if (typeof responseContent === 'string') {
          // Log the first part of the content to help debug
          console.log("Response content preview:", responseContent.substring(0, 100));
          
          // Clean the response if needed - some models might return invalid JSON with comments or prefixes
          let cleanedContent = responseContent.trim();
          
          // If response starts with markdown code block indicators, clean them up
          if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
          } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '');
          }
          
          // Try to parse the JSON
          try {
            recommendationsData = JSON.parse(cleanedContent);
          } catch (initialParseError) {
            console.warn('Initial JSON parse failed, attempting fallback cleanup:', initialParseError);
            
            // Handle case where content might have strange characters at start
            if (cleanedContent.length > 10) {
              // Try cleaning by finding first { and last }
              const firstBrace = cleanedContent.indexOf('{');
              const lastBrace = cleanedContent.lastIndexOf('}');
              
              if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
                try {
                  const extractedJson = cleanedContent.substring(firstBrace, lastBrace + 1);
                  recommendationsData = JSON.parse(extractedJson);
                  console.log('Successfully parsed JSON after extracting braces');
                } catch (extractError) {
                  throw new Error(`Failed to parse extracted JSON: ${extractError.message}`);
                }
              } else {
                throw new Error('Could not find matching JSON braces in response');
              }
            } else {
              throw initialParseError;
            }
          }
        } else {
          // If it's already an object, use it directly
          recommendationsData = responseContent;
        }
        
        // Extract recommendations from the structured response
        if (recommendationsData && recommendationsData.recommendations) {
          parsedRecommendations = recommendationsData.recommendations.map(rec => ({
            ...rec,
            // Add fullText for backward compatibility
            fullText: `${rec.title}:\nDescription: ${rec.description}\nWhy you might like it: ${rec.reasoning}\nRecommendarr Rating: ${rec.rating}\nAvailable on: ${rec.streaming}`
          }));
        } else {
          console.warn('Response is missing recommendations array:', recommendationsData);
        }
      } catch (parseError) {
        console.error('Error parsing structured response:', parseError);
        console.log('Falling back to legacy parsing for content:', responseContent);
        // Fall back to legacy parsing if JSON parsing fails
        parsedRecommendations = this.parseRecommendations(responseContent);
      }
      
      // Add the assistant's response to the conversation history
      conversation.push({
        role: "assistant",
        content: responseContent
      });
      
      return parsedRecommendations;
    } catch (error) {
      console.error('Error getting recommendations with conversation:', error);
      throw error;
    }
  }
  
  /**
   * Generic method to get recommendations from AI with formatted messages (Legacy method, kept for backward compatibility)
   * @param {Array} messages - Chat messages to send to the AI
   * @returns {Promise<Array>} - List of formatted recommendations
   */
  async getFormattedRecommendations(messages) {
    try {
      // Import dependencies dynamically
      const axios = (await import('axios')).default;
      const apiService = (await import('./ApiService')).default;
      
      // Define headers based on the API endpoint
      const headers = {};
      
      // Add authentication header based on the API endpoint
      if (this.baseUrl === 'https://api.anthropic.com/v1') {
        if (this.apiKey && this.apiKey.trim() !== '') {
          headers['x-api-key'] = this.apiKey;
          headers['anthropic-dangerous-direct-browser-access'] = 'true';
          headers['anthropic-version'] = '2023-06-01';
        } else {
          console.warn('No API key provided for Anthropic API request');
        }
      } else if (this.apiKey && this.apiKey.trim() !== '') { // Only add Authorization header if apiKey is present and not empty
        headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
      } else {
        console.warn('No API key provided, skipping Authorization header');
      }
      
      headers['Content-Type'] = 'application/json';

      // Check if we need to chunk the user prompt to stay under token limits
      const MAX_TOKEN_LIMIT = 3800;
      let response;
      
      // We're only concerned with chunking the user prompt (last message)
      const systemMessage = messages[0];
      let userMessage = messages[1];
      
      // Rough estimate of tokens (4 chars ~= 1 token)
      const estimatedTokens = userMessage.content.length / 4;
      
      if (estimatedTokens > MAX_TOKEN_LIMIT) {
        // We need to split into chunks
        response = await this.sendChunkedMessages(systemMessage, userMessage, headers);
      } else {
        // We can send in a single request
        // Prepare the base request data
        const requestData = {
          model: this.model,
          messages: messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens
        };
        
        // Add structured output format if enabled
        if (this.useStructuredOutput) {
          console.log('Using structured output format for API request');
          requestData.response_format = {
            type: "json_schema",
            json_schema: {
              name: "media_recommendations",
              schema: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        reasoning: { type: "string" },
                        rating: { type: "string" },
                        streaming: { type: "string" }
                      },
                      required: ["title", "description", "reasoning", "rating", "streaming"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["recommendations"],
                additionalProperties: false
              },
              strict: true
            }
          };
        } else {
          console.log('Using legacy format for API request (structured output disabled)');
        }
        
        // Try proxy first, then fall back to direct request
        try {
          console.log(`Attempting to proxy request to: ${this.apiUrl}`);
          response = await apiService.proxyRequest({
            url: this.apiUrl,
            method: 'POST',
            data: requestData,
            headers
          });
        } catch (proxyError) {
          console.log(`Proxy request failed, falling back to direct request: ${proxyError.message}`);
          response = await axios({
            url: this.apiUrl,
            method: 'POST',
            data: requestData,
            headers
          });
        }
      }

      // Check if response contains expected data structure
      if (!response.data || response.data.error) {
        console.error('API Error:', response.data?.error || 'Unknown error');
        throw new Error(response.data?.error || 'The AI API returned an error. Please check your API key and try again.');
      }
      
      if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        console.error('Unexpected API response format:', response.data);
        throw new Error('The API returned an unexpected response format. Please check your API key and endpoint configuration.');
      }
      
      // Get the structured JSON response
      const responseContent = response.data.choices[0].message.content;
      console.log("Response content type:", typeof responseContent);
      
      let parsedRecommendations = [];
      
      // Parse the JSON response (if it's a string) or use it directly (if it's already an object)
      try {
        let recommendationsData;
        
        // Handle different response formats
        if (typeof responseContent === 'string') {
          // Log the first part of the content to help debug
          console.log("Response content preview:", responseContent.substring(0, 100));
          
          // Clean the response if needed - some models might return invalid JSON with comments or prefixes
          let cleanedContent = responseContent.trim();
          
          // If response starts with markdown code block indicators, clean them up
          if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
          } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '');
          }
          
          // Try to parse the JSON
          try {
            recommendationsData = JSON.parse(cleanedContent);
          } catch (initialParseError) {
            console.warn('Initial JSON parse failed, attempting fallback cleanup:', initialParseError);
            
            // Handle case where content might have strange characters at start
            if (cleanedContent.length > 10) {
              // Try cleaning by finding first { and last }
              const firstBrace = cleanedContent.indexOf('{');
              const lastBrace = cleanedContent.lastIndexOf('}');
              
              if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
                try {
                  const extractedJson = cleanedContent.substring(firstBrace, lastBrace + 1);
                  recommendationsData = JSON.parse(extractedJson);
                  console.log('Successfully parsed JSON after extracting braces');
                } catch (extractError) {
                  throw new Error(`Failed to parse extracted JSON: ${extractError.message}`);
                }
              } else {
                throw new Error('Could not find matching JSON braces in response');
              }
            } else {
              throw initialParseError;
            }
          }
        } else {
          // If it's already an object, use it directly
          recommendationsData = responseContent;
        }
        
        // Extract recommendations from the structured response
        if (recommendationsData && recommendationsData.recommendations) {
          parsedRecommendations = recommendationsData.recommendations.map(rec => ({
            ...rec,
            // Add fullText for backward compatibility
            fullText: `${rec.title}:\nDescription: ${rec.description}\nWhy you might like it: ${rec.reasoning}\nRecommendarr Rating: ${rec.rating}\nAvailable on: ${rec.streaming}`
          }));
        } else {
          console.warn('Response is missing recommendations array:', recommendationsData);
        }
      } catch (parseError) {
        console.error('Error parsing structured response:', parseError);
        console.log('Falling back to legacy parsing for content:', responseContent);
        // Fall back to legacy parsing if JSON parsing fails
        parsedRecommendations = this.parseRecommendations(responseContent);
      }
      
      // We'll add a verification check later when we have context about existing items
      return parsedRecommendations;
    } catch (error) {
      console.error('Error getting recommendations from AI:', error);
      throw error;
    }
  }
  
  /**
   * Send chunked messages to the API to stay under token limits
   * @param {Object} systemMessage - The system message
   * @param {Object} userMessage - The user message to chunk
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} - The API response
   */
  async sendChunkedMessages(systemMessage, userMessage, headers) {
    // Import dependencies dynamically
    const axios = (await import('axios')).default;
    const apiService = (await import('./ApiService')).default;
    
    // Chunk size in characters (roughly 3000 tokens)
    const CHUNK_SIZE = 12000;
    
    // Split the user content into chunks
    const userContent = userMessage.content;
    const chunks = [];
    
    // Break the content into chunks
    for (let i = 0; i < userContent.length; i += CHUNK_SIZE) {
      chunks.push(userContent.slice(i, i + CHUNK_SIZE));
    }
    
    // Initialize conversation with system message
    let conversationMessages = [systemMessage];
    
    // Send all but the final chunk as separate messages
    for (let i = 0; i < chunks.length - 1; i++) {
      conversationMessages.push({
        role: "user",
        content: `Part ${i+1}/${chunks.length} of my request: ${chunks[i]}\n\nThis is part of a multi-part message. Please wait for all parts before responding.`
      });
      
      const requestData = {
        model: this.model,
        messages: conversationMessages,
        temperature: this.temperature,
        max_tokens: 50  // Small token limit since we just need acknowledgment
      };
      
      // Try to send via proxy first, then fall back to direct request
      try {
        console.log(`Attempting to proxy chunk ${i+1}/${chunks.length} to: ${this.apiUrl}`);
        await apiService.proxyRequest({
          url: this.apiUrl,
          method: 'POST',
          data: requestData,
          headers
        });
      } catch (proxyError) {
        console.log(`Proxy request for chunk ${i+1}/${chunks.length} failed, using direct request: ${proxyError.message}`);
        await axios({
          url: this.apiUrl,
          method: 'POST',
          data: requestData,
          headers
        });
      }
      
      // Add expected assistant acknowledgment to maintain conversation context
      conversationMessages.push({
        role: "assistant",
        content: "I'll wait for the complete message before responding."
      });
    }
    
    // Send the final chunk and request full response
    conversationMessages.push({
      role: "user",
      content: `Final part ${chunks.length}/${chunks.length}: ${chunks[chunks.length - 1]}\n\nThat's the complete request. Please provide recommendations based on all parts of my message.`
    });
    
    // Prepare the base request data for final chunk
    const finalRequestData = {
      model: this.model,
      messages: conversationMessages,
      temperature: this.temperature,
      max_tokens: this.maxTokens
    };
    
    // Add structured output format if enabled
    if (this.useStructuredOutput) {
      console.log('Using structured output format for final chunked request');
      finalRequestData.response_format = {
        type: "json_schema",
        json_schema: {
          name: "media_recommendations",
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    reasoning: { type: "string" },
                    rating: { type: "string" },
                    streaming: { type: "string" }
                  },
                  required: ["title", "description", "reasoning", "rating", "streaming"],
                  additionalProperties: false
                }
              }
            },
            required: ["recommendations"],
            additionalProperties: false
          },
          strict: true
        }
      };
    } else {
      console.log('Using legacy format for final chunked request (structured output disabled)');
    }
    
    // Send final chunk using proxy first, then fall back to direct request
    try {
      console.log(`Attempting to proxy final chunk to: ${this.apiUrl}`);
      return await apiService.proxyRequest({
        url: this.apiUrl,
        method: 'POST',
        data: finalRequestData,
        headers
      });
    } catch (proxyError) {
      console.log(`Proxy request for final chunk failed, using direct request: ${proxyError.message}`);
      return await axios({
        url: this.apiUrl,
        method: 'POST',
        data: finalRequestData,
        headers
      });
    }
  }

  /**
   * Verify recommendations don't include any existing items
   * @param {Array} recommendations - List of recommendations to verify
   * @param {Array} libraryItems - List of items in user's library
   * @param {Array} likedItems - List of items user has liked
   * @param {Array} dislikedItems - List of items user has disliked
   * @param {Array} previousRecommendations - List of previously recommended items
   * @returns {Array} - Filtered list of recommendations
   */
  /**
   * Helper function to normalize titles for comparison
   * @param {string} title - The title to normalize
   * @returns {string} - Normalized title
   */
  normalizeTitleForComparison(title) {
    if (!title) return '';
    
    // Convert to lowercase and trim
    let normalized = title.toLowerCase().trim();
    
    // Remove common prefixes like "the ", "a ", "an "
    normalized = normalized.replace(/^(the|a|an) /, '');
    
    // Remove special characters and extra spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Remove year patterns like (2021) or [2021]
    normalized = normalized.replace(/[([]?(19|20)\d{2}[)\]]?/g, '').trim();
    
    // Remove common suffixes or subtitles
    const commonSplitters = [': ', ' - ', ' – '];
    for (const splitter of commonSplitters) {
      if (normalized.includes(splitter)) {
        // Only take the main title part if it's reasonably long
        const mainPart = normalized.split(splitter)[0].trim();
        if (mainPart.length >= 3) {
          normalized = mainPart;
        }
      }
    }
    
    return normalized;
  }

  /**
   * Helper function to check if two titles are similar
   * @param {string} title1 - First title
   * @param {string} title2 - Second title
   * @returns {boolean} - True if titles are similar
   */
  areTitlesSimilar(title1, title2) {
    // Get normalized versions
    const normalized1 = this.normalizeTitleForComparison(title1);
    const normalized2 = this.normalizeTitleForComparison(title2);
    
    // Check for exact match after normalization
    if (normalized1 === normalized2) {
      return true;
    }
    
    // Check for suffix/prefix relationship with improved handling for distinct titles
    // Example: "Star Wars: A New Hope" and "Star Wars" should match
    // But "The Duke" and "The Duke of Burgundy" should NOT match
    if (normalized1.length > 4 && normalized2.length > 4) {
      // Check if one is a prefix of the other, but add boundary check to avoid partial word matches
      // For example: "The Duke" should not match with "The Duke of Burgundy"
      const shorterStr = normalized1.length < normalized2.length ? normalized1 : normalized2;
      const longerStr = normalized1.length < normalized2.length ? normalized2 : normalized1;
      
      // Only consider exact prefix matches followed by separators (space, colon, etc.)
      // This handles franchise titles like "Star Wars" and "Star Wars: A New Hope"
      if (longerStr.startsWith(shorterStr) && 
          (longerStr.length === shorterStr.length || // Exact match
           longerStr[shorterStr.length] === ' ' ||   // Space after prefix
           longerStr[shorterStr.length] === ':' ||   // Colon after prefix
           longerStr[shorterStr.length] === '-')) {  // Dash after prefix
        // For cases like "Star Wars" vs "Star Wars: The Force Awakens"
        return true;
      }
    }
    
    // Check for word-level similarity with stricter criteria
    const words1 = normalized1.split(' ').filter(word => word.length >= 3);
    const words2 = normalized2.split(' ').filter(word => word.length >= 3);
    
    // If both titles have significant words
    if (words1.length > 0 && words2.length > 0) {
      // Count matching words
      const matchingWords = words1.filter(word => words2.includes(word));
      
      // Require at least 2 matching words for longer titles
      if (matchingWords.length < 2 && (words1.length > 2 || words2.length > 2)) {
        return false;
      }
      
      // Increase threshold to 85% for higher precision
      // This helps distinguish between titles like "The Duke" and "The Duke of Burgundy"
      const matchRatio1 = matchingWords.length / words1.length;
      const matchRatio2 = matchingWords.length / words2.length;
      
      if (matchRatio1 >= 0.85 || matchRatio2 >= 0.85) {
        return true;
      }
    }
    
    // Check for article transposition
    // "Matrix, The" vs "The Matrix"
    const articlesRegex = /(^the |^a |^an |, the$|, a$|, an$)/;
    const withoutArticles1 = normalized1.replace(articlesRegex, '');
    const withoutArticles2 = normalized2.replace(articlesRegex, '');
    
    if (withoutArticles1 === withoutArticles2) {
      return true;
    }
    
    return false;
  }

  verifyRecommendations(recommendations, libraryItems = [], likedItems = [], dislikedItems = [], previousRecommendations = []) {
    if (!recommendations || !recommendations.length) {
      return [];
    }

    // Prepare library items for comparison
    const libraryTitles = libraryItems.map(item => typeof item === 'string' ? item : item.title);
    const likedTitles = likedItems.map(item => typeof item === 'string' ? item : item.title);
    const dislikedTitles = dislikedItems.map(item => typeof item === 'string' ? item : item.title);
    const previousRecTitles = previousRecommendations.map(item => typeof item === 'string' ? item : item.title);
    
    // All titles to check against
    const allExistingTitles = [...libraryTitles, ...likedTitles, ...dislikedTitles, ...previousRecTitles];

    // Filter out any recommendations that match existing items
    const filteredRecommendations = recommendations.filter(rec => {
      const title = rec.title;
      
      // Enhanced debugging of the recommendation being checked
      console.log(`Verifying recommendation: "${title}" against ${libraryTitles.length} library items, ${allExistingTitles.length} total items`);
      
      // First check library items (priority and most important)
      for (const existingTitle of libraryTitles) {
        if (this.areTitlesSimilar(title, existingTitle)) {
          console.log(`Recommendation "${title}" filtered out - LIBRARY MATCH to "${existingTitle}"`);
          return false;
        }
      }
      
      // Then check liked items specifically (these should be excluded)
      for (const existingTitle of likedTitles) {
        if (this.areTitlesSimilar(title, existingTitle)) {
          console.log(`Recommendation "${title}" filtered out - matches LIKED item "${existingTitle}"`);
          return false;
        }
      }
      
      // Then check disliked items
      for (const existingTitle of dislikedTitles) {
        if (this.areTitlesSimilar(title, existingTitle)) {
          console.log(`Recommendation "${title}" filtered out - matches DISLIKED item "${existingTitle}"`);
          return false;
        }
      }
      
      // Finally check previous recommendations
      for (const existingTitle of previousRecTitles) {
        if (this.areTitlesSimilar(title, existingTitle)) {
          console.log(`Recommendation "${title}" filtered out - matches PREVIOUS rec "${existingTitle}"`);
          return false;
        }
      }
      
      return true;
    });

    // Log any removed recommendations
    const removedCount = recommendations.length - filteredRecommendations.length;
    if (removedCount > 0) {
      console.log(`Final verification removed ${removedCount} recommendations that matched existing items`);
    }

    return filteredRecommendations;
  }

  /**
   * Parse recommendations from the AI response
   * @param {string} content - The AI response content
   * @returns {Array} - List of parsed recommendations
   */
  parseRecommendations(content) {
    // Optimized parsing method
    const recommendations = [];
    const seenTitles = new Set(); // Track seen titles to prevent duplicates
    
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
        
        // Properly extract movie/show title from formatted labels
        // Handle the specific case where title is "Movie Title" or "TV Show" label
        if (title.toLowerCase() === "movie title" || title.toLowerCase() === "tv show") {
          // Try to extract the actual title from the beginning of the details
          const firstLineBreak = details.indexOf('\n');
          if (firstLineBreak > 0) {
            const actualTitle = details.substring(0, firstLineBreak).trim();
            if (actualTitle.length > 0 && actualTitle.length < 100) {
              title = actualTitle;
              details = details.substring(firstLineBreak + 1).trim();
            }
          }
        }
        
        // Check if this title is a duplicate (case-insensitive)
        const titleLower = title.toLowerCase();
        if (seenTitles.has(titleLower)) {
          console.log(`Skipping duplicate recommendation: "${title}"`);
          continue;
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
        
        // Add title to seen titles set to prevent duplicates
        seenTitles.add(titleLower);
        
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