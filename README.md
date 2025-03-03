# Recommendarr

![image](https://github.com/user-attachments/assets/19d332af-f90d-4b6d-8750-4be07bc45161)

Recommendarr is a web application that generates personalized TV show and movie recommendations based on your Sonarr, Radarr, Plex, and Jellyfin libraries using AI.

## 🌟 Features

- **AI-Powered Recommendations**: Get personalized TV show and movie suggestions based on your existing library
- **Sonarr & Radarr Integration**: Connects directly to your media servers to analyze your TV and movie collections
- **Plex & Jellyfin Integration**: Analyzes your watch history to provide better recommendations based on what you've actually watched
- **Flexible AI Support**: Works with OpenAI, local models (Ollama/LM Studio), or any OpenAI-compatible API
- **Customization Options**: Adjust recommendation count, model parameters, and more
- **Dark/Light Mode**: Toggle between themes based on your preference
- **Poster Images**: Displays media posters with fallback generation

## 📋 Prerequisites

- [Sonarr](https://sonarr.tv/) instance with API access (for TV recommendations)
- [Radarr](https://radarr.video/) instance with API access (for movie recommendations)
- [Plex](https://www.plex.tv/) or [Jellyfin](https://jellyfin.org/) instance with API access (for watch history analysis) - optional
- An OpenAI API key or any OpenAI-compatible API (like local LLM servers)
- Node.js (v14+) and npm for development

## 🚀 Quick Start

### Option 1: Docker (Recommended)

Using our pre-built Docker image is the quickest way to get started:

```bash
# Pull the image
docker pull tannermiddleton/recommendarr:latest

# Run the container
docker run -d \
  --name recommendarr \
  -p 3030:80 \
  tannermiddleton/recommendarr:latest
```

Then visit `http://localhost:3030` in your browser.

For more Docker options, see the [Docker Support](#-docker-support) section below.

### Option 2: Manual Installation

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

### 1. Connect to Sonarr, Radarr, and/or Plex/Jellyfin

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
3. If connected to Plex, choose whether to include your watch history in the recommendations
4. Click "Get Recommendations"
5. View your personalized media suggestions with posters and descriptions

## 🐋 Docker Support

### Option 1: Pull and Run Pre-built Image

The easiest way to run Recommendarr:

```bash
# Pull the image
docker pull tannermiddleton/recommendarr:latest

# Run the container
docker run -d \
  --name recommendarr \
  -p 3030:80 \
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
docker run -d \
  --name recommendarr \
  -p 3030:80 \
  recommendarr:local
```

### Option 3: Docker Compose

The repository includes a `docker-compose.yml` file that sets up both the frontend and the API server. Simply run:

```bash
# Clone the repository
git clone https://github.com/fingerthief/recommendarr.git

# Navigate to the project directory 
cd recommendarr

# Start with docker-compose
docker-compose up -d
```

This will build both the frontend and API server images, and start the services on ports 3030 (frontend) and 3050 (API server).

The API server provides secure credential storage and proxy functionality for accessing services that may be blocked by CORS restrictions.

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
- Optional Plex or Jellyfin integration enhances recommendations based on what you've actually watched
- Receives detailed recommendations with show descriptions and reasoning

### Movie Recommendations
- Connect to your Radarr instance to get personalized movie recommendations
- The AI analyzes your movie collection to understand genres and preferences you enjoy
- Optional Plex or Jellyfin integration provides watch history data for better personalization
- Get suggested movies with descriptions, reasoning, and poster images
- Easily discover new films based on your existing collection

## 🔒 Privacy

Your data never leaves your control:
- Sonarr, Radarr, Plex, and Jellyfin API credentials are stored securely using encryption
- AI API keys are stored encrypted and used only for your requests
- Media library and watch history data is sent only to the AI service you configure
- No analytics or tracking are included in the application
- All sensitive data is encrypted at rest

## 💻 Development

```bash
# Install dependencies
npm install

# Run frontend development server with hot-reload
npm run serve

# Run API server
npm run api

# Run both frontend and API server concurrently
npm run dev

# Compile and minify for production
npm run build

# Lint and fix files
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Vue.js](https://vuejs.org/) - The progressive JavaScript framework
- [Sonarr](https://sonarr.tv/) - For the amazing API that powers TV recommendations
- [Radarr](https://radarr.video/) - For the API that enables movie recommendations
- [Plex](https://www.plex.tv/) - For the API that provides watch history data
- [Jellyfin](https://jellyfin.org/) - For the API that provides additional watch history data
- [OpenRouter](https://openrouter.ai/docs/quickstart) - For the API that powers AI-based suggestions
