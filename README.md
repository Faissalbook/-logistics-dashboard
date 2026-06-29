# Triboo Social Kit

A modern, mobile-first social media starter — feed, stories, posts, comments,
profiles, notifications and discovery — built with React, Vite, Tailwind and
Framer Motion on a lightweight Express API with mock data.

## Features

- Feed with stories, posts, likes, comments, shares, saves
- Explore with search, trending tags, suggested users, post grid
- Create flow with gradient cover picker and tag input
- Activity feed (likes, follows, comments, mentions) with read state
- Profiles with stats, bio, follow/unfollow, post grid, tabs
- Light & dark mode (persisted)
- Persistent likes, saves and follows via Zustand + localStorage
- Smooth motion via Framer Motion
- Toast feedback via react-hot-toast
- Mobile-first responsive layout with safe-area aware bottom nav

## Quick Start

```bash
npm run install:all
cp .env.example .env
npm run dev
```

- Client: http://localhost:5173
- API:    http://localhost:3001

## Production Build

```bash
npm run build   # builds client into client/dist
npm start       # serves everything from Express on port 3001
```

## Tech Stack

| Layer    | Tech                                            |
|----------|-------------------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion     |
| State    | Zustand (persisted to localStorage)             |
| Routing  | React Router v6                                 |
| Backend  | Node.js, Express                                |
| Data     | JSON mock store (`server/data/`)                |

## API Endpoints

| Method | Path                          | Purpose                          |
|--------|-------------------------------|----------------------------------|
| GET    | `/api/posts`                  | Feed (newest first)              |
| POST   | `/api/posts`                  | Create a post                    |
| GET    | `/api/posts/:id`              | Single post                      |
| POST   | `/api/posts/:id/like`         | Toggle like                      |
| GET    | `/api/posts/:id/comments`     | List comments                    |
| POST   | `/api/posts/:id/comments`     | Add a comment                    |
| GET    | `/api/users`                  | All users                        |
| GET    | `/api/users/:username`        | Profile + posts                  |
| GET    | `/api/notifications`          | Activity feed                    |
| POST   | `/api/notifications/read`     | Mark all read                    |
| GET    | `/api/trending`               | Trending tags                    |
| GET    | `/api/stories`                | Stories bar                      |
| GET    | `/api/health`                 | Health check                     |

## Environment Variables

```env
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```
