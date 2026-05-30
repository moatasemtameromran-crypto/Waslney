# Waslney Admin Dashboard Update — Integration Guide

## What's included

```
backend/
  server.js           ← Updated (replace your existing backend/server.js)
  migrate.js          ← Updated (replace your existing backend/migrate.js)
  routes/
    shuttle-stops.js
    shuttle-routes.js
    shuttle-vehicles.js
    shuttle-fares.js
    shuttle-trips.js
    shuttle-passes.js
    promotions.js
    holidays.js
    cancellation.js
    pushes.js
    admin-settings.js
    admin-dashboard.js
    managers.js
    roles.js
    operational-cities.js
    vehicle-types.js
    driver-doc-types.js
    suggested-routes.js
    delete-requests.js

frontend/
  src/pages/admin/AdminDash.jsx  ← Replace your existing AdminDash.jsx
```

---

## Step-by-step integration

### 1. Copy backend route files
Copy all files from `backend/routes/` into your project's `backend/routes/` folder.

### 2. Replace server.js
Replace `backend/server.js` with the new version. It registers all the new routes:
```
/api/shuttle/stops
/api/shuttle/routes
/api/shuttle/vehicles
/api/shuttle/fares
/api/shuttle/trips
/api/shuttle/passes
/api/promotions
/api/holidays
/api/cancellation
/api/pushes
/api/admin/settings
/api/admin/dashboard
/api/managers
/api/roles
/api/cities
/api/vehicle-types
/api/driver-doc-types
/api/suggested-routes
/api/delete-requests
```

### 3. Replace migrate.js
Replace `backend/migrate.js` with the new version. On the next server start it will
automatically create all new tables (safe to run multiple times):

**New tables created:**
- `operational_cities`
- `shuttle_stops`
- `shuttle_routes` + `shuttle_route_stops`
- `shuttle_vehicle_types` + `vehicle_type_documents`
- `shuttle_vehicles`
- `shuttle_fares`
- `cancellation_policies` + `cancellation_thresholds`
- `cancellation_reasons`
- `promotions` + `promo_usages`
- `holidays`
- `shuttle_passes`
- `shuttle_trips` + `shuttle_trip_bookings`
- `push_notifications`
- `general_settings`
- `city_settings`
- `homescreen_items`
- `admin_managers`
- `roles` + `role_permissions`
- `driver_doc_types`
- `suggested_routes`
- `delete_account_requests`

### 4. Replace AdminDash.jsx
Replace `frontend/src/pages/admin/AdminDash.jsx` with the new version.

> **Note:** If your project uses `frontend/pages/admin/AdminDash.jsx` (Next.js style without `src/`),
> place it there instead.

### 5. Run the server
```bash
cd backend
npm start
```
The migrations run automatically on startup.

---

## New admin sections

| Section | URL |
|---|---|
| Dashboard (stats + charts) | `/api/admin/dashboard` |
| Shuttle Stops | `/api/shuttle/stops` |
| Shuttle Routes | `/api/shuttle/routes` |
| Shuttle Vehicles | `/api/shuttle/vehicles` |
| Shuttle Fare | `/api/shuttle/fares` |
| Shuttle Trips | `/api/shuttle/trips` |
| Shuttle Pass | `/api/shuttle/passes` |
| Promotions | `/api/promotions` |
| Suggested Routes | `/api/suggested-routes` |
| Holiday Calendar | `/api/holidays` |
| Cancellation Policies | `/api/cancellation/policies` |
| Cancellation Reasons | `/api/cancellation/reasons` |
| Push Notifications | `/api/pushes` |
| General Settings | `/api/admin/settings/general` |
| City Settings | `/api/admin/settings/city/:id` |
| HomeScreen | `/api/admin/settings/homescreen/:city_id` |
| Managers | `/api/managers` |
| Roles & Permissions | `/api/roles` |
| Operational Cities | `/api/cities` |
| Vehicle Types | `/api/vehicle-types` |
| Driver Document Types | `/api/driver-doc-types` |
| Delete Account Requests | `/api/delete-requests` |

---

## Notes
- All routes require `Authorization: Bearer <token>` and `role = 'admin'`
- The default operational city (Cairo, id=1) is auto-seeded
- The default Super Admin role (id=1) is auto-seeded
- Push notifications write to the existing `notifications` table for delivery
- The existing trips/bookings/users/drivers systems are untouched
