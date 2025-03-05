const axios = require('axios');

/**
 * Service to handle API proxying
 */
class ProxyService {
  constructor() {
    // Flag to indicate if we're running in Docker
    this.isDocker = process.env.DOCKER_ENV === 'true';
  }
  
  /**
   * Process URLs for Docker compatibility
   * 
   * @param {string} url The original URL
   * @returns {string} The processed URL
   */
  processUrl(url) {
    if (!this.isDocker) return url;
    
    try {
      // Parse the URL to get hostname
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      
      // Only modify localhost/127.0.0.1 URLs
      // Leave all external URLs (including API providers) untouched
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const processed = url.replace(/(localhost|127\.0\.0\.1)/, 'host.docker.internal');
        console.log(`[ProxyService] Converted localhost URL to: ${processed}`);
        return processed;
      }
      
      // Handle local IP addresses that might need to reach host network
      if (/^192\.168\.[0-9]{1,3}\.[0-9]{1,3}$/.test(hostname) || 
          /^10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(hostname)) {
        // Keep the URL intact - container should be able to reach host network
        console.log(`[ProxyService] Detected local IP address: ${hostname}`);
        return url;
      }
      
      // For all other URLs (external APIs, etc.), don't modify them
      console.log(`[ProxyService] Using unmodified external URL: ${url}`);
      return url;
    } catch (error) {
      // If URL parsing fails, return the original URL
      console.error(`[ProxyService] Error parsing URL ${url}:`, error.message);
      return url;
    }
  }
  
  /**
   * Forward a request through the proxy
   * 
   * @param {Object} options Request options
   * @param {string} options.url Target URL
   * @param {string} options.method HTTP method
   * @param {Object} options.data Request body data
   * @param {Object} options.params URL parameters
   * @param {Object} options.headers HTTP headers
   * @returns {Promise<Object>} Response data
   */
  async proxyRequest(options) {
    // Process the URL for Docker compatibility
    const processedUrl = this.processUrl(options.url);
    console.log(`Processing proxy request: ${options.url} -> ${processedUrl}`);
    
    // Log the headers (excluding Authorization for security)
    const sanitizedHeaders = {...options.headers};
    if (sanitizedHeaders.Authorization) {
      sanitizedHeaders.Authorization = 'Bearer [REDACTED]';
    }
    console.log('Request headers:', JSON.stringify(sanitizedHeaders));
    
    const requestOptions = {
      ...options,
      url: processedUrl,
      // Removed timeout to allow models time to complete responses
      validateStatus: function (status) {
        // Accept all status codes to handle them properly
        return true;
      }
    };
    
    try {
      console.log(`Sending ${options.method} request to ${processedUrl}`);
      const response = await axios(requestOptions);
      console.log(`Response received from ${processedUrl}, status: ${response.status}, content-type: ${response.headers['content-type'] || 'not specified'}`);
      
      // Check if the response appears to be HTML instead of JSON
      const contentType = response.headers['content-type'] || '';
      const isHtml = contentType.includes('text/html') || 
                    (typeof response.data === 'string' && 
                     (response.data.trim().startsWith('<!DOCTYPE') || 
                      response.data.trim().startsWith('<html')));
      
      if (isHtml) {
        console.error('Received HTML response when expecting JSON:', response.status);
        // If we can extract a title from the HTML, it might help diagnose the issue
        let errorTitle = 'Unknown HTML Error';
        if (typeof response.data === 'string') {
          const titleMatch = response.data.match(/<title>(.*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            errorTitle = titleMatch[1];
          }
        }
        
        // Return a formatted error instead of the HTML
        return {
          status: response.status,
          statusText: 'Invalid Response Type',
          data: {
            error: `Received HTML response instead of expected JSON: "${errorTitle}". This typically indicates an authentication issue or invalid request.`,
            originalStatus: response.status,
            htmlTitle: errorTitle
          },
          headers: response.headers
        };
      }
      
      // Log successful response type
      if (response.status >= 200 && response.status < 300) {
        console.log(`Successful response (${response.status}) with data type: ${typeof response.data}`);
      } else {
        console.warn(`Non-success response: ${response.status} ${response.statusText}`);
        if (response.data && response.data.error) {
          console.warn(`API error: ${response.data.error.message || response.data.error}`);
        }
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      console.error('Error in proxy service:', error.message);
      
      // Provide a more detailed error message for network issues
      if (error.code === 'ECONNREFUSED' && (options.url.includes('localhost') || options.url.includes('127.0.0.1'))) {
        throw {
          error: 'Connection refused to local service',
          message: 'Unable to connect to your local service. Make sure it is running and accessible.',
          code: error.code,
          data: null,
          status: 502
        };
      }
      
      throw {
        error: error.message,
        data: error.response?.data || null,
        status: error.response?.status || 500,
        code: error.code
      };
    }
  }
}

module.exports = new ProxyService();