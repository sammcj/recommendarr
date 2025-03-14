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
    
    // Ensure proper headers are set for LLM API requests
    if (processedUrl.includes('/v1/models')) {
      console.log('Adding headers for models API request');
      if (!options.headers) options.headers = {};
      
      // Set Accept header to tell server what response format we want
      options.headers['Accept'] = 'application/json';
      
      // Ensure content-type is set for all requests, even GET
      options.headers['Content-Type'] = 'application/json';
      
      // Remove User-Agent header as browsers block this header in XHR/fetch requests
      if (options.headers['User-Agent']) {
        delete options.headers['User-Agent'];
        console.log('Removed User-Agent header which browsers block in XHR requests');
      }
      
      // Ensure authorization header has correct capitalization if present
      if (options.headers['authorization'] && !options.headers['Authorization']) {
        options.headers['Authorization'] = options.headers['authorization'];
        delete options.headers['authorization'];
        console.log('Fixed Authorization header capitalization');
      }
      
      // Handle query params for API keys (particularly for Google AI)
      if (options.method === 'GET' && options.params && options.params.key) {
        // Check if the URL already has the key parameter to avoid duplication
        if (!processedUrl.includes('key=')) {
          const hasQueryParam = processedUrl.includes('?');
          const separator = hasQueryParam ? '&' : '?';
          processedUrl = `${processedUrl}${separator}key=${options.params.key}`;
          console.log('Added API key as query parameter');
        } else {
          console.log('URL already contains key parameter, skipping addition');
        }
        // Remove from params to avoid duplication
        delete options.params.key;
      }
    }
    
    const requestOptions = {
      ...options,
      url: processedUrl,
      // Removed timeout to allow models time to complete responses
      validateStatus: function (status) {
        // Accept all status codes to handle them properly
        return true;
      }
    };
    
    // Log complete request configuration for debugging
    if (processedUrl.includes('/v1/models')) {
      console.log('Models API request configuration:', {
        method: requestOptions.method,
        url: requestOptions.url,
        headers: { 
          ...requestOptions.headers,
          Authorization: requestOptions.headers.Authorization ? 'Bearer [REDACTED]' : undefined
        },
        params: requestOptions.params
      });
    }
    
    try {
      console.log(`Sending ${options.method} request to ${processedUrl}`);
      const response = await axios(requestOptions);
      console.log(`Response received from ${processedUrl}, status: ${response.status}, content-type: ${response.headers['content-type'] || 'not specified'}`);
      
      // Log detailed response info for debugging
      if (processedUrl.includes('/v1/models')) {
        console.log('Detailed model endpoint response:', {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          dataType: typeof response.data,
          dataPreview: typeof response.data === 'string' 
                      ? response.data.substring(0, 100) 
                      : JSON.stringify(response.data).substring(0, 100)
        });
      }
      
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
        
        // Extra debugging for Google AI API
        if (processedUrl.includes('generativelanguage.googleapis.com')) {
          console.warn('Google AI API error details:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            url: processedUrl,
            headers: requestOptions.headers ? 
              { ...requestOptions.headers, Authorization: requestOptions.headers.Authorization ? '[REDACTED]' : undefined } : 
              'No headers'
          });
        }
        
        if (response.data && response.data.error) {
          console.warn(`API error: ${response.data.error.message || response.data.error}`);
        }
        
        // For status 400, provide more details
        if (response.status === 400) {
          console.warn('Bad Request (400) details:', {
            data: response.data,
            requestMethod: requestOptions.method,
            requestParams: requestOptions.params
          });
          
          // For Google API, check if the key is valid
          if (processedUrl.includes('generativelanguage.googleapis.com') && 
              (response.data?.error?.message?.includes('API key') || 
               JSON.stringify(response.data).includes('API key'))) {
            console.error('Likely Google API key validation issue. Check that the API key is correct and has Gemini API enabled.');
          }
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
      
      // For debugging model API requests
      if (options.url.includes('/v1/models')) {
        console.error('Model API request failed:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers,
            data: error.response.data
          } : 'No response',
          request: {
            url: options.url,
            method: options.method,
            headers: { ...options.headers, Authorization: options.headers.Authorization ? '[REDACTED]' : undefined },
            params: options.params
          }
        });
        
        // Check for specific API provider errors
        if (options.url.includes('generativelanguage.googleapis.com')) {
          console.error('Google API specific error - check:');
          console.error('1. API key is correct and has Gemini API enabled');
          console.error('2. You have proper permissions for the project');
          console.error('3. The model endpoint URL format is correct');
          console.error('4. You have not exceeded quota limits');
        }
      }
      
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