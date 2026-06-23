const router = require('express').Router();
const db     = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { sendPushToUser } = require('../push');

function getIo() {
  try { return require('../server').io; } catch(_) { return null; }
}

// Ensure the seat_numbers column exists (for seat selection). Self-migrating.
let seatColReady = false;
async function ensureSeatColumn() {
  if (seatColReady) return;
  try {
    const [c] = await db.query(
      "SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bookings' AND COLUMN_NAME='seat_numbers'"
    );
    if (c[0].n === 0) await db.query("ALTER TABLE bookings ADD COLUMN seat_numbers VARCHAR(80) DEFAULT NULL");
  } catch (e) { console.error('ensureSeatColumn:', e.message); }
  seatColReady = true;
}

// Parse a stored seat_numbers string into an int array.
function parseSeats(s) {
  if (!s) return [];
  return String(s).split(',').map(x => parseInt(x.trim(), 10)).filter(n => Number.isInteger(n));
}

// Taken seat numbers for a trip on a date (from confirmed bookings).
async function takenSeats(tripId, travelDate, excludeBookingId) {
  await ensureSeatColumn();
  const params = [tripId, travelDate];
  let sql = "SELECT seat_numbers FROM bookings WHERE trip_id=? AND travel_date=? AND status='confirmed'";
  if (excludeBookingId) { sql += ' AND id<>?'; params.push(excludeBookingId); }
  const [rows] = await db.query(sql, params);
  const set = new Set();
  rows.forEach(r => parseSeats(r.seat_numbers).forEach(n => set.add(n)));
  return set;
}


// ── Booking Settings helpers ────────────────────────────────────────────────
async function getBookingSettings() {
  try {
    const [rows] = await db.query('SELECT * FROM booking_settings WHERE id = 1');
    if (rows.length) return rows[0];
  } catch(_) {}
  return { booking_round_start_day: 5, surge_percent: 10, surge_after_friday: 1 };
}

async function computePrice(basePrice, travelDate) {
  const settings = await getBookingSettings();
  if (!settings.surge_after_friday) return basePrice;
  const roundStartDay = settings.booking_round_start_day ?? 5;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayDay = today.getDay();
  const bookingMadeOnSurgeDay = (todayDay === roundStartDay || todayDay === (roundStartDay + 1) % 7);
  if (bookingMadeOnSurgeDay) {
    return Math.round(basePrice * (1 + (settings.surge_percent / 100)));
  }
  return basePrice;
}

