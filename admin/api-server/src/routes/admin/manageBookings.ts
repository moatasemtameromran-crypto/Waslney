import { Router } from "express";
import db from "../../lib/db";
import { requireAdminAuth } from "../../lib/adminAuth";

const router = Router();

async function getBookingSettings(): Promise<any> {
  try {
    const [rows] = await db.query("SELECT * FROM booking_settings WHERE id = 1") as any;
    if (rows.length) return rows[0];
  } catch (_) {}
  return { booking_round_start_day: 5, surge_percent: 10, surge_after_friday: 1 };
}

async function computePrice(basePrice: number, _travelDate: string): Promise<number> {
  const settings = await getBookingSettings();
  if (!settings.surge_after_friday) return basePrice;
  const roundStartDay = settings.booking_round_start_day ?? 5;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  const onSurgeDay = (todayDay === roundStartDay || todayDay === (roundStartDay + 1) % 7);
  if (onSurgeDay) return Math.round(basePrice * (1 + settings.surge_percent / 100));
  return basePrice;
}

// GET /api/admin/manage-bookings/settings
router.get("/settings", requireAdminAuth, async (_req, res) => {
  res.json(await getBookingSettings());
});

// PUT /api/admin/manage-bookings/settings
router.put("/settings", requireAdminAuth, async (req, res) => {
  const { booking_round_start_day, surge_percent, surge_after_friday } = req.body;
  try {
    await db.query(
      `INSERT INTO booking_settings (id, booking_round_start_day, surge_percent, surge_after_friday)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         booking_round_start_day = VALUES(booking_round_start_day),
         surge_percent           = VALUES(surge_percent),
         surge_after_friday      = VALUES(surge_after_friday)`,
      [booking_round_start_day ?? 5, surge_percent ?? 10, surge_after_friday ? 1 : 0]
    );
    res.json({ message: "Settings saved" });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Save settings error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/manage-bookings/trips-list — trips for the schedule dropdown
router.get("/trips-list", requireAdminAuth, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, from_loc, to_loc, pickup_time, price, total_seats, status
       FROM trips WHERE status IN ('upcoming','active','tendered','awarded','assigned')
       ORDER BY pickup_time ASC`
    ) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/manage-bookings/week-schedule?trip_id=X
router.get("/week-schedule", requireAdminAuth, async (req, res) => {
  const { trip_id } = req.query as any;
  if (!trip_id) { res.status(400).json({ error: "trip_id required" }); return; }
  try {
    const [tripRows] = await db.query("SELECT * FROM trips WHERE id = ?", [trip_id]) as any;
    if (!tripRows.length) { res.status(404).json({ error: "Trip not found" }); return; }
    const trip = tripRows[0];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      if (d.getDay() === 5) continue; // skip Friday
      days.push(d.toISOString().slice(0, 10));
    }
    const schedule: any[] = [];
    for (const date of days) {
      const [cntRows] = await db.query(
        "SELECT COALESCE(SUM(seats),0) AS booked FROM bookings WHERE trip_id=? AND travel_date=? AND status='confirmed'",
        [trip_id, date]
      ) as any;
      const booked = parseInt(cntRows[0].booked);
      const effectivePrice = await computePrice(trip.price, date);
      const d = new Date(date);
      schedule.push({
        date, day_name: dayNames[d.getDay()],
        booked,
        available: Math.max(0, trip.total_seats - booked),
        total_seats: trip.total_seats,
        effective_price: effectivePrice,
        is_surge: effectivePrice > trip.price,
      });
    }
    res.json({ trip, schedule });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Week schedule error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/manage-bookings/all-day-bookings?date=YYYY-MM-DD
router.get("/all-day-bookings", requireAdminAuth, async (req, res) => {
  const { date } = req.query as any;
  try {
    const whereDate = date ? "AND b.travel_date = ?" : "";
    const params = date ? [date] : [];
    const [rows] = await db.query(
      `SELECT b.id, b.seats, b.status, b.travel_date, b.effective_price, b.created_at,
              t.from_loc, t.to_loc, t.pickup_time,
              u.name AS passenger_name, u.phone AS passenger_phone,
              d.name AS driver_name
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       JOIN users u ON u.id = b.passenger_id
       LEFT JOIN users d ON d.id = t.driver_id
       WHERE b.status != 'cancelled' ${whereDate}
       ORDER BY b.travel_date ASC, t.pickup_time ASC`,
      params
    ) as any;
    res.json(rows);
  } catch (err: any) {
    req.log.error({ err: err.message }, "All-day bookings error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
