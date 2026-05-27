# Waslney → Railway Deployment Guide

## What this setup does
One Railway service runs everything:
- Dockerfile builds the React frontend (Vite → backend/public)
- Express serves the built frontend as static files
- Express serves all /api/* routes
- Socket.io works on the same port
- Your existing Hostinger MySQL stays as-is (no migration needed)

---

## Step 1 — Prepare your repo

Add the 3 files from this folder to the ROOT of your project:
- `Dockerfile`          ← replace your existing one
- `railway.toml`        ← new file
- `.dockerignore`       ← new file

Your folder structure should look like:
```
Waslney/
├── Dockerfile          ← updated
├── railway.toml        ← new
├── .dockerignore       ← new
├── backend/
│   ├── server.js
│   ├── .env            ← keep locally, DO NOT push to GitHub
│   └── ...
└── frontend/
    ├── vite.config.js
    └── ...
```

Make sure `.env` is in your `.gitignore` so passwords don't go to GitHub.

---

## Step 2 — Push to GitHub

```bash
git add Dockerfile railway.toml .dockerignore
git commit -m "Add Railway deployment config"
git push
```

---

## Step 3 — Create Railway project

1. Go to https://railway.app and log in
2. Click **New Project**
3. Choose **Deploy from GitHub repo**
4. Select your Waslney repo
5. Railway will auto-detect the Dockerfile and start building

---

## Step 4 — Set environment variables

In Railway → your service → **Variables** tab, add:

| Key | Value |
|-----|-------|
| DB_HOST | your Hostinger DB host (e.g. srv1234.hstgr.io) |
| DB_USER | u946447529_Moatasem |
| DB_PASS | your actual DB password |
| DB_NAME | u946447529_Wasalney |
| DB_PORT | 3306 |
| JWT_SECRET | (generate: openssl rand -base64 32) |
| JWT_EXPIRES | 7d |
| MAIL_USER | support@waslney.com |
| MAIL_PASS | your email password |
| NODE_ENV | production |

⚠️  Do NOT add PORT — Railway sets it automatically.

---

## Step 5 — Allow Railway IP on Hostinger

Your Hostinger MySQL must allow connections from Railway's servers.

1. Log into Hostinger → Hosting → Databases → Remote MySQL
2. Add `%` (wildcard) OR Railway's IP range
   - Railway's outbound IPs change — using `%` is easiest for now
   - For production, use Railway's static IP add-on (~$3/mo) for a fixed IP

---

## Step 6 — Get your public URL

1. Railway → your service → **Settings** tab
2. Under **Networking** → click **Generate Domain**
3. You'll get a URL like: `https://waslney-production.up.railway.app`

That's your live app. Share it!

---

## Step 7 — Verify it works

Visit these URLs after deploy:
- `https://your-app.up.railway.app/api/health` → should return `{"status":"ok"}`
- `https://your-app.up.railway.app` → should show your landing page

---

## Troubleshooting

**Build fails — "vite: not found"**
→ Make sure `frontend/package.json` has vite in devDependencies (it does ✓)

**"MySQL connection failed"**
→ Check your DB_HOST value. In Hostinger it's under Hosting → Databases → the hostname shown there (NOT localhost)
→ Make sure Remote MySQL is enabled on Hostinger

**Socket.io not connecting**
→ Your socket.js already uses `io('/')` which is correct for same-domain deploys ✓
→ Railway supports WebSockets natively, no extra config needed

**App loads but shows blank page**
→ Check Railway logs for Express errors
→ Make sure `backend/public/index.html` exists after build (vite.config.js outputs there ✓)

---

## Costs

| Resource | Railway Free Tier | Notes |
|----------|------------------|-------|
| App service | $5 credit/month free | Enough for low traffic |
| MySQL | Not needed | Using your Hostinger DB |
| Custom domain | Free | Bring your own domain in Settings |
| Static IP | ~$3/mo add-on | Only needed if Hostinger requires fixed IP |
