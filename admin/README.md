# Waslney Admin Panel (standalone)

A standalone admin dashboard for Waslney. React + Vite frontend and an
Express + mysql2 API server, packaged as a **single service** (the API server
serves the built frontend). It talks to the **same MySQL database** as the main
Waslney app.

## Structure
- `admin-panel/` — React + TypeScript + Vite + Tailwind frontend.
- `api-server/`  — Express + mysql2 API at `/api/admin/*`.
- `Dockerfile`   — builds both and runs one service.

## Features
Dashboard, Shuttle (Stops/Routes/Vehicles/Fare/Trips/Passes), Analytics,
Promotions, Suggested Routes, Holidays, Users (Customers/Drivers/Delete/Docs),
Trips, Vehicle Types, Cancellation, Cities, HomeScreen, Pushes, Settings —
**plus** the Waslney operations tabs: **Create Trip, Tenders, Driver Review,
New Account, Manage Bookings**.

## Environment variables
| Var | Required | Notes |
|-----|----------|-------|
| `PORT` | yes | Railway sets this automatically. |
| `JWT_SECRET` | yes | Must be a strong secret. Used to sign admin sessions. |
| `DATABASE_URL` or `MYSQL_PUBLIC_URL` | yes | MySQL connection URL (the Waslney DB). |
| `PUBLIC_DIR` | no | Where the built frontend lives. Docker sets `/app/public`. |

Admins log in with their **email** + password (a user with `role='admin'`).

## Local development
```sh
# Backend
cd api-server
npm install
PORT=4000 JWT_SECRET=dev DATABASE_URL="mysql://user:pass@host:port/db" npm run build && npm start

# Frontend (separate terminal, talks to backend via same-origin /api)
cd admin-panel
PORT=5173 npm run dev
```

For a production-style run, build the frontend, then point the API server at it:
```sh
cd admin-panel && npm install && npm run build
cd ../api-server && npm install && npm run build
PORT=4000 PUBLIC_DIR="../admin-panel/dist/public" \
  JWT_SECRET=... DATABASE_URL="mysql://..." node dist/index.mjs
```

## Deploy on Railway
1. Push this folder to a GitHub repo.
2. Create a new Railway service from the repo (it auto-detects the `Dockerfile`).
3. Set `JWT_SECRET` and `DATABASE_URL` (or `MYSQL_PUBLIC_URL`). `PORT` is automatic.
4. Open the generated URL and log in with an admin email + password.
