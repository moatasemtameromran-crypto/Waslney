
try { require('dotenv').config(); } catch(e) {}
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST','PUT','DELETE'] }
});

// ── MIDDLEWARE ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── EXISTING API ROUTES ───────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/trips',         require('./routes/trips'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/checkins',      require('./routes/checkins'));
app.use('/api/ratings',       require('./routes/ratings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/location',      require('./routes/location'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/geocode',       require('./routes/geocode'));
app.use('/api/pool',          require('./routes/pool'));
app.use('/api/saved-points',  require('./routes/saved_points'));
app.use('/api/tender',        require('./routes/tender'));

// ── NEW SHUTTLE ADMIN ROUTES ──────────────────────────────
app.use('/api/shuttle/stops',    require('./routes/shuttle-stops'));
app.use('/api/shuttle/routes',   require('./routes/shuttle-routes'));
app.use('/api/shuttle/vehicles', require('./routes/shuttle-vehicles'));
app.use('/api/shuttle/fares',    require('./routes/shuttle-fares'));
app.use('/api/shuttle/trips',    require('./routes/shuttle-trips'));
app.use('/api/shuttle/passes',   require('./routes/shuttle-passes'));

// ── NEW ADMIN MANAGEMENT ROUTES ───────────────────────────
app.use('/api/promotions',         require('./routes/promotions'));
app.use('/api/holidays',           require('./routes/holidays'));
app.use('/api/cancellation',       require('./routes/cancellation'));
app.use('/api/pushes',             require('./routes/pushes'));
app.use('/api/admin/settings',     require('./routes/admin-settings'));
app.use('/api/admin/dashboard',    require('./routes/admin-dashboard'));
app.use('/api/managers',           require('./routes/managers'));
app.use('/api/roles',              require('./routes/roles'));
app.use('/api/cities',             require('./routes/operational-cities'));
app.use('/api/vehicle-types',      require('./routes/vehicle-types'));
app.use('/api/driver-doc-types',   require('./routes/driver-doc-types'));
app.use('/api/suggested-routes',   require('./routes/suggested-routes'));
app.use('/api/delete-requests',    require('./routes/delete-requests'));

// ── SOCKET.IO REAL-TIME TRACKING ──────────────────────────
require('./socket/tracking')(io);

// ── HEALTH CHECK ──────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── SERVE FRONTEND BUILD ──────────────────────────────────
const DIST = path.join(__dirname, '../artifacts/waslney/dist/public');
app.use(express.static(DIST));

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// ── EXPORT io so pool.js and other routes can emit socket events ──
module.exports = { io };

// ── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`\n🚐  Shuttle running on http://localhost:${PORT}`);
  console.log(`🔌  Socket.io ready for real-time tracking`);
  console.log(`📦  API: http://localhost:${PORT}/api/health\n`);

  try {
    await require('./migrate')();
  } catch (e) {
    console.error('Migration error:', e.message);
  }
});
