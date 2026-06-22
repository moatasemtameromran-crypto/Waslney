import { useEffect, useState } from "react";
import { api, Trip } from "@/lib/api";
import { Search, XCircle } from "lucide-react";

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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
