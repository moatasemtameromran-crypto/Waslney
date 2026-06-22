import { Router } from "express";
import db from "../../lib/db";
import { requireAdminAuth } from "../../lib/adminAuth";

const router = Router();

// GET /api/admin/map/live — all active/upcoming trips with their live driver
// position (when the driver is sharing GPS) plus pickup/dropoff coordinates so
// the map still shows where each trip is even before GPS starts.
router.get("/live", requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.id AS trip_id, t.from_loc, t.to_loc, t.status,
              t.pickup_lat, t.pickup_lng, t.dropoff_lat, t.dropoff_lng,
              u.name AS driver_name, u.phone AS driver_phone, u.plate,
              dl.lat AS driver_lat, dl.lng AS driver_lng, dl.updated_at AS location_updated_at,
              (SELECT COUNT(*) FROM bookings b WHERE b.trip_id=t.id AND b.status='confirmed') AS confirmed_bookings
       FROM trips t
       LEFT JOIN users u ON u.id = t.driver_id
       LEFT JOIN driver_locations dl ON dl.trip_id = t.id
       WHERE t.status IN ('active','upcoming','assigned','awarded','tendered')
       ORDER BY (t.status='active') DESC, t.pickup_time ASC`
    ) as any;
    res.json(rows);
  } catch (err: any) {
    req.log.error({ err: err.message }, "Live map error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
