# Recommendarr

![image](https://github.com/user-attachments/assets/d0189d62-9644-4ef2-b44d-af78ad3e29f4)

Recommendarr is a web application that generates personalized TV show and movie recommendations based on your Sonarr, Radarr, Plex, and Jellyfin libraries using AI.

**For detailed documentation, please visit the [[https://github.com/fingerthief/recommendarr/wiki|Recommendarr Wiki]].**

## [🎮 Join our Discord Community!](https://discord.gg/uHy3KFbgPR)

> **⚠️ IMPORTANT**: When accessing this application from outside your network, you must open the application port on your router/firewall (default: 3000). See the [[Reverse Proxy Setup]] wiki page for secure setup guidance.

> **⚠️ PORT CONFIGURATION**: The application now uses a single port (default: 3000) for both the frontend and API, configurable via the `PORT` environment variable. See [[Environment Variables]].

## 🌟 Features

- **AI-Powered Recommendations**: Get personalized TV show and movie suggestions based on your existing library.
- **Sonarr & Radarr Integration**: Connects directly to your media servers to analyze your TV and movie collections.
- **Plex, Jellyfin, Tautulli & Trakt Integration**: Analyzes your watch history for better recommendations.
- **Flexible AI Support**: Works with OpenAI, local models (Ollama/LM Studio), or any OpenAI-compatible API. See [[Compatible AI Services]].
- **Customization Options**: Adjust recommendation count, model parameters, and more.
- **Dark/Light Mode**: Toggle between themes based on your preference.
- **Poster Images**: Displays media posters with fallback generation.

For a full list, see [[Features]].

## 📋 Prerequisites

Before installing, ensure you have the necessary services and access. See the [[Prerequisites]] page on the wiki for details.

## 🚀 Quick Start (Docker Hub - Easiest)

The simplest way to get started with Recommendarr:

```bash
# Pull and run with default port 3000
docker run -d \
  --name recommendarr \
  -p 3000:3000 \
  -v recommendarr-data:/app/server/data \
  tannermiddleton/recommendarr:latest
```

Then visit `http://localhost:3000` in your browser.

**Default Login:**
- Username: `admin`
- Password: `1234` (Change immediately after first login!)

**For other installation methods (Docker Compose, Build from Source, Manual), please see the [[Installation]] page on the wiki.**

## 🔧 Configuration & Usage

After installation, you'll need to connect your media services and set up an AI provider.

- **[[Connecting Services]]**: Connect Sonarr, Radarr, Plex, Jellyfin, Tautulli, Trakt.
- **[[AI Service Setup]]**: Configure OpenAI, Ollama, LM Studio, or other compatible services.
- **[[Authentication Setup]] (Optional)**: Set up OAuth login with Google, GitHub, etc.
- **[[Usage]]**: Learn how to generate recommendations.

## 🌐 Advanced Setup

- **[[Reverse Proxy Setup]]**: Run Recommendarr securely behind Nginx, Traefik, etc.
- **[[Environment Variables]]**: Full list of configuration options.

## 🔧 Troubleshooting

Encountering issues? Check the [[Troubleshooting]] page on the wiki for common problems and solutions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Vue.js](https://vuejs.org/)
- [Sonarr](https://sonarr.tv/)
- [Radarr](https://radarr.video/)
- [Plex](https://www.plex.tv/)
- [Jellyfin](https://jellyfin.org/)
- [Tautulli](https://tautulli.com/)
- [Trakt](https://trakt.tv/)
- [OpenRouter](https://openrouter.ai/docs/quickstart)
