const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dns = require('dns').promises;
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./utils/encryption');
const proxyService = require('./services/ProxyService');

const app = express();
const PORT = process.env.PORT || 3050;

// Global app configuration
let appConfig = {
  publicUrl: process.env.PUBLIC_URL || '',
  baseUrl: process.env.BASE_URL || '/',
  apiUrl: process.env.VUE_APP_API_URL || ''
};

// Simple logging message for startup
console.log(`API Server starting up in ${process.env.NODE_ENV || 'development'} mode`);

// Create a data directory for storing user credentials
const DATA_DIR = path.join(__dirname, 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
const USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');

// Initialize storage
let credentials = {};
let userData = {
  tvRecommendations: [],
  movieRecommendations: [],
  likedTV: [],
  dislikedTV: [],
  likedMovies: [],
  dislikedMovies: [],
  settings: {
    numRecommendations: 6,
    columnsCount: 3,
    historyColumnsCount: 3,
    historyHideExisting: true,
    historyHideLiked: false,
    historyHideDisliked: false,
    contentTypePreference: 'tv',
    isMovieMode: false,
    tvGenrePreferences: [],
    tvCustomVibe: '',
    tvLanguagePreference: 'en',
    movieGenrePreferences: [],
    movieCustomVibe: '',
    movieLanguagePreference: 'en'
  }
};

// Create data directory if it doesn't exist and load credentials and user data
async function initStorage() {
  try {
    // Initialize encryption service first
    await encryptionService.init();
    
    // Ensure data directory exists
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log(`Created data directory: ${DATA_DIR}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating data directory:', err);
      }
    }

    // Try to load existing credentials
    try {
      const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is already encrypted
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt the data
        credentials = encryptionService.decrypt(fileData);
        console.log('Loaded and decrypted existing credentials');
        
        // App-config feature has been removed - use environment vars only
        console.log('Using environment variables for application configuration');
      } else {
        // Legacy unencrypted data - encrypt it now
        credentials = fileData;
        await saveCredentials();
        console.log('Migrated unencrypted credentials to encrypted format');
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, initialize with empty object
        credentials = {};
        await saveCredentials();
        console.log('Created new encrypted credentials file');
      } else {
        console.error('Error reading credentials file:', err);
      }
    }

    // Try to load existing user data
    try {
      const data = await fs.readFile(USER_DATA_FILE, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is already encrypted
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt the data
        userData = encryptionService.decrypt(fileData);
        console.log('Loaded and decrypted existing user data');
      } else {
        // Legacy unencrypted data - encrypt it now
        userData = fileData;
        await saveUserData();
        console.log('Migrated unencrypted user data to encrypted format');
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, initialize with default values
        await saveUserData();
        console.log('Created new encrypted user data file');
      } else {
        console.error('Error reading user data file:', err);
      }
    }
  } catch (err) {
    console.error('Error initializing data storage:', err);
  }
}

// Save credentials to file with encryption
async function saveCredentials() {
  try {
    // Encrypt the credentials object
    const encryptedData = encryptionService.encrypt(credentials);
    
    // Write encrypted data to file
    await fs.writeFile(CREDENTIALS_FILE, JSON.stringify(encryptedData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving credentials:', err);
  }
}

// Save user data to file with encryption
async function saveUserData() {
  try {
    // Encrypt the user data object
    const encryptedData = encryptionService.encrypt(userData);
    
    // Write encrypted data to file
    await fs.writeFile(USER_DATA_FILE, JSON.stringify(encryptedData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving user data:', err);
  }
}

// Initialize storage on startup
initStorage();

// Enable CORS
app.use(cors());

// Parse JSON request body
app.use(express.json());

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    config: {
      // Return a safe subset of config - never return sensitive data
      publicUrl: appConfig.publicUrl || '',
    }
  });
});

// API endpoints for credentials management
// Get all credentials (service IDs only, no secrets)
app.get('/api/credentials', (req, res) => {
  // Return just the service names and their existence, not the actual keys
  const services = {};
  for (const [service, creds] of Object.entries(credentials)) {
    // Skip app-config as it's been removed
    if (service !== 'app-config') {
      services[service] = Object.keys(creds).reduce((acc, key) => {
        // Don't send the actual API keys or sensitive data to the client
        acc[key] = creds[key] ? true : false;
        return acc;
      }, {});
    }
  }
  res.json({ services });
});

// Store credentials for a service
app.post('/api/credentials/:service', async (req, res) => {
  const { service } = req.params;
  const serviceCredentials = req.body;
  
  // Reject attempts to store app-config since the feature is removed
  if (service === 'app-config') {
    return res.status(400).json({ error: 'App configuration via API is not supported' });
  }
  
  if (!serviceCredentials) {
    return res.status(400).json({ error: 'No credentials provided' });
  }
  
  // Initialize the service if it doesn't exist
  if (!credentials[service]) {
    credentials[service] = {};
  }
  
  // Update the credentials
  credentials[service] = {
    ...credentials[service],
    ...serviceCredentials
  };
  
  // Save to file
  await saveCredentials();
  
  // Return success, but don't echo back the credentials
  res.json({ success: true, service });
});

// Retrieve credentials for a service
app.get('/api/credentials/:service', (req, res) => {
  const { service } = req.params;
  
  // Return empty response for app-config as it's been removed
  if (service === 'app-config') {
    return res.json({});
  }
  
  if (!credentials[service]) {
    return res.status(404).json({ error: `No credentials found for ${service}` });
  }
  
  res.json(credentials[service]);
});

// Delete credentials for a service
app.delete('/api/credentials/:service', async (req, res) => {
  const { service } = req.params;
  
  if (!credentials[service]) {
    return res.status(404).json({ error: `No credentials found for ${service}` });
  }
  
  delete credentials[service];
  await saveCredentials();
  
  res.json({ success: true, message: `Credentials for ${service} deleted` });
});

// User data endpoints
// Get all recommendations
app.get('/api/recommendations/:type', (req, res) => {
  const { type } = req.params;
  
  if (type === 'tv') {
    res.json(userData.tvRecommendations || []);
  } else if (type === 'movie') {
    res.json(userData.movieRecommendations || []);
  } else {
    res.status(400).json({ error: 'Invalid recommendation type' });
  }
});

// Save recommendations
app.post('/api/recommendations/:type', async (req, res) => {
  const { type } = req.params;
  const recommendations = req.body;
  
  if (type === 'tv') {
    userData.tvRecommendations = recommendations;
  } else if (type === 'movie') {
    userData.movieRecommendations = recommendations;
  } else {
    return res.status(400).json({ error: 'Invalid recommendation type' });
  }
  
  await saveUserData();
  res.json({ success: true });
});

// Get liked/disliked items
app.get('/api/preferences/:type/:preference', (req, res) => {
  const { type, preference } = req.params;
  
  if (type === 'tv' && preference === 'liked') {
    res.json(userData.likedTV || []);
  } else if (type === 'tv' && preference === 'disliked') {
    res.json(userData.dislikedTV || []);
  } else if (type === 'movie' && preference === 'liked') {
    res.json(userData.likedMovies || []);
  } else if (type === 'movie' && preference === 'disliked') {
    res.json(userData.dislikedMovies || []);
  } else {
    res.status(400).json({ error: 'Invalid parameters' });
  }
});

// Save liked/disliked items
app.post('/api/preferences/:type/:preference', async (req, res) => {
  const { type, preference } = req.params;
  const items = req.body;
  
  if (type === 'tv' && preference === 'liked') {
    userData.likedTV = items;
  } else if (type === 'tv' && preference === 'disliked') {
    userData.dislikedTV = items;
  } else if (type === 'movie' && preference === 'liked') {
    userData.likedMovies = items;
  } else if (type === 'movie' && preference === 'disliked') {
    userData.dislikedMovies = items;
  } else {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  
  await saveUserData();
  res.json({ success: true });
});

// Get settings
app.get('/api/settings', (req, res) => {
  res.json(userData.settings || {});
});

// Save settings
app.post('/api/settings', async (req, res) => {
  userData.settings = {...userData.settings, ...req.body};
  await saveUserData();
  res.json({ success: true });
});

// Generic proxy endpoint for all services
// Endpoint to help diagnose network connectivity issues
app.get('/api/net-test', async (req, res) => {
  const target = req.query.target;
  
  if (!target) {
    return res.status(400).json({ error: 'Target IP or hostname required' });
  }
  
  const results = {
    target,
    checks: {}
  };
  
  try {
    // Try to ping via DNS lookup
    const dnsStartTime = Date.now();
    try {
      const dnsResult = await dns.lookup(target);
      results.checks.dns = {
        success: true,
        ip: dnsResult.address,
        time: Date.now() - dnsStartTime
      };
    } catch (error) {
      results.checks.dns = {
        success: false,
        error: error.message
      };
    }
    
    // Try HTTP connection if port specified
    const port = req.query.port;
    if (port) {
      const httpTarget = `http://${target}:${port}`;
      try {
        const httpStartTime = Date.now();
        const response = await axios.get(httpTarget, { timeout: 30000 });
        results.checks.http = {
          success: true,
          status: response.status,
          time: Date.now() - httpStartTime
        };
      } catch (error) {
        results.checks.http = {
          success: false,
          error: error.message,
          code: error.code
        };
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/proxy', async (req, res) => {
  const { url, method = 'GET', data = null, params = null, headers = {} } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  console.log(`Proxy request to: ${url} (${method})`);
  
  // Debug headers for OpenAI requests
  if (url.includes('openai.com')) {
    const sanitizedHeaders = {...headers};
    // Mask the API key for security but show format
    if (sanitizedHeaders.Authorization) {
      const authHeader = sanitizedHeaders.Authorization;
      sanitizedHeaders.Authorization = authHeader.substring(0, 15) + '...';
      console.log('OpenAI request headers:', JSON.stringify(sanitizedHeaders));
    } else {
      console.warn('OpenAI request missing Authorization header');
    }
  }

  // Process URL to handle local network services
  let processedUrl = url;
  
  // In Docker environment, we need to handle local network references 
  if (process.env.DOCKER_ENV === 'true') {
    console.log(`Docker environment detected, processing URL: ${url}`);
    
    try {
      // Parse the URL to extract hostname properly
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      
      // Only modify localhost/127.0.0.1 URLs
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        processedUrl = url.replace(/(localhost|127\.0\.0\.1)/, 'host.docker.internal');
        console.log(`Converted localhost URL to Docker-friendly format: ${processedUrl}`);
      } 
      // Handle references to the same host as the server
      else if (hostname === req.hostname) {
        // Extract the port if present
        const port = parsedUrl.port;
        
        if (port) {
          // If it's a different port on the same host, access via host.docker.internal
          processedUrl = url.replace(req.hostname, 'host.docker.internal');
          console.log(`Converted same-host URL to Docker-friendly format: ${processedUrl}`);
        }
      }
      // For all external URLs (including API providers)
      else {
        console.log(`External API call detected, using original URL: ${url}`);
        processedUrl = url;
      }
    } catch (error) {
      console.error(`Error parsing URL ${url}:`, error.message);
      // If URL parsing fails, use the original URL
      processedUrl = url;
    }
  }
  
  try {
    // Add request timeout to prevent hanging connections
    const response = await axios({
      url: processedUrl,
      method,
      data,
      params,
      headers,
      // Removed timeout to allow model generation time
      validateStatus: function (status) {
        // Accept all status codes to handle them in our response
        return true;
      }
    });
    
    console.log(`Proxy response from: ${processedUrl}, status: ${response.status}`);
    
    // Log detailed information for OpenAI API errors
    if (processedUrl.includes('openai.com') && response.status >= 400) {
      console.error('OpenAI API error response:', JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: {
          ...response.headers,
          // Redact any sensitive headers
          authorization: response.headers.authorization ? '[REDACTED]' : undefined
        }
      }));
    }
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Provide more detailed error information
    const errorDetails = {
      error: error.message,
      code: error.code,
      data: error.response?.data || null
    };
    
    // Handle network connectivity errors with more helpful messages
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
      const isLocalNetworkIP = /https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)\d+\.\d+/.test(url);
      
      let message = 'Could not connect to the service.';
      
      if (isLocalhost) {
        message += ' The server cannot access your localhost address. Please ensure the Sonarr/Radarr service is running on your host machine.';
      } else if (isLocalNetworkIP) {
        message += ` Could not connect to ${url}. Please verify:
         1. The service is running on that IP
         2. The port is correct and open
         3. Any firewalls allow the connection
         4. The server has network access to that IP`;
      }
      
      console.error(`Connection error (${error.code}): ${message} Attempted URL: ${processedUrl}`);
      return res.status(502).json({
        ...errorDetails,
        message
      });
    }
    
    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ETIME') {
      console.error(`Timeout error: Request to ${processedUrl} timed out`);
      return res.status(504).json({
        ...errorDetails,
        message: 'The request timed out. This may happen if the service is not accessible from the server.'
      });
    }
    
    res.status(error.response?.status || 500).json(errorDetails);
  }
});

// Image proxy endpoint (make sure this exactly matches the client request path)
app.get('/api/image-proxy', async (req, res) => {
  console.log('Image proxy request received:', req.query.url);
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }
  
  console.log(`Proxying image request for: ${imageUrl}`);
  
  try {
    // Process URL to handle local network services in Docker
    let processedUrl = imageUrl;
    
    // In Docker environment, handle localhost references
    if (process.env.DOCKER_ENV === 'true') {
      try {
        const parsedUrl = new URL(imageUrl);
        if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
          processedUrl = imageUrl.replace(/(localhost|127\.0\.0\.1)/, 'host.docker.internal');
          console.log(`Converted localhost URL to Docker-friendly format: ${processedUrl}`);
        }
      } catch (error) {
        console.error(`Error parsing image URL ${imageUrl}:`, error.message);
      }
    }
    
    // Fetch the image
    const response = await axios({
      url: processedUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      }
    });
    
    // If error, return 404
    if (response.status >= 400) {
      console.error(`Error fetching image: ${response.status}`);
      return res.status(404).send('Image not found');
    }
    
    // Set content type and send image
    const contentType = response.headers['content-type'];
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(response.data);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(500).send('Error fetching image');
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});