// GET /api/bookings/settings
router.get('/settings', requireAuth, async (req, res) => {
  try { res.json(await getBookingSettings()); }
  catch(err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/bookings/settings — admin only
router.put('/settings', requireAuth, requireRole('admin'), async (req, res) => {
  const { booking_round_start_day, surge_percent, surge_after_friday } = req.body;
  try {
    await db.query(`
      INSERT INTO booking_settings (id, booking_round_start_day, surge_percent, surge_after_friday)
      VALUES (1, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        booking_round_start_day = VALUES(booking_round_start_day),
        surge_percent           = VALUES(surge_percent),
        surge_after_friday      = VALUES(surge_after_friday)
    `, [booking_round_start_day ?? 5, surge_percent ?? 10, surge_after_friday ? 1 : 0]);
    res.json({ message: 'Settings saved' });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/bookings/week-schedule?trip_id=X
router.get('/week-schedule', requireAuth, async (req, res) => {
  const { trip_id } = req.query;
  if (!trip_id) return res.status(400).json({ error: 'trip_id required' });
  try {
    const [tripRows] = await db.query('SELECT * FROM trips WHERE id = ?', [trip_id]);
    if (!tripRows.length) return res.status(404).json({ error: 'Trip not found' });
    const trip = tripRows[0];
    const today = new Date(); today.setHours(0,0,0,0);
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      if (d.getDay() === 5) continue; // skip Friday
      days.push(d.toISOString().slice(0, 10));
    }
    const schedule = [];
    for (const date of days) {
      const [[{ booked }]] = await db.query(
        "SELECT COALESCE(SUM(seats),0) AS booked FROM bookings WHERE trip_id=? AND travel_date=? AND status='confirmed'",
        [trip_id, date]
      );
      const effectivePrice = await computePrice(trip.price, date);
      const d = new Date(date);
      schedule.push({
        date, day_name: dayNames[d.getDay()],
        booked: parseInt(booked),
        available: Math.max(0, trip.total_seats - parseInt(booked)),
        total_seats: trip.total_seats,
        effective_price: effectivePrice,
        is_surge: effectivePrice > trip.price,
      });
    }
    res.json({ trip, schedule });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/bookings/seatmap?trip_id=&travel_date= — taken seats for a date
router.get('/seatmap', requireAuth, async (req, res) => {
  const { trip_id, travel_date } = req.query;
  if (!trip_id || !travel_date) return res.status(400).json({ error: 'trip_id and travel_date required' });
  try {
    const [tr] = await db.query('SELECT total_seats FROM trips WHERE id=?', [trip_id]);
    if (!tr.length) return res.status(404).json({ error: 'Trip not found' });
    const taken = await takenSeats(trip_id, travel_date);
    res.json({ total_seats: tr[0].total_seats, taken: Array.from(taken).sort((a, b) => a - b) });
  } catch (err) { console.error('seatmap:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/bookings/mine
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*,
             t.from_loc, t.to_loc, t.pickup_time, t.dropoff_time, t.date, t.price,
             t.status   AS trip_status, t.is_pool, t.driver_id,
             t.pickup_lat, t.pickup_lng, t.dropoff_lat, t.dropoff_lng,
             u.name     AS driver_name, u.car AS driver_car, u.plate AS driver_plate,
             c.status   AS checkin_status,
             -- Dispatch batch info (overrides trip driver when batch is assigned)
             dbt.status          AS batch_status,
             dbt.driver_name     AS batch_driver_name,
             dbt.driver_phone    AS batch_driver_phone,
             dbt.car_plate       AS batch_car_plate,
             dbt.car_model       AS batch_car_model,
             dbt.dispatch_type   AS batch_dispatch_type,
             co.company_name     AS batch_company_name,
             -- Tender/company daily assignment (set by company portal per travel_date)
             cd.name             AS daily_driver_name,
             cd.phone            AS daily_driver_phone,
             cc.plate            AS daily_car_plate,
             cc.model            AS daily_car_model,
             da_co.company_name  AS daily_company_name
      FROM bookings b
      JOIN trips  t ON t.id = b.trip_id
      LEFT JOIN users  u ON u.id = t.driver_id
      LEFT JOIN checkins c ON c.booking_id = b.id
      -- Dispatch batch (admin batch system)
      LEFT JOIN dispatch_batch_bookings dbb ON dbb.booking_id = b.id
      LEFT JOIN dispatch_batches dbt ON dbt.id = dbb.batch_id
      LEFT JOIN companies co ON co.id = dbt.assigned_company_id
      -- Tender daily assignment (company portal system — matched by trip + passenger's travel_date)
      LEFT JOIN trip_daily_assignments da
             ON da.trip_id = b.trip_id AND da.assignment_date = b.travel_date
      LEFT JOIN company_drivers cd  ON cd.id  = da.driver_id
      LEFT JOIN company_cars    cc  ON cc.id  = da.car_id
      LEFT JOIN companies da_co     ON da_co.id = da.company_id
      WHERE b.passenger_id = ?
      ORDER BY b.travel_date DESC, b.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/bookings/:id/invoice — receipt breakdown for one booking (owner or admin)
router.get('/:id/invoice', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.id, b.seats, b.effective_price, b.is_surge, b.status, b.pickup_note,
             b.travel_date, b.created_at, b.discount_amount, b.seat_numbers,
             t.from_loc, t.to_loc, t.pickup_time, t.price AS base_price,
             u.name AS passenger_name
      FROM bookings b
      JOIN trips t ON t.id = b.trip_id
      JOIN users u ON u.id = b.passenger_id
      WHERE b.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    const b = rows[0];
    const [own] = await db.query('SELECT passenger_id FROM bookings WHERE id=?', [req.params.id]);
    if (own[0].passenger_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not your booking' });

    const seats   = Number(b.seats) || 1;
    const base    = Number(b.base_price) || 0;
    const perSeat = b.effective_price != null ? Number(b.effective_price) : base;
    const subtotal = base * seats;
    const surge    = b.is_surge ? Math.max(0, (perSeat - base) * seats) : 0;
    const discount = Number(b.discount_amount) || 0;
    const total    = Math.max(0, perSeat * seats - discount);
    res.json({
      invoice_no: 'WSL-' + String(b.id).padStart(6, '0'),
      issued_at: b.created_at,
      passenger_name: b.passenger_name,
      status: b.status,
      route: { from: b.from_loc, to: b.to_loc },
      travel_date: b.travel_date,
      pickup_time: b.pickup_time,
      pickup_note: b.pickup_note,
      seats,
      base_fare_per_seat: base,
      effective_per_seat: perSeat,
      seat_numbers: b.seat_numbers || null,
      subtotal,
      surge_amount: surge,
      is_surge: !!b.is_surge,
      discount_amount: discount,
      total,
      currency: 'EGP',
    });
  } catch (err) { console.error('invoice:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/bookings/all-day-bookings — admin
router.get('/all-day-bookings', requireAuth, requireRole('admin'), async (req, res) => {
  const { date } = req.query;
  try {
    const whereDate = date ? 'AND b.travel_date = ?' : '';
    const params = date ? [date] : [];
    const [rows] = await db.query(`
      SELECT b.*, t.from_loc, t.to_loc, t.pickup_time, t.price,
             u.name AS passenger_name, u.phone AS passenger_phone,
             d.name AS driver_name
      FROM bookings b
      JOIN trips t ON t.id = b.trip_id
      JOIN users u ON u.id = b.passenger_id
      JOIN users d ON d.id = t.driver_id
      WHERE b.status != 'cancelled' ${whereDate}
      ORDER BY b.travel_date ASC, t.pickup_time ASC
    `, params);
    res.json(rows);
  } catch(err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/bookings — book for a specific travel_date
router.post('/', requireAuth, requireRole('passenger'), async (req, res) => {
  const { trip_id, seats, pickup_note, travel_date, seat_numbers } = req.body;
  if (!trip_id || !seats) return res.status(400).json({ error: 'trip_id and seats required' });
  if (!travel_date) return res.status(400).json({ error: 'travel_date required (YYYY-MM-DD)' });
  if (seats < 1 || seats > 16) return res.status(400).json({ error: 'Invalid seat count' });

  const d = new Date(travel_date);
  if (d.getDay() === 5) return res.status(400).json({ error: 'No service on Fridays' });
  const today = new Date(); today.setHours(0,0,0,0);
  const travelD = new Date(travel_date); travelD.setHours(0,0,0,0);
  const diffDays = Math.round((travelD - today) / 86400000);
  if (diffDays < 0) return res.status(400).json({ error: 'Cannot book past dates' });
  if (diffDays > 7) return res.status(400).json({ error: 'Cannot book more than 7 days ahead' });

  try {
    const [tripRows] = await db.query(
      "SELECT * FROM trips WHERE id=? AND status IN ('upcoming','active','tendered','awarded','assigned')", [trip_id]
    );
    if (!tripRows.length) return res.status(404).json({ error: 'Trip not found or not available' });
    const trip = tripRows[0];

    const [existing] = await db.query(
      "SELECT id FROM bookings WHERE trip_id=? AND passenger_id=? AND travel_date=? AND status='confirmed'",
      [trip_id, req.user.id, travel_date]
    );
    if (existing.length) return res.status(409).json({ error: 'already_reserved' });

    // ── Check seat availability ──────────────────────────────────────────────
    const [[{ bookedSeats }]] = await db.query(
      "SELECT COALESCE(SUM(seats),0) AS bookedSeats FROM bookings WHERE trip_id=? AND travel_date=? AND status='confirmed'",
      [trip_id, travel_date]
    );
    const available = trip.total_seats - parseInt(bookedSeats);
    if (available < seats) {
      return res.status(400).json({
        error: available <= 0
          ? 'No seats available for this date'
          : `Only ${available} seat(s) available for this date`
      });
    }

    // ── Optional seat selection ──────────────────────────────────────────────
    let seatStr = null;
    if (Array.isArray(seat_numbers) && seat_numbers.length) {
      const picked = seat_numbers.map(n => parseInt(n, 10)).filter(n => Number.isInteger(n));
      const uniq = [...new Set(picked)];
      if (uniq.length !== seats)
        return res.status(400).json({ error: 'Pick exactly the number of seats you are booking' });
      if (uniq.some(n => n < 1 || n > trip.total_seats))
        return res.status(400).json({ error: 'Invalid seat number' });
      const taken = await takenSeats(trip_id, travel_date);
      const clash = uniq.filter(n => taken.has(n));
      if (clash.length) return res.status(409).json({ error: `Seat ${clash.join(', ')} just got taken — pick another` });
      seatStr = uniq.sort((a, b) => a - b).join(',');
    }

    const effectivePrice = await computePrice(trip.price, travel_date);
    const isSurge = effectivePrice > trip.price;
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayName = dayNames[new Date(travel_date).getDay()];

    await ensureSeatColumn();
    const [result] = await db.query(
      'INSERT INTO bookings (trip_id, passenger_id, seats, pickup_note, travel_date, effective_price, is_surge, seat_numbers) VALUES (?,?,?,?,?,?,?,?)',
      [trip_id, req.user.id, seats, pickup_note || null, travel_date, effectivePrice, isSurge ? 1 : 0, seatStr]
    );
    const bookingId = result.insertId;
    await db.query('INSERT INTO checkins (booking_id) VALUES (?)', [bookingId]);

    // Refer & Earn: apply best active discount voucher to this booking (non-fatal).
    let discountApplied = 0;
    try {
      const gross = Number(effectivePrice) * seats;
      const r = await require('./referrals').applyBestReward(req.user.id, gross, bookingId);
      if (r.discount > 0) {
        discountApplied = r.discount;
        await db.query('UPDATE bookings SET discount_amount=?, reward_id=? WHERE id=?',
          [r.discount, r.rewardId, bookingId]);
      }
    } catch (e) { console.error('reward apply:', e.message); }

    const passengerMsg = `Booking confirmed for ${dayName} ${travel_date}: ${trip.from_loc} → ${trip.to_loc}${isSurge ? ` (surge +${effectivePrice - trip.price} EGP)` : ''}${discountApplied > 0 ? ` — ${discountApplied} EGP discount applied 🎉` : ''}`;
    await db.query('INSERT INTO notifications (user_id, message) VALUES (?,?)',
      [req.user.id, passengerMsg]);
    sendPushToUser(req.user.id, 'Booking confirmed ✓', passengerMsg).catch(()=>{});
    if (trip.driver_id) {
      const driverMsg = `New booking: ${seats} seat(s) on ${dayName} ${travel_date} — ${trip.from_loc} → ${trip.to_loc}`;
      await db.query('INSERT INTO notifications (user_id, message) VALUES (?,?)',
        [trip.driver_id, driverMsg]);
      sendPushToUser(trip.driver_id, 'New booking 🎫', driverMsg).catch(()=>{});
    }

    const [booking] = await db.query(`
      SELECT b.*, t.from_loc, t.to_loc, t.pickup_time, t.date, t.price,
             u.name AS driver_name, u.car AS driver_car, u.plate AS driver_plate
      FROM bookings b JOIN trips t ON t.id=b.trip_id LEFT JOIN users u ON u.id=t.driver_id
      WHERE b.id = ?
    `, [bookingId]);

    const io = getIo();
    if (io) {
      const [[{ newBooked }]] = await db.query(
        "SELECT COALESCE(SUM(seats),0) AS newBooked FROM bookings WHERE trip_id=? AND travel_date=? AND status='confirmed'",
        [trip_id, travel_date]
      );
      io.to('admin').emit('booking:updated', { tripId: trip_id, travelDate: travel_date, bookedSeats: newBooked });
      io.to(`trip:${trip_id}`).emit('booking:updated', { tripId: trip_id, travelDate: travel_date, bookedSeats: newBooked });
    }
    res.status(201).json(booking[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = rows[0];
    if (booking.passenger_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });
    await db.query("UPDATE bookings SET status='cancelled' WHERE id=?", [req.params.id]);
    const io = getIo();
    if (io) {
      const [[{ newBooked }]] = await db.query(
        "SELECT COALESCE(SUM(seats),0) AS newBooked FROM bookings WHERE trip_id=? AND travel_date=? AND status='confirmed'",
        [booking.trip_id, booking.travel_date]
      );
      io.to('admin').emit('booking:updated', { tripId: booking.trip_id, travelDate: booking.travel_date, bookedSeats: newBooked });
    }
    res.json({ message: 'Booking cancelled' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/bookings/trip/:tripId
router.get('/trip/:tripId', requireAuth, async (req, res) => {
  const { date } = req.query;
  try {
    const whereDate = date ? 'AND b.travel_date = ?' : '';
    const params = date ? [req.params.tripId, date] : [req.params.tripId];
    const [rows] = await db.query(`
      SELECT b.*, u.name AS passenger_name, u.phone AS passenger_phone, c.status AS checkin_status
      FROM bookings b JOIN users u ON u.id=b.passenger_id
      LEFT JOIN checkins c ON c.booking_id=b.id
      WHERE b.trip_id=? AND b.status != 'cancelled' ${whereDate}
      ORDER BY b.travel_date ASC
    `, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});


// ═══════════════════════════════════════════════════════════════════════════
// DISPATCH — admin splits daily bookings into vehicle batches
// ═══════════════════════════════════════════════════════════════════════════

function getIoDispatch() {
  try { return require('../server').io; } catch(_) { return null; }
}

// GET /api/bookings/dispatch/summary?trip_id=X&date=Y
// Returns total bookings, assigned count, unassigned count, and batch list
router.get('/dispatch/summary', requireAuth, requireRole('admin'), async (req, res) => {
  const { trip_id, date } = req.query;
  if (!trip_id || !date) return res.status(400).json({ error: 'trip_id and date required' });
  try {
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM bookings WHERE trip_id=? AND travel_date=? AND status='confirmed'",
      [trip_id, date]
    );

    const [[{ assigned }]] = await db.query(
      `SELECT COUNT(DISTINCT dbb.booking_id) AS assigned
       FROM dispatch_batch_bookings dbb
       JOIN dispatch_batches dbt ON dbt.id = dbb.batch_id
       WHERE dbt.trip_id=? AND dbt.travel_date=?`,
      [trip_id, date]
    );

    const [batches] = await db.query(
      `SELECT dbt.*,
              COUNT(dbb.booking_id) AS passenger_count,
              c.company_name        AS company_name
       FROM dispatch_batches dbt
       LEFT JOIN dispatch_batch_bookings dbb ON dbb.batch_id = dbt.id
       LEFT JOIN companies c ON c.id = dbt.assigned_company_id
       WHERE dbt.trip_id=? AND dbt.travel_date=?
       GROUP BY dbt.id
       ORDER BY dbt.created_at ASC`,
      [trip_id, date]
    );

    res.json({
      total:      parseInt(total),
      assigned:   parseInt(assigned),
      unassigned: parseInt(total) - parseInt(assigned),
      batches,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/bookings/dispatch/batch/:id/passengers
router.get('/dispatch/batch/:id/passengers', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.id, b.seats, b.pickup_note, b.effective_price, b.is_surge,
              u.name AS passenger_name, u.phone AS passenger_phone
       FROM dispatch_batch_bookings dbb
       JOIN bookings b ON b.id = dbb.booking_id
       JOIN users u ON u.id = b.passenger_id
       WHERE dbb.batch_id=?
       ORDER BY b.id ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/bookings/dispatch/batch — create batch, auto-fill from unassigned passengers
router.post('/dispatch/batch', requireAuth, requireRole('admin'), async (req, res) => {
  const { trip_id, travel_date, vehicle_type, capacity } = req.body;
  if (!trip_id || !travel_date || !vehicle_type)
    return res.status(400).json({ error: 'trip_id, travel_date, vehicle_type required' });

  const cap = parseInt(capacity) || (vehicle_type === 'hiace' ? 14 : 24);
  try {
    // Get unassigned booking IDs, FIFO
    const [unassigned] = await db.query(
      `SELECT b.id FROM bookings b
       WHERE b.trip_id=? AND b.travel_date=? AND b.status='confirmed'
         AND b.id NOT IN (
           SELECT dbb.booking_id FROM dispatch_batch_bookings dbb
           JOIN dispatch_batches dbt ON dbt.id = dbb.batch_id
           WHERE dbt.trip_id=? AND dbt.travel_date=?
         )
       ORDER BY b.id ASC LIMIT ?`,
      [trip_id, travel_date, trip_id, travel_date, cap]
    );

    if (!unassigned.length)
      return res.status(400).json({ error: 'No unassigned passengers for this route and date' });

    const [result] = await db.query(
      `INSERT INTO dispatch_batches (trip_id, travel_date, vehicle_type, capacity, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [trip_id, travel_date, vehicle_type, cap]
    );
    const batchId = result.insertId;

    // Bulk-insert the batch passenger links
    const vals = unassigned.map(b => [batchId, b.id]);
    await db.query('INSERT INTO dispatch_batch_bookings (batch_id, booking_id) VALUES ?', [vals]);

    res.status(201).json({ batch_id: batchId, passenger_count: unassigned.length, capacity: cap });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/bookings/dispatch/batch/:id/capacity — edit vehicle capacity
router.put('/dispatch/batch/:id/capacity', requireAuth, requireRole('admin'), async (req, res) => {
  const { capacity } = req.body;
  if (!capacity || capacity < 1) return res.status(400).json({ error: 'Invalid capacity' });
  try {
    await db.query('UPDATE dispatch_batches SET capacity=? WHERE id=?', [capacity, req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/bookings/dispatch/batch/:id/tender — post batch as open tender
router.put('/dispatch/batch/:id/tender', requireAuth, requireRole('admin'), async (req, res) => {
  const { duration_minutes = 120, description } = req.body;
  try {
    const [batches] = await db.query(
      `SELECT dbt.*, t.from_loc, t.to_loc, t.pickup_time
       FROM dispatch_batches dbt JOIN trips t ON t.id=dbt.trip_id WHERE dbt.id=?`,
      [req.params.id]
    );
    if (!batches.length) return res.status(404).json({ error: 'Batch not found' });
    const batch = batches[0];
    if (batch.status !== 'pending')
      return res.status(400).json({ error: 'Batch already dispatched' });

    const ends_at = new Date(Date.now() + duration_minutes * 60 * 1000);
    const [[{ pcount }]] = await db.query(
      'SELECT COUNT(*) AS pcount FROM dispatch_batch_bookings WHERE batch_id=?', [batch.id]
    );
    const desc = description ||
      `${batch.vehicle_type === 'hiace' ? 'Hiace' : 'Coaster'} needed — ${pcount} passengers — ${batch.from_loc || ''} → ${batch.to_loc || ''} on ${batch.travel_date}`;

    // Try with batch_id column (after migration), fallback without
    let tenderId;
    try {
      const [r] = await db.query(
        `INSERT INTO tenders (trip_id, batch_id, ends_at, status, description) VALUES (?,?,?,\'open\',?)`,
        [batch.trip_id, batch.id, ends_at, desc]
      );
      tenderId = r.insertId;
    } catch(_) {
      const [r] = await db.query(
        `INSERT INTO tenders (trip_id, ends_at, status, description) VALUES (?,?,\'open\',?)`,
        [batch.trip_id, ends_at, desc]
      );
      tenderId = r.insertId;
      // Try to update batch_id column if it exists
      try { await db.query('UPDATE tenders SET batch_id=? WHERE id=?', [batch.id, tenderId]); } catch(_2){}
    }

    await db.query(
      `UPDATE dispatch_batches SET dispatch_type='tender', tender_id=?, status='tendered' WHERE id=?`,
      [tenderId, batch.id]
    );

    const io = getIoDispatch();
    if (io) io.emit('tender:new', { id: tenderId, batch_id: batch.id });

    res.json({ tender_id: tenderId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/bookings/dispatch/batch/:id/own — assign own driver/bus directly
router.put('/dispatch/batch/:id/own', requireAuth, requireRole('admin'), async (req, res) => {
  const { driver_id, car_plate, car_model } = req.body;
  if (!driver_id) return res.status(400).json({ error: 'driver_id required' });
  try {
    const [drivers] = await db.query("SELECT * FROM users WHERE id=? AND role='driver'", [driver_id]);
    if (!drivers.length) return res.status(404).json({ error: 'Driver not found' });
    const driver = drivers[0];

    await db.query(
      `UPDATE dispatch_batches
       SET dispatch_type='own', own_driver_id=?, status='assigned',
           driver_name=?, driver_phone=?, car_plate=?, car_model=?
       WHERE id=?`,
      [driver_id, driver.name, driver.phone || '', car_plate || driver.plate || '', car_model || driver.car || '', req.params.id]
    );

    await notifyBatchPassengers(req.params.id, driver.name, car_plate || driver.plate || '');
    res.json({ ok: true, driver_name: driver.name });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/bookings/dispatch/batch/:id/company — assign directly to a known company (no tender)
router.put('/dispatch/batch/:id/company', requireAuth, requireRole('admin'), async (req, res) => {
  const { company_id } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id required' });
  try {
    const [companies] = await db.query('SELECT * FROM companies WHERE id=?', [company_id]);
    if (!companies.length) return res.status(404).json({ error: 'Company not found' });

    await db.query(
      `UPDATE dispatch_batches SET dispatch_type='company', assigned_company_id=?, status='assigned' WHERE id=?`,
      [company_id, req.params.id]
    );
    await notifyBatchPassengers(req.params.id, companies[0].company_name, 'Vehicle TBD');
    res.json({ ok: true, company_name: companies[0].company_name });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/bookings/dispatch/batch/:id/driver-info — company fills in driver+car after winning tender or being assigned
router.put('/dispatch/batch/:id/driver-info', async (req, res) => {
  const { driver_name, driver_phone, car_plate, car_model, company_token } = req.body;
  if (!driver_name || !car_plate) return res.status(400).json({ error: 'driver_name and car_plate required' });
  try {
    // Verify company token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'waslney_secret_change_me';
    let company;
    try { company = jwt.verify(company_token, JWT_SECRET); } catch(_) {
      return res.status(401).json({ error: 'Invalid company token' });
    }

    // Verify the batch belongs to this company (tender won or direct assignment)
    const [batches] = await db.query(
      `SELECT dbt.* FROM dispatch_batches dbt
       LEFT JOIN tenders tn ON tn.id = dbt.tender_id
       WHERE dbt.id=?
         AND (dbt.assigned_company_id=? OR tn.winner_company_id=?)`,
      [req.params.id, company.id, company.id]
    );
    if (!batches.length) return res.status(403).json({ error: 'Not your batch' });

    await db.query(
      `UPDATE dispatch_batches SET driver_name=?, driver_phone=?, car_plate=?, car_model=?, status='assigned' WHERE id=?`,
      [driver_name, driver_phone || '', car_plate, car_model || '', req.params.id]
    );

    await notifyBatchPassengers(req.params.id, driver_name, car_plate);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/bookings/dispatch/batch/:id — remove a pending batch (releases passengers back to unassigned)
router.delete('/dispatch/batch/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [b] = await db.query('SELECT * FROM dispatch_batches WHERE id=?', [req.params.id]);
    if (!b.length) return res.status(404).json({ error: 'Batch not found' });
    if (b[0].status !== 'pending') return res.status(400).json({ error: 'Can only delete pending batches' });
    await db.query('DELETE FROM dispatch_batch_bookings WHERE batch_id=?', [req.params.id]);
    await db.query('DELETE FROM dispatch_batches WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/bookings/companies — admin: list all registered companies for direct assignment
router.get('/companies', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [companies] = await db.query(
      'SELECT id, company_name, fleet_number, phone FROM companies ORDER BY company_name ASC'
    );
    if (!companies.length) return res.json([]);

    const companyIds = companies.map(c => c.id);
    const placeholders = companyIds.map(() => '?').join(',');

    const [drivers] = await db.query(
      `SELECT id, company_id, name, phone, license_number
       FROM company_drivers
       WHERE company_id IN (${placeholders})
       ORDER BY name ASC`,
      companyIds
    );
    const [cars] = await db.query(
      `SELECT id, company_id, plate, model, capacity
       FROM company_cars
       WHERE company_id IN (${placeholders})
       ORDER BY plate ASC`,
      companyIds
    );

    const driversByCompany = new Map();
    const carsByCompany = new Map();
    drivers.forEach(d => {
      if (!driversByCompany.has(d.company_id)) driversByCompany.set(d.company_id, []);
      driversByCompany.get(d.company_id).push(d);
    });
    cars.forEach(c => {
      if (!carsByCompany.has(c.company_id)) carsByCompany.set(c.company_id, []);
      carsByCompany.get(c.company_id).push(c);
    });

    const rows = companies.map(c => {
      const companyDrivers = driversByCompany.get(c.id) || [];
      const companyCars = carsByCompany.get(c.id) || [];
      return {
        ...c,
        driver_count: companyDrivers.length,
        car_count: companyCars.length,
        drivers: companyDrivers,
        cars: companyCars,
      };
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Helper: notify all passengers in a batch when driver/car is assigned
async function notifyBatchPassengers(batchId, driverName, carPlate) {
  try {
    const [batch] = await db.query(
      `SELECT dbt.travel_date, t.from_loc, t.to_loc
       FROM dispatch_batches dbt JOIN trips t ON t.id=dbt.trip_id WHERE dbt.id=?`,
      [batchId]
    );
    if (!batch.length) return;
    const b = batch[0];

    const [passengers] = await db.query(
      `SELECT bk.passenger_id, bk.id AS booking_id FROM bookings bk
       JOIN dispatch_batch_bookings dbb ON dbb.booking_id = bk.id
       WHERE dbb.batch_id=?`,
      [batchId]
    );

    const io = getIo();
    for (const p of passengers) {
      const message = `Your driver for ${b.travel_date} (${b.from_loc} → ${b.to_loc}) has been assigned: ${driverName} — ${carPlate}. Have a safe trip! 🚌`;
      await db.query('INSERT INTO notifications (user_id, message) VALUES (?,?)', [p.passenger_id, message]);
      if (io) {
        io.to(`user:${p.passenger_id}`).emit('driver:assigned', {
          bookingId: p.booking_id, driverName, carPlate, travelDate: b.travel_date, message,
        });
      }
    }
  } catch(_) {}
}


module.exports = router;
