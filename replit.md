# Waslney

Shared-ride shuttle app for Cairo — passengers book seats on fixed routes, drivers manage trips, and admins oversee the platform.

## Run & Operate

- Frontend workflow: `artifacts/waslney: web` — starts automatically (port 22593 → proxy 80)
- API Server workflow: `artifacts/api-server: API Server` — admin backend (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `node scripts/create_admin.js` — create/reset admin account (needs DB env vars)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/waslney/`)
- Passenger/Driver/Company API: `https://api.waslney.com/api` — external MySQL + Express backend
- Admin API: local Express server at `artifacts/api-server/` — connects to same Railway MySQL DB
- Real-time: Socket.io connecting to `https://api.waslney.com`
- Maps: Leaflet / React-Leaflet with Photon geocoding
- Font: Sora (Google Fonts), black/yellow Waslney theme

## Where things live

- `artifacts/waslney/src/App.jsx` — root component, auth context, role-based routing
- `artifacts/waslney/src/api.js` — REST helpers for passenger/driver/company (→ api.waslney.com)
- `artifacts/waslney/src/api_admin.js` — REST helpers for all admin routes (→ local /api/admin/*)
- `artifacts/waslney/src/api_tender.js` — company/tender API helpers
- `artifacts/waslney/src/socket.js` — Socket.io client (connects to external server)
- `artifacts/waslney/src/pages/Landing.jsx` — public landing / login / register
- `artifacts/waslney/src/pages/passenger/PassengerDash.jsx` — passenger dashboard
- `artifacts/waslney/src/pages/driver/DriverDash.jsx` — driver dashboard
- `artifacts/waslney/src/pages/admin/AdminDash.jsx` — admin dashboard (uses api_admin.js)
- `artifacts/waslney/src/pages/company/CompanyDash.jsx` — bus company portal
- `artifacts/waslney/src/components/UI.jsx` — shared Waslney design system
- `artifacts/waslney/src/components/TripMap.jsx` — Leaflet map component
- `artifacts/api-server/src/lib/db.ts` — MySQL connection pool (uses DB_PUBLIC_HOST + DB_PORT)
- `artifacts/api-server/src/lib/adminAuth.ts` — JWT admin auth middleware
- `artifacts/api-server/src/routes/admin/` — 21 admin route files

## Admin Backend API Routes

All routes are prefixed `/api/admin/` and require `Authorization: Bearer <token>` except `/auth/login`.

| Path | Description |
|------|-------------|
| `POST /auth/login` | Login → returns JWT |
| `GET /dashboard/stats` | Overview counts & recent activity |
| `GET/PUT /analytics/*` | Bookings, driver trips, ratings, summary |
| `GET/POST/PUT/DELETE /users` | Manage all users |
| `GET/POST/PUT/DELETE /trips` | Manage trips |
| `GET/POST/PUT/DELETE /promotions` | Promo codes |
| `GET/POST/DELETE /holidays` | Holidays calendar |
| `GET/POST/PUT/DELETE /cities` | Operational cities |
| `GET/POST/PUT/DELETE /cancellation/policies` | Cancellation policies |
| `GET/POST/PUT/DELETE /cancellation/reasons` | Cancellation reasons |
| `GET/POST/PUT/DELETE /vehicle-types` | Vehicle type definitions |
| `GET/POST/PUT/DELETE /vehicles` | Fleet vehicles |
| `GET/POST/PUT/DELETE /shuttle-routes` | Shuttle routes |
| `GET/POST/PUT/DELETE /stops` | Shuttle stops |
| `GET/POST/PUT/DELETE /shuttle-trips` | Scheduled shuttle trips |
| `GET/POST/PUT/DELETE /fare` | Fare rules |
| `GET/POST/PUT/DELETE /shuttle-pass` | Shuttle passes |
| `POST /pushes/send` | Send push notifications |
| `GET/POST/PUT/DELETE /homescreen` | Homescreen settings |
| `GET/PUT /suggested-routes` | User-suggested routes |
| `GET/POST/PUT/DELETE /driver-documents` | Driver document types |
| `GET/PUT /settings` | App settings (general + city) |

## Admin Account

- **Email**: `admin@waslney.com`
- **Password**: `Admin@Waslney2025`
- Login via the **Admin portal** button on the landing page

## Environment Variables (Secrets)

- `DB_HOST` — Railway private host (not used directly)
- `DB_PUBLIC_HOST` — `zephyr.proxy.rlwy.net` (public Railway MySQL proxy)
- `DB_PORT` — `25153`
- `DB_USER`, `DB_PASS`, `DB_NAME` — MySQL credentials
- `JWT_SECRET` — optional, defaults to built-in secret (set in production!)

## Architecture decisions

- The app calls an external production API (`https://api.waslney.com`) for passenger/driver flows.
- Admin API calls go to the local api-server via Vite proxy (`/api → localhost:8080`).
- Socket.io connects directly to the external API server for real-time tracking.
- Company portal uses path-based routing (`/company`) handled in App.jsx.
- All styling uses inline styles (Waslney design system) — no Tailwind in app components.
- Admin route tables auto-create if they don't exist (CREATE TABLE IF NOT EXISTS).

## Gotchas

- DB connection uses `DB_PUBLIC_HOST` (zephyr.proxy.rlwy.net) + `DB_PORT` (25153), NOT the private Railway internal host.
- Socket.io must point to `https://api.waslney.com` (not `/`) since there's no local WS server.
- `window.location.href = '/company'` in Landing.jsx is intentional — CompanyDash is path-routed.
- Admin tables (promotions, holidays, etc.) are auto-created on first request — no migration needed.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
