<div align="center">

# &nbsp;ROOMI&nbsp;

### The Aux, Democratized.

**Real-time shared music rooms where everyone controls the queue.**

Create a room. Share a code. Let the crowd decide what plays next.

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io)](https://socket.io)
[![Spotify](https://img.shields.io/badge/Spotify_API-1DB954?style=flat-square&logo=spotify&logoColor=white)](https://developer.spotify.com)
[![YouTube Music](https://img.shields.io/badge/YouTube_Music-FF0000?style=flat-square&logo=youtube-music&logoColor=white)](https://music.youtube.com)

---

</div>

## The Problem

Group music is broken. At every house party, hostel lounge, or college event, one person holds the aux hostage. Guests shout requests across the room, pass a phone around, or silently endure bad picks. The vibe dies not because of the music — but because of the process.

## The Fix

**Roomi turns the speaker into a shared experience.**

A host creates a room, connects their Spotify or YouTube Music, and shares a 6-character code. Guests scan a QR or punch in the code from their own phones — no app download, no account needed. Everyone adds songs, votes on the queue, and watches it update in real time. The host stays in control. The crowd gets a voice.

<br>

<div align="center">

```
  Host connects Spotify / YouTube Music
              |
              v
     Creates a room (6-char code)
              |
     Shares code or QR with guests
              |
     ┌────────┴────────┐
     v                 v
  Guests join       Guests join
  (open room)     (locked → approval)
     |                 |
     └────────┬────────┘
              v
   Search songs → Add to queue → Vote
              |
              v
     Live updates via Socket.io
     Queue reorders. Music plays.
              |
              v
    "Listen Along" mode (YouTube rooms)
    Guests hear synced audio on their device
```

</div>

<br>

## Features

<table>
<tr>
<td width="50%">

**For Hosts**
- Connect via Spotify or YouTube Music
- Create rooms with a single click
- Share via 6-character code or QR
- Lock rooms and approve guests
- Full playback controls (play, pause, skip, seek)
- Enable "Listen Along" so guests hear music on their own devices
- Kick disruptive guests
- End sessions cleanly

</td>
<td width="50%">

**For Guests**
- Join instantly — no account required
- Search the full Spotify / YouTube catalog
- Add songs to the shared queue
- Upvote tracks to influence order
- Listen along — hear synced audio on your own device (YouTube rooms)
- See live queue, votes, and now-playing
- Independent volume and mute controls
- Real-time updates, no refresh needed
- Works on any device with a browser

</td>
</tr>
</table>

<br>

**Under the Hood**
- Dual provider support — Spotify (Premium) or YouTube Music (free)
- "Listen Along" mode — guests hear synced audio on their own device (YouTube rooms)
- Animated vinyl disc player with cyberpunk/aurora/midnight/amber themes
- Skip vote and kick vote toasts for democratic moderation
- Co-host system — grant trusted guests elevated permissions
- Equalizer bars and tonearm animations synced to playback state
- Glassmorphic dark UI with smooth modal transitions
- Mobile-first responsive design with safe-area support

<br>

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSERS                          │
│                    (Host + Guest devices)                        │
│                                                                 │
│   Next.js App ──── Spotify Web Playback SDK (host)              │
│        │           YouTube IFrame Player (host or guest)         │
│        │                                                        │
└────────┼────────────────────────────────────────────────────────┘
         │  REST (mutations)              WebSocket (live state)
         │                                        │
┌────────▼──────────────────┐   ┌─────────────────▼───────────────┐
│   Next.js API Routes      │──▶│   Express + Socket.io Backend   │
│   (Auth, Search, Room)    │   │   (Room store, state, events)   │
└───────────────────────────┘   └─────────────────────────────────┘
         │                                        │
         ▼                                        ▼
   Spotify / YouTube              In-memory room store
   OAuth + Web API               (queue, votes, guests)
```

**Two independently deployable services:**

| Service | Stack | Deploys to |
|---------|-------|------------|
| `roomi/frontend` | Next.js 16, React 19, TypeScript, Tailwind CSS 4 | Vercel |
| `roomi/backend` | Express 5, Socket.io 4, TypeScript | Render |

<br>

## Quick Start

### Prerequisites

- **Node.js 22+** and npm
- A **[Spotify Developer](https://developer.spotify.com/dashboard)** app (client ID + secret) — for Spotify rooms
- A **Spotify Premium** account (required for Web Playback SDK on host)
- A **[Google Cloud](https://console.cloud.google.com)** project with OAuth 2.0 credentials + YouTube Data API v3 enabled — for YouTube rooms

### 1. Clone & Install

```bash
git clone https://github.com/your-username/Roomi.git
cd Roomi

# Install both services
cd roomi/backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** — create `roomi/backend/.env`:

```env
PORT=4001
CORS_ORIGIN=http://127.0.0.1:3000
```

**Frontend** — create `roomi/frontend/.env.local`:

```env
# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback

# Google OAuth + YouTube (optional, for YouTube rooms)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
YOUTUBE_API_KEY=your_youtube_api_key

# Session
SESSION_PASSWORD=a_random_string_at_least_32_characters

# Backend connection
NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:4001
BACKEND_URL=http://127.0.0.1:4001
```

> **Important:** Add `http://127.0.0.1:3000/api/auth/callback` as a redirect URI in your Spotify Developer Dashboard. For Google, add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI in Google Cloud Console (Google accepts `localhost` but not `127.0.0.1` for OAuth origins).

### 3. Run

```bash
# Terminal 1 — Backend
cd roomi/backend
npm run dev

# Terminal 2 — Frontend
cd roomi/frontend
npm run dev
```

Open **http://127.0.0.1:3000** and you're live.

<br>

## Production Deployment

<details>
<summary><strong>Render (Backend)</strong></summary>

Deploy `roomi/backend` as a Render Web Service:

- **Root directory:** `roomi/backend`
- **Build command:** `npm ci && npm run build`
- **Start command:** `npm start`
- **Health check:** `/health`
- **Environment:**
  - `CORS_ORIGIN=https://your-vercel-app.vercel.app`

Render provides `PORT` automatically.

</details>

<details>
<summary><strong>Vercel (Frontend)</strong></summary>

Deploy `roomi/frontend` as the Vercel project:

- **Root directory:** `roomi/frontend`
- **Framework preset:** Next.js
- **Environment:**
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `SPOTIFY_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback`
  - `YOUTUBE_API_KEY`
  - `SESSION_PASSWORD` (32+ random characters)
  - `NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com`
  - `BACKEND_URL=https://your-backend.onrender.com`

Add the production callback URLs to both Spotify Developer Dashboard and Google Cloud Console.

</details>

<br>

## Roadmap

| Priority | Feature |
|----------|---------|
| **Next** | Persistent storage (Redis/PostgreSQL) for room state across restarts |
| **Next** | Smart moderation — vote thresholds, auto-skip, duplicate cooldowns |
| **Soon** | Spotify "Listen Along" — synchronized guest playback for Spotify Premium users |
| **Soon** | BPM/energy-aware queue suggestions for smoother transitions |
| **Later** | Post-session analytics — top contributors, mood trends, playlist export |
| **Later** | PWA with installable flow, haptic feedback, lock-screen controls |
| **Later** | Horizontal scaling with shared state for large venues |

<br>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Lucide Icons |
| Language | TypeScript 5 |
| Auth | Spotify OAuth, Google OAuth, Iron Session |
| Music | Spotify Web API + Playback SDK, YouTube Data API v3 + IFrame Player |
| Real-time | Socket.io 4, Express 5 |
| State | In-memory room store with TTL |
| QR | `qrcode` with custom SVG rendering |

<br>

<div align="center">

---

**Built for parties. Powered by the crowd.**

</div>
