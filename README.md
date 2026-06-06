# osu!Hub

<p align="center">
  <a href="https://osu-improvement-companion.vercel.app">
    <img src="https://img.shields.io/badge/Frontend-Vercel-000?logo=vercel" alt="Frontend Deployment" />
  </a>
  <a href="https://osu-hub-auth.onrender.com">
    <img src="https://img.shields.io/badge/Backend-Render-000?logo=render" alt="Backend Deployment" />
  </a>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/OAuth%202.0-osu!-FF66AA?logo=osu&logoColor=white" alt="OAuth 2.0" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" />
</p>

<p align="center">
  A professional companion tool for osu! players to track improvement, analyze performance, and manage practice sessions through secure osu! OAuth integration.
</p>

---

## Overview

osu!Hub is a full-stack web application designed to help osu! players systematically improve their skills. The platform combines secure authentication with osu! accounts, real-time profile tracking, and specialized tools for practice planning, replay analysis, and community discovery.

Built with a modern React frontend and a lightweight Express backend, osu!Hub handles the complete OAuth 2.0 flow with osu!, provides a CORS-enabled proxy to the osu! API v2, and delivers a responsive single-page application experience.

---

## Features

### Authentication
Secure OAuth 2.0 integration with osu! accounts. Session management via HTTP-only, secure cookies with automatic token refresh.

### Dashboard
Personalized overview displaying key statistics, recent activity, and quick access to improvement tools.

### PP Goal Tracker
Set and monitor performance point targets. Track progress against specific beatmaps and visualize improvement trajectories.

### Practice Planner
Structured practice session management. Create custom routines, schedule beatmaps, and track consistency over time.

### Replay Analyzer
Deep-dive performance analysis. Upload and parse replays to identify accuracy patterns, consistency issues, and technical weaknesses.

### Community Finder
Discover players with similar skill levels and playstyles. Connect with the community for multiplayer sessions and advice.

### Map Recommendations
Intelligent beatmap suggestions based on current skill level, weak areas, and improvement goals.

### Skin Manager
Organize and preview osu! skins. Quick switching and metadata management for custom skin collections.

### API Integration
Full proxy access to osu! API v2 with automatic authentication handling, enabling seamless data fetching for all features.

---

## Tech Stack

| Category | Technologies |
| -------- | ------------ |
| **Frontend** | React 19, Vite 7, React Router 6, React Icons |
| **Backend** | Node.js, Express, cookie-parser, cors, dotenv |
| **Authentication** | osu! OAuth 2.0, Secure HTTP-only Cookies |
| **Deployment** | Vercel (Frontend), Render (Backend) |
| **Development** | Concurrently, ESLint, ES Modules |

---

## Installation

### Prerequisites
- Node.js 18+
- npm 9+
- osu! OAuth Application ([Create one here](https://osu.ppy.sh/home/account/edit#new-oauth-application))

### Setup

```bash
# Clone the repository
git clone https://github.com/monogutsy/osu-improvement-companion.git
cd osu-improvement-companion

# Install all dependencies (frontend + backend)
npm run install:all
```

---

## Configuration

Create a `.env` file in the `server/` directory:

```env
# osu! OAuth Credentials (required)
OSU_CLIENT_ID=your_numeric_client_id
OSU_CLIENT_SECRET=your_client_secret
OSU_REDIRECT_URI=http://localhost:4000/api/auth/callback

# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
TRUST_PROXY=false
SERVE_STATIC=false
```

| Variable | Description | Required |
| -------- | ----------- | -------- |
| `OSU_CLIENT_ID` | Numeric osu! OAuth client ID | Yes |
| `OSU_CLIENT_SECRET` | osu! OAuth client secret | Yes |
| `OSU_REDIRECT_URI` | OAuth callback URL | Yes |
| `FRONTEND_ORIGIN` | Frontend URL for CORS and redirects | Yes |
| `PORT` | Backend server port (default: 4000) | No |
| `NODE_ENV` | Environment: `development` or `production` | No |
| `TRUST_PROXY` | Trust proxy headers (set `true` on Render) | No |
| `SERVE_STATIC` | Serve frontend build from backend (`true`/`false`) | No |

---

## Running Locally

### Development Mode
Runs both frontend (Vite dev server) and backend (Node with file watching) concurrently:

```bash
npm run dev
```

| Service | URL |
| ------- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:4000 |
| Health Check | http://localhost:4000/api/health |

### Production Build
```bash
# Build frontend assets
npm run build

# Start production backend
npm run start:api
```

---

## Project Structure

```
osu-improvement-companion/
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── index.html
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── robots.txt
├── scripts/                    # Utility scripts
│   └── health-check.js
├── server/                     # Express backend
│   ├── index.js                # Entry point & routes
│   ├── startup.js              # Config validation & boot
│   ├── package.json
│   └── package-lock.json
├── src/                        # React frontend
│   ├── assets/                 # Images, fonts, icons
│   ├── components/             # Reusable UI components
│   │   ├── layout/             # Layout components (Sidebar, TopBar, etc.)
│   │   ├── shared/             # Shared components (StatCard, Modal, etc.)
│   │   └── ui/                 # Base UI primitives (Button, Input, Card, etc.)
│   ├── context/                # React Context providers
│   ├── data/                   # Static data & constants
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Page components (routes)
│   │   ├── AuthCallback.jsx
│   │   ├── BeatmapPlanner.jsx
│   │   ├── CommunityFinder.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Landing.jsx
│   │   ├── MapRecommendations.jsx
│   │   ├── PPTracker.jsx
│   │   ├── ReplayAnalyzer.jsx
│   │   └── SkinManager.jsx
│   ├── styles/                 # Global styles & theme
│   ├── utils/                  # Utility functions
│   ├── App.jsx                 # Root component & routing
│   └── main.jsx                # Entry point
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── render.yaml                 # Render deployment config
└── vercel.json                 # Vercel deployment config
```

---

## API Endpoints

### System & Diagnostics
| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/health` | Basic service status and uptime |
| `GET` | `/api/ready` | Readiness probe (checks OAuth config) |
| `GET` | `/api/diagnostics` | Detailed system & upstream connectivity report |

### Authentication
| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/auth/status` | Current session authentication state |
| `GET` | `/api/auth/login` | Initiate osu! OAuth flow (redirect) |
| `GET` | `/api/auth/callback` | OAuth callback handler |
| `POST` | `/api/auth/logout` | Terminate session |

### User Data
| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/me` | Normalized profile of authenticated user |

### osu! API Proxy
| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `ANY` | `/api/osu/*` | Proxies to `https://osu.ppy.sh/api/v2/*` with auth |

---

## Deployment

| Environment | Platform | URL |
| ----------- | -------- | --- |
| **Frontend** | Vercel | <https://osu-improvement-companion.vercel.app> |
| **Backend** | Render | <https://osu-hub-auth.onrender.com> |

### Frontend (Vercel)
- Connected to `main` branch
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables configured in Vercel dashboard

### Backend (Render)
- Web Service type
- Build command: `npm run install:all`
- Start command: `npm run start:api`
- Environment variables configured in Render dashboard
- `TRUST_PROXY=true` required for correct IP handling

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built for the osu! community
</p>
