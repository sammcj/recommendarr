# Recommendarr

![image](https://github.com/user-attachments/assets/19d332af-f90d-4b6d-8750-4be07bc45161)

Recommendarr is a web application that generates personalized TV show and movie recommendations based on your Sonarr, Radarr, Plex, and Jellyfin libraries using AI.

> **⚠️ IMPORTANT**: When accessing this application from outside your network, you must open port 3030 on your router/firewall.

> **⚠️ PORT REQUIREMENT**: The application currently requires mapping exactly to ports 3030 (frontend) and 3050 (API). These port mappings cannot be changed without breaking functionality. You must map 3030:3030 and 3050:3050 in your Docker configuration.

## 🌟 Features

- **AI-Powered Recommendations**: Get personalized TV show and movie suggestions based on your existing library
- **Sonarr & Radarr Integration**: Connects directly to your media servers to analyze your TV and movie collections
- **Plex, Jellyfin, Tautulli & Trakt Integration**: Analyzes your watch history to provide better recommendations based on what you've actually watched
- **Flexible AI Support**: Works with OpenAI, local models (Ollama/LM Studio), or any OpenAI-compatible API
- **Customization Options**: Adjust recommendation count, model parameters, and more
- **Dark/Light Mode**: Toggle between themes based on your preference
- **Poster Images**: Displays media posters with fallback generation

## 📋 Prerequisites

- [Sonarr](https://sonarr.tv/) instance with API access (for TV recommendations)
- [Radarr](https://radarr.video/) instance with API access (for movie recommendations)
- [Plex](https://www.plex.tv/), [Jellyfin](https://jellyfin.org/), [Tautulli](https://tautulli.com/), or [Trakt](https://trakt.tv/) instance with API access (for watch history analysis) - optional
- An OpenAI API key or any OpenAI-compatible API (like local LLM servers)
- Node.js (v14+) and npm for development

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

The easiest way to run Recommendarr with all features is to use Docker Compose:

```bash
# Clone the repository (which includes the docker-compose.yml file)
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr

# Start the application
docker-compose up -d --build
```

This will:
1. Build the combined container with both frontend and API server
2. Configure proper networking and persistence
3. Start the unified service

Then visit `http://localhost:3030` in your browser to access the application.

**Default Login:** 
- Username: `admin`
- Password: `1234`

> **⚠️ IMPORTANT**: Please change your password immediately after your first login for security reasons.

The unified container runs both the frontend (on port 3030) and the API server (on port 3050 internally). This provides secure credential storage and proxy functionality for accessing services that may be blocked by CORS restrictions.

**Note:** If accessing from outside your network, remember to forward port 3030 on your router/firewall.

### Option 2: Docker (Manual Run)

You can also run the unified container manually:

```bash
# Pull the image
docker pull tannermiddleton/recommendarr:latest

# Run the container
# IMPORTANT: Port mappings must be exactly 3030:3030 and 3050:3050
docker run -d \
  --name recommendarr \
  -p 3030:3030 \
  -p 3050:3050 \
  -v $(pwd)/server/data:/app/server/data \
  tannermiddleton/recommendarr:latest
```

Then visit `http://localhost:3030` in your browser. The container includes both the frontend and API server for secure credential storage.

For more Docker options, see the [Docker Support](#-docker-support) section below.

### Option 3: Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run serve
```

4. Visit `http://localhost:3030` in your browser.

## 🔧 Configuration

### 1. Connect to Sonarr, Radarr, and/or Plex/Jellyfin/Trakt

1. When you first open Recommendarr, you'll be prompted to connect to your services
2. For Sonarr (TV shows):
   - Enter your Sonarr URL (e.g., `http://localhost:8989` or `https://sonarr.yourdomain.com`)
   - Enter your Sonarr API key (found in Sonarr under Settings → General)
   - Click "Connect"
3. For Radarr (Movies):
   - Enter your Radarr URL (e.g., `http://localhost:7878` or `https://radarr.yourdomain.com`)
   - Enter your Radarr API key (found in Radarr under Settings → General)
   - Click "Connect"
4. For Plex (Optional - Watch History):
   - Enter your Plex URL (e.g., `http://localhost:32400` or `https://plex.yourdomain.com`)
   - Enter your Plex token (can be found by following [these instructions](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/))
   - Click "Connect"
5. For Jellyfin (Optional - Watch History):
   - Enter your Jellyfin URL (e.g., `http://localhost:8096` or `https://jellyfin.yourdomain.com`)
   - Enter your Jellyfin API key (found in Jellyfin under Dashboard → API Keys)
   - Enter your Jellyfin user ID (found in Jellyfin user settings)
   - Click "Connect"
6. For Tautulli (Optional - Watch History):
   - Enter your Tautulli URL (e.g., `http://localhost:8181` or `https://tautulli.yourdomain.com`)
   - Enter your Tautulli API key (found in Tautulli under Settings → Web Interface → API)
   - Click "Connect"
7. For Trakt (Optional - Watch History):
   - Click "Connect" on the Trakt connection page
   - Authorize Recommendarr with your Trakt.tv account
   - Complete the authentication process to connect your Trakt watch history

You can connect to any combination of these services based on your needs.

### 2. Set Up AI Service

1. Navigate to Settings
2. Select the AI Service tab
3. Enter your AI service details:
   - **API URL**: For OpenAI, use `https://api.openai.com/v1`. For local models, use your server URL (e.g., `http://localhost:1234/v1`)
   - **API Key**: Your OpenAI API key or appropriate key for other services (not needed for some local servers)
   - **Model**: Select a model from the list or leave as default
   - **Parameters**: Adjust max tokens and temperature as needed
4. Click "Save Settings"

### 3. Get Recommendations

1. Navigate to TV Recommendations or Movie Recommendations page
2. Adjust the number of recommendations you'd like to receive using the slider
3. If connected to Plex, Jellyfin, or Tautulli, choose whether to include your watch history in the recommendations
4. Click "Get Recommendations"
5. View your personalized media suggestions with posters and descriptions

## 🐋 Docker Support

### Option 1: Pull and Run Pre-built Image

The easiest way to run Recommendarr:

```bash
# Pull the image
docker pull tannermiddleton/recommendarr:latest

# Run the container (basic)
# IMPORTANT: Port mappings must be exactly 3030:3030 and 3050:3050
docker run -d \
  --name recommendarr \
  -p 3030:3030 \
  -p 3050:3050 \
  -v $(pwd)/server/data:/app/server/data \
  tannermiddleton/recommendarr:latest
```

### Option 2: Build and Run Locally

If you want to build the Docker image yourself:

```bash
# Clone the repository
git clone https://github.com/fingerthief/recommendarr.git

# Navigate to the project directory
cd recommendarr

# Build the Docker image
docker build -t recommendarr:local .

# Run the container
# IMPORTANT: Port mappings must be exactly 3030:3030 and 3050:3050
docker run -d \
  --name recommendarr \
  -p 3030:3030 \
  -p 3050:3050 \
  -v $(pwd)/server/data:/app/server/data \
  recommendarr:local
```


**Key benefits of using the Docker Compose method:**
- The data directory is mounted as a volume, ensuring your credentials persist across container restarts
- The frontend and API server are bundled together in a single container
- All your service credentials are stored securely using encryption
- CORS issues are automatically handled through the proxy service
- Custom URL configuration for reverse proxy setups (via environment variables)

**Note:** You cannot change the port mappings without breaking functionality. The app must use ports 3030 and 3050 internally.

## 🌐 Setting Up with a Reverse Proxy

If you want to run Recommendarr behind a reverse proxy (like Nginx, Traefik, or Caddy), you **must** build the image yourself with specific build arguments. The pre-built image will not work correctly with a reverse proxy.

Your reverse proxy should be configured to (example):

1. Forward requests from `https://recommendarr.yourdomain.com` to `http://your-docker-host:3030`
2. Forward requests from `https://api.yourdomain.com` to `http://your-docker-host:3050`

For now the proper reverse proxy setup is to either:

- run a build command and pass in the args  (replace with your URLs)
  - `docker build --build-arg VUE_APP_API_URL=https://api.myapp.recommendarr.com --build-arg PUBLIC_URL=https://myapp.recommendarr.com -t recommendarr:latest .`

  
  - `docker run -p 3030:3030 -p 3050:3050 -e VUE_APP_API_URL="https://api.myapp.recommendarr.com" -e PUBLIC_URL="https://myapp.recommendarr.com" -v recommendarr-data:/app/server/data . --build`

- use the updated docker-compose and run `docker-compose up -d --build`, obviously replace the URLs with the ones correct for your setup.

```bash
services:
  recommendarr:
    #IF NOT using a reverse proxy uncomment the image tag to use prebuilt
    #image: tannermiddleton/recommendarr:latest
    # Uncomment and build locally if you need a Reverse Proxy
    build:
      context: .
      args:
        # Build time arguments - set these for the Vue.js build process
        #Reverse proxy example
        - VUE_APP_API_URL=https://api.myapp.recommendarr.com
        #Local example
        #- VUE_APP_API_URL=http://localhost:3050
        - BASE_URL=/
    container_name: recommendarr
    ports:
      - "3030:3030"  # Frontend port
      - "3050:3050"  # Backend API port
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - NODE_ENV=production
      - DOCKER_ENV=true
      # Runtime environment variables - customize these as needed
      # For local use, the defaults should work without changes
      #- PUBLIC_URL=http://localhost:3030
      #- VUE_APP_API_URL=http://localhost:3050
      # For reverse proxy setups, uncomment and modify these do NOT forget the build section above
      - PUBLIC_URL=https://myapp.recommendarr.com
      - VUE_APP_API_URL=https://api.myapp.recommendarr.com
    volumes:
      - recommendarr-data:/app/server/data
    restart: unless-stopped

volumes:
  recommendarr-data:
```

**IMPORTANT:** The internal port mappings in the Docker container must remain 3030:3030 and 3050:3050.

### Method 2: Manual Docker Build and Run

```bash
# Clone the repository
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr

# Build the image with your URLs
docker build -t recommendarr:custom \
  --build-arg BASE_URL=https://recommendarr.yourdomain.com \
  --build-arg VUE_APP_API_URL=https://api.yourdomain.com \
  .

# Run the container
docker run -d \
  --name recommendarr \
  -p 3030:3030 \
  -p 3050:3050 \
  -v $(pwd)/server/data:/app/server/data \
  recommendarr:custom
```

## 🖥️ Compatible AI Services

Recommendarr works with various AI services:

- **OpenAI API**: Standard integration with models like GPT-3.5 and GPT-4
- **Ollama**: Self-hosted models with OpenAI-compatible API
- **LM Studio**: Run models locally on your computer
- **Anthropic Claude**: Via OpenAI-compatible endpoints
- **Self-hosted models**: Any service with OpenAI-compatible chat completions API

### Recommended Models

Here are some recommendations for models that work well with Recommendarr:

#### Free/Low-Cost Options via OpenRouter
- **Meta Llama 3.3 70B Instruct**: Great performance for free
- **Gemini 2.0 models** (Flash/Pro/Thinking): Excellent recommendation quality
- **DeepSeek R1 models**: Strong performance across variants

#### Premium Models (Affordable via OpenRouter)
- **Claude 3.7/3.5 Haiku**: Exceptional for understanding your library preferences
- **GPT-4o mini**: Excellent balance of performance and cost
- **Grok Beta**: Good recommendations at reasonable prices
- **Amazon Nova Pro**: Strong media understanding capabilities

#### Local Models
- **DeepSeek R1 7B Qwen Distill**: Good performance for a smaller model (via LM Studio)

For best results, try setting max tokens to 4000 and temperature between 0.6-0.8 depending on the model.

## 🎬 TV and Movie Recommendations

### TV Recommendations
- Connect to your Sonarr instance to get personalized TV show recommendations
- The AI analyzes your TV library to understand your preferences
- Optional Plex, Jellyfin, Trakt or Tautulli integration enhances recommendations based on what you've actually watched
- Receives detailed recommendations with show descriptions and reasoning

### Movie Recommendations
- Connect to your Radarr instance to get personalized movie recommendations
- The AI analyzes your movie collection to understand genres and preferences you enjoy
- Optional Plex, Jellyfin, Trakt or Tautulli integration provides watch history data for better personalization
- Get suggested movies with descriptions, reasoning, and poster images
- Easily discover new films based on your existing collection

## 🔒 Privacy & Security

Your data never leaves your control:
- When using the API server (via Docker Compose):
  - Sonarr, Radarr, Plex, Jellyfin, and Tautulli API credentials are stored securely using encryption
  - AI API keys are stored encrypted and used only for your requests
  - The API server acts as a proxy, preventing CORS issues when accessing your services
  - All sensitive data is encrypted at rest on the server
- Media library and watch history data is sent only to the AI service you configure
- No analytics or tracking are included in the application

## 💻 Development

### Setting Up a Development Environment

```bash
# Clone the repository
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr

# Install dependencies
npm install

# Start both the frontend and API server concurrently (recommended)
npm run dev

# Or start components individually:
# Run frontend development server with hot-reload
npm run serve

# Run API server separately
npm run api

# Compile and minify for production
npm run build

# Lint and fix files
npm run lint
```

The development server will start at http://localhost:8080 (frontend) and http://localhost:3050 (API server).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Vue.js](https://vuejs.org/) - The progressive JavaScript framework
- [Sonarr](https://sonarr.tv/) - For the amazing API that powers TV recommendations
- [Radarr](https://radarr.video/) - For the API that enables movie recommendations
- [Plex](https://www.plex.tv/) - For the API that provides watch history data
- [Jellyfin](https://jellyfin.org/) - For the API that provides additional watch history data
- [Tautulli](https://tautulli.com/) - For the API that provides detailed Plex watch statistics
- [Trakt](https://trakt.tv/) - For the API that provides watch history and ratings data
- [OpenRouter](https://openrouter.ai/docs/quickstart) - For the API that powers AI-based suggestions