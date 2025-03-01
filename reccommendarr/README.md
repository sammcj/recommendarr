# Reccommendarr

![Reccommendarr Logo](./public/favicon.ico) 

Reccommendarr is a web application that generates personalized TV show recommendations based on your Sonarr library using AI.

## 🌟 Features

- **AI-Powered Recommendations**: Get personalized TV show suggestions based on your existing library
- **Sonarr Integration**: Connects directly to your Sonarr instance to analyze your TV collection
- **Flexible AI Support**: Works with OpenAI, local models (Ollama/LM Studio), or any OpenAI-compatible API
- **Customization Options**: Adjust recommendation count, model parameters, and more
- **Dark/Light Mode**: Toggle between themes based on your preference
- **Poster Images**: Displays TV show posters with fallback generation

## 📋 Prerequisites

- [Sonarr](https://sonarr.tv/) instance with API access
- An OpenAI API key or any OpenAI-compatible API (like local LLM servers)
- Node.js (v14+) and npm for development

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Pull the image
docker pull reccommendarr/reccommendarr:latest

# Run the container
docker run -d \
  --name reccommendarr \
  -p 8080:80 \
  reccommendarr/reccommendarr:latest
```

Then visit `http://localhost:8080` in your browser.

### Option 2: Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/reccommendarr.git
cd reccommendarr
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run serve
```

4. Visit `http://localhost:8080` in your browser.

## 🔧 Configuration

### 1. Connect to Sonarr

1. When you first open Reccommendarr, you'll be prompted to connect to Sonarr
2. Enter your Sonarr URL (e.g., `http://localhost:8989` or `https://sonarr.yourdomain.com`)
3. Enter your Sonarr API key (found in Sonarr under Settings → General)
4. Click "Connect"

### 2. Set Up AI Service

1. Navigate to Settings
2. Enter your AI service details:
   - **API URL**: For OpenAI, use `https://api.openai.com/v1`. For local models, use your server URL (e.g., `http://localhost:1234/v1`)
   - **API Key**: Your OpenAI API key or appropriate key for other services (not needed for some local servers)
   - **Model**: Select a model from the list or leave as default
   - **Parameters**: Adjust max tokens and temperature as needed
3. Click "Save Settings"

### 3. Get Recommendations

1. Navigate to the Recommendations page
2. Adjust the number of recommendations you'd like to receive using the slider
3. Click "Get Recommendations"
4. View your personalized TV show suggestions with posters and descriptions

## 🐋 Docker Support

### Building the Docker Image

```bash
# Navigate to the project directory
cd reccommendarr

# Build the Docker image
docker build -t reccommendarr/reccommendarr:latest .
```

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3'
services:
  reccommendarr:
    image: reccommendarr/reccommendarr:latest
    container_name: reccommendarr
    ports:
      - "8080:80"
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## 🖥️ Compatible AI Services

Reccommendarr works with various AI services:

- **OpenAI API**: Standard integration with models like GPT-3.5 and GPT-4
- **Ollama**: Self-hosted models with OpenAI-compatible API
- **LM Studio**: Run models locally on your computer
- **Anthropic Claude**: Via OpenAI-compatible endpoints
- **Self-hosted models**: Any service with OpenAI-compatible chat completions API

## 🔒 Privacy

Your data never leaves your control:
- Sonarr API credentials are stored in your browser's localStorage
- AI API keys are stored locally and used only for your requests
- TV show data is sent only to the AI service you configure
- No analytics or tracking are included in the application

## 💻 Development

```bash
# Install dependencies
npm install

# Run development server with hot-reload
npm run serve

# Compile and minify for production
npm run build

# Lint and fix files
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Vue.js](https://vuejs.org/) - The progressive JavaScript framework
- [Sonarr](https://sonarr.tv/) - For the amazing API that makes this possible
- [OpenAI](https://openai.com/) - For the API that powers recommendations
