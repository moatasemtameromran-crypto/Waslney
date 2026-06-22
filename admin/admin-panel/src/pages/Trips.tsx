import { useEffect, useState } from "react";
import { api, Trip } from "@/lib/api";
import { Search, XCircle, X, MapPin } from "lucide-react";
import MapView, { MapMarker } from "@/components/MapView";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-500/15 text-green-400",
    completed: "bg-blue-500/15 text-blue-400",
    cancelled: "bg-red-500/15 text-red-400",
    upcoming: "bg-yellow-500/15 text-yellow-400",
    pending: "bg-purple-500/15 text-purple-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filtered, setFiltered] = useState<Trip[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    api.trips(params).then((data) => { setTrips(data); setFiltered(data); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  useEffect(() => {
    if (!search) { setFiltered(trips); return; }
    const q = search.toLowerCase();
    setFiltered(trips.filter((t) =>
      t.origin?.toLowerCase().includes(q) ||
      t.destination?.toLowerCase().includes(q) ||
      t.driver_name?.toLowerCase().includes(q)
    ));
  }, [search, trips]);

  async function cancelTrip(id: number) {
    if (!confirm("Cancel this trip and all its bookings?")) return;
    setCancelling(id);
    try { await api.cancelTrip(id); load(); } finally { setCancelling(null); }
  }

  async function openDetail(id: number) {
    setDetailLoading(true); setDetail({ id });
    try { setDetail(await api.tripDetail(id)); } catch { setDetail(null); } finally { setDetailLoading(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Trips</h1>
        <p className="text-sm text-muted-foreground">{trips.length} total trips</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by route or driver..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        >
          <option value="">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Route</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Driver</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Departure</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Price</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden lg:table-cell">Bookings</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No trips found</td></tr>
                ) : filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground truncate max-w-[150px]">{t.origin}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">→ {t.destination}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{t.driver_name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {t.departure_time ? new Date(t.departure_time).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-foreground">EGP {t.price}</td>
                    <td className="px-5 py-3 text-foreground hidden lg:table-cell">{t.confirmed_bookings || 0}</td>
                    <td className="px-5 py-3">{statusBadge(t.status)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openDetail(t.id)}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="View on map"
                        >
                          <MapPin size={14} />
                        </button>
                        {t.status !== "cancelled" && t.status !== "completed" && (
                          <button
                            disabled={cancelling === t.id}
                            onClick={() => cancelTrip(t.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Cancel trip"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detail && (
        <TripDetailModal detail={detail} loading={detailLoading} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

function TripDetailModal({ detail, loading, onClose }: { detail: any; loading: boolean; onClose: () => void }) {
  const markers: MapMarker[] = [];
  const path: [number, number][] = [];

  const stops = Array.isArray(detail?.stops) ? detail.stops : [];
  for (const s of stops) {
    if (s.lat == null || s.lng == null) continue;
    const type = s.type === "pickup" ? "pickup" : s.type === "dropoff" ? "dropoff" : "stop";
    markers.push({ lat: +s.lat, lng: +s.lng, type: type as any, label: `${s.label || s.type}` });
    path.push([+s.lat, +s.lng]);
  }
  // Fallback to trip pickup/dropoff coords if no stops
  if (markers.length === 0) {
    if (detail?.pickup_lat != null) { markers.push({ lat: +detail.pickup_lat, lng: +detail.pickup_lng, type: "pickup", label: detail.origin }); path.push([+detail.pickup_lat, +detail.pickup_lng]); }
    if (detail?.dropoff_lat != null) { markers.push({ lat: +detail.dropoff_lat, lng: +detail.dropoff_lng, type: "dropoff", label: detail.destination }); path.push([+detail.dropoff_lat, +detail.dropoff_lng]); }
  }
  // Live driver position
  if (detail?.driver_location?.lat != null) {
    markers.push({
      lat: +detail.driver_location.lat, lng: +detail.driver_location.lng, type: "bus",
      label: `🚌 ${detail.driver_name || "Driver"} (live)`,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card">
          <div>
            <h3 className="font-semibold">{detail.origin || "Trip"} → {detail.destination || ""}</h3>
            <p className="text-xs text-muted-foreground">Trip #{detail.id} {detail.driver_name ? `· ${detail.driver_name}` : ""}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="relative">
                <MapView markers={markers} polyline={path.length > 1 ? path : undefined} height={320} />
                {markers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-card/90 border border-border rounded-lg px-4 py-2 text-sm text-muted-foreground">No location data for this trip</span>
                  </div>
                )}
              </div>
              {detail.driver_location?.updated_at && (
                <p className="text-xs text-muted-foreground">🚌 Driver GPS last updated {new Date(detail.driver_location.updated_at).toLocaleString()}</p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Price:</span> EGP {detail.price}</div>
                <div><span className="text-muted-foreground">Seats:</span> {detail.seats ?? detail.total_seats}</div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(detail.status)}</div>
                <div><span className="text-muted-foreground">Driver:</span> {detail.driver_phone || "—"}</div>
              </div>
              {stops.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Stops</div>
                  <div className="space-y-1">
                    {stops.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span>{s.type === "pickup" ? "🟢" : s.type === "dropoff" ? "🔴" : "📍"}</span>
                        <span>{s.label || s.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
