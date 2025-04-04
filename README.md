# Spotify Dashboard 🎵

<div align="center">
  <img src="./public/spotify-logo.svg" alt="Spotify Dashboard Logo" width="120" />
  <h3>A beautiful, real-time music visualization experience</h3>
  
  ![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat-square&logo=next.js)
  ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)
  ![Spotify API](https://img.shields.io/badge/Spotify-API-1DB954?style=flat-square&logo=spotify)
</div>

## ✨ Features

- **Real-time Music Dashboard**: See what's currently playing on your Spotify account
- **Beautiful Visualizations**: Dynamic audio visualizer that responds to your music
- **Adaptive UI**: UI that changes color based on the album artwork
- **Spotify Controls**: Play, pause, skip, and control your Spotify playback
- **Responsive Design**: Works on desktop and mobile devices
- **Session Management**: Secure authentication with Spotify's OAuth flow

<div align="center">
  <img src="https://i.imgur.com/xMrmGQB.png" alt="Dashboard Preview" width="80%" />
</div>

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- A [Spotify Developer Account](https://developer.spotify.com/dashboard) for API access

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/spotify-dashboard.git
cd spotify-dashboard
```

2. **Install dependencies**

```bash
npm install
# or
pnpm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory with the following:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

> 💡 You'll need to register your app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) to get these credentials.

4. **Start the development server**

```bash
npm run dev
# or
pnpm dev
```

5. **Open your browser**

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🎨 Features In-Depth

### Dynamic Audio Visualizer

The dashboard includes a custom-built audio visualizer that creates a unique waveform pattern for your music. The visualizer:

- Adapts to the current playback state (playing/paused)
- Creates organic, flowing animations
- Uses multiple layered frequencies for a natural look
- Integrates with the overall UI design

### Color Palette Extraction

The dashboard automatically extracts the dominant colors from your currently playing album artwork and uses them to create a beautiful gradient background that matches your music.

### Real-time Updates

Your playback state is synchronized in real-time, including:

- Current track information
- Playback progress
- Next track in queue
- Recently played history

### Playback Controls

Full control over your Spotify playback right from the dashboard:

- Play/Pause
- Skip forward/backward
- Toggle shuffle
- Change repeat mode
- Access to your Spotify devices

## 🧰 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Authentication**: Spotify OAuth 2.0
- **API Interaction**: REST API with fetch

## 📱 Responsive Design

The Spotify Dashboard is designed to work across multiple devices:

- **Desktop**: Full-featured experience with expanded visualizations
- **Tablet**: Optimized layout that preserves all features
- **Mobile**: Streamlined interface focusing on core playback features

## 🔧 Project Structure

```
spotify-dashboard/
├── app/               # Next.js application routes
├── components/        # Reusable UI components
├── hooks/             # Custom React hooks (player control, data fetching)
├── lib/               # Utility functions and API helpers
├── public/            # Static assets
└── styles/            # Global styles and theme
```

## 🔐 Authentication Flow

The application implements the Spotify Authorization Code flow:

1. User clicks "Connect with Spotify"
2. User grants permissions on Spotify's auth page
3. Spotify redirects back with an authorization code
4. Backend exchanges the code for access and refresh tokens
5. App uses these tokens to make API requests
6. Refresh token is used to get new access tokens as needed

## 🛠️ Development

### Adding New Features

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Running Tests

```bash
npm run test
# or
pnpm test
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Spotify Web API](https://developer.spotify.com/documentation/web-api) for providing access to music data
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- All the amazing open-source libraries that made this project possible

---

<div align="center">
  Made with ❤️ by Luke
</div> 
