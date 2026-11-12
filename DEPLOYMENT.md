# MAFIA PRO — Production Deployment Guide

This guide covers deploying **MAFIA PRO** with a persistent Node.js + Express + Socket.IO backend, PostgreSQL (Supabase or managed Postgres), HTTPS/WSS, and optional WebRTC voice chat.

---

## 1. Architecture Overview

- **Frontend**: React + Vite SPA (`npm run build` outputs `dist/`)
- **Backend**: Node.js + TypeScript (`server.ts` / `src/server/createAppServer.ts`) serving both REST (`/api/*`), Socket.IO (`/socket.io/*`), and static `dist/` in production.
- **Database**: PostgreSQL (via `DATABASE_URL`) + `supabase/migrations/001_initial_schema.sql`.
- **Voice Chat**: WebRTC peer-to-peer mesh with STUN (`stun:stun.l.google.com:19302`) and Socket.IO signaling.

> **Important:** Do **not** deploy the backend to serverless functions (e.g., Vercel Serverless / AWS Lambda), because Socket.IO rooms, phase timers, and WebRTC signaling require a **persistent long-running Node.js process**.

---

## 2. Database Setup (Supabase / PostgreSQL)

1. Create a PostgreSQL database (e.g., Supabase, Neon, Railway Postgres, or Cloud SQL).
2. Run the SQL migration in `supabase/migrations/001_initial_schema.sql` using the Supabase SQL Editor or `psql`:
   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/001_initial_schema.sql
   ```
3. Copy your PostgreSQL connection string (`DATABASE_URL`).

---

## 3. Environment Variables

Configure the following environment variables on your hosting provider:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=<generate-64-char-random-hex>
DATABASE_URL=postgresql://user:password@host:5432/postgres
CORS_ORIGIN=https://your-domain.com
# Only needed if frontend is hosted separately from backend:
VITE_SOCKET_URL=https://api.your-domain.com
```

---

## 4. Option A: Single-Service Persistent Deployment (Recommended)

Deploy the full-stack app to **Railway**, **Render**, **Fly.io**, or a **VPS (Ubuntu + PM2 + Nginx)**:

1. **Build command**:
   ```bash
   npm install && npm run build
   ```
2. **Start command**:
   ```bash
   npm start
   ```
3. **Health check endpoint**: `GET /api/health` (returns `{ ok: true, db: "postgres" | "local", activeRooms, uptime }`).

### Nginx Reverse Proxy (for VPS with HTTPS & WSS)

If hosting on a VPS with Certbot/Let's Encrypt SSL, ensure WebSocket upgrade headers are forwarded:

```nginx
server {
    listen 443 ssl http2;
    server_name mafiapro.uz;

    ssl_certificate /etc/letsencrypt/live/mafiapro.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mafiapro.uz/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

---

## 5. Option B: Split Frontend (Vercel/Netlify) + Backend (Railway/Render)

1. Deploy the backend repository to Railway/Render with `npm start` and set `CORS_ORIGIN=https://your-frontend.vercel.app`.
2. Deploy the frontend to Vercel/Netlify with build command `npm run build`, output directory `dist`, and environment variable `VITE_SOCKET_URL=https://your-backend.up.railway.app`.
3. Note: REST API calls (`/api/*`) also need a rewrite/proxy in `vercel.json` or `VITE_SOCKET_URL` pointing to the backend if hosted separately. Single-service deployment avoids CORS and proxy complexity.

---

## 6. Multi-Device Verification Checklist

Before declaring production readiness:
1. Verify `GET /api/health` returns `200 OK` and `db: "postgres"`.
2. Open the deployed HTTPS URL on **5+ independent devices** (phones + desktops).
3. Create a room on Device 1, copy the `?room=CODE` invite link, and join from Devices 2–5.
4. Start a match and confirm:
   - Each device sees only its own secret role.
   - Countdown timers stay synchronized.
   - Toggling airplane mode / refreshing on one device reconnects and restores state.
   - Microphone & WebRTC voice chat work over HTTPS.
