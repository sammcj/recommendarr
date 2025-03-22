# Recommendarr

![image](https://github.com/user-attachments/assets/19d332af-f90d-4b6d-8750-4be07bc45161)

Recommendarr is a web application that generates personalized TV show and movie recommendations based on your Sonarr, Radarr, Plex, and Jellyfin libraries using AI.

## [🎮 Join our Discord Community!](https://discord.gg/uHy3KFbgPR)

> **⚠️ IMPORTANT**: When accessing this application from outside your network, you must open the application port on your router/firewall (default: 3000).

> **⚠️ PORT CONFIGURATION**: The application now uses a single port (default: 3000) for both the frontend and API, configurable via the `PORT` environment variable.

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
- Docker (recommended) or Node.js (v14+) for manual installation

## 🚀 Quick Start

### Option 1: Docker Hub Image (Easiest)

The simplest way to get started with Recommendarr:

```bash
# Pull and run with default port 3000
docker run -d \
  --name recommendarr \
  -p 3000:3000 \
  -v recommendarr-data:/app/server/data \
  tannermiddleton/recommendarr:latest

# Or run with a custom port (e.g., 8080)
docker run -d \
  --name recommendarr \
  -e PORT=8080 \
  -p 8080:8080 \
  -v recommendarr-data:/app/server/data \
  tannermiddleton/recommendarr:latest
```

Then visit `http://localhost:3000` (or your custom port) in your browser.

**Default Login:** 
- Username: `admin`
- Password: `1234`

> **⚠️ IMPORTANT**: Please change your password immediately after your first login for security reasons.

### Option 2: Docker Compose

If you prefer using Docker Compose:

```bash
# Clone the repository (which includes the docker-compose.yml file)
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr

# Start the application
docker-compose up -d
```

This will:
1. Pull the pre-built image from Docker Hub
2. Configure proper networking and persistence
3. Start the unified service

Then visit `http://localhost:3000` (or your custom port if configured) in your browser.

You can customize the port by setting the PORT environment variable before running docker-compose:

```bash
PORT=8080 docker-compose up -d
```

### Option 3: Build Your Own Docker Image

If you want to build the Docker image yourself:

```bash
# Clone the repository
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr

# Build the Docker image
docker build -t recommendarr:local .

# Run the container with default port
docker run -d \
  --name recommendarr \
  -p 3000:3000 \
  -v recommendarr-data:/app/server/data \
  recommendarr:local

# Or run with custom port
docker run -d \
  --name recommendarr \
  -e PORT=8080 \
  -p 8080:8080 \
  -v recommendarr-data:/app/server/data \
  recommendarr:local
```

### Option 4: Manual Installation

For development or if you prefer not to use Docker:

1. Clone the repository:
```bash
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr
```

2. Install dependencies:
```bash
npm install
```

3. Build the frontend:
```bash
npm run build
```

4. Start the unified server:
```bash
npm run unified
```

5. Visit `http://localhost:3000` (or your custom port if configured) in your browser.

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

## 🌐 Setting Up with a Reverse Proxy

If you want to run Recommendarr behind a reverse proxy (like Nginx, Traefik, or Caddy), follow these steps:

1. Build a custom image with your public URL:

```bash
# Build with your public URL
docker build -t recommendarr:custom \
  --build-arg PUBLIC_URL=https://recommendarr.yourdomain.com \
  --build-arg BASE_URL=/ \
  .

# Run with reverse proxy configuration
docker run -d \
  --name recommendarr \
  -p 3000:3000 \
  -e PUBLIC_URL=https://recommendarr.yourdomain.com \
  -e FORCE_SECURE_COOKIES=true \
  -v recommendarr-data:/app/server/data \
  recommendarr:custom
```

2. Configure your reverse proxy to forward requests to Recommendarr:

**For Nginx:**
```nginx
server {
    listen 443 ssl;
    server_name recommendarr.yourdomain.com;

    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**For Docker Compose:**

```yaml
services:
  recommendarr:
    build:
      context: .
      args:
        - PUBLIC_URL=https://recommendarr.yourdomain.com
        - BASE_URL=/
    ports:
      - "3000:3000"
    # This allows accessing services on the host machine
    # extra_hosts:
    #  - "host.docker.internal:host-gateway"
    environment:
      - NODE_ENV=production
      - DOCKER_ENV=false
      - PORT=3000
      - PUBLIC_URL=https://recommendarr.yourdomain.com
      # Enable secure cookies when behind HTTPS reverse proxy
      - FORCE_SECURE_COOKIES=true
    volumes:
      - recommendarr-data:/app/server/data
    restart: unless-stopped

volumes:
  recommendarr-data:
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port to run both frontend and API | 3000 |
| `PUBLIC_URL` | The public URL where the app is accessible | http://localhost:${PORT} |
| `BASE_URL` | Base path for the application (for sub-path deployment) | / |
| `FORCE_SECURE_COOKIES` | Force secure cookies even on HTTP (for HTTPS reverse proxies) | false |
| `NODE_ENV` | Node.js environment | production |
| `DOCKER_ENV` | Flag to enable Docker-specific features | true |

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

## 🔧 Troubleshooting

### Cookie Errors with Reverse Proxy

If you're using a reverse proxy with HTTPS and get errors like:
```
cookie "auth_token" has been rejected because a non-https cookie can't be set "secure"
```

This happens when your reverse proxy terminates HTTPS but forwards the request to the container as HTTP. To fix this:

1. Add the `FORCE_SECURE_COOKIES=true` environment variable to your docker-compose.yml or docker run command:
```yaml
environment:
  - FORCE_SECURE_COOKIES=true
```

2. Make sure your reverse proxy forwards the correct headers. For Nginx, add:
```
proxy_set_header X-Forwarded-Proto $scheme;
```

### Port Mapping

- Always make sure the internal and external ports match (e.g., 3000:3000)
- When changing ports, update both the port mapping and PORT environment variable

### Development Setup

For development purposes, you can run the frontend and backend separately:

```bash
# Run both frontend and backend in development mode
npm run dev

# Or run them separately:
# Frontend dev server with hot reloading
npm run serve

# Backend API server
npm run api
```

The development server will use port 8080 for the frontend with hot reloading, and port 3050 for the API. In production, both run on a single port.

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
