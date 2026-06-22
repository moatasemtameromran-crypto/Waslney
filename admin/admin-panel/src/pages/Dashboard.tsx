import { useEffect, useState } from "react";
import { api, DashboardStats } from "@/lib/api";
import { Users, Car, MapPin, DollarSign, TrendingUp, Clock } from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    confirmed: "bg-green-500/15 text-green-400",
    completed: "bg-blue-500/15 text-blue-400",
    cancelled: "bg-red-500/15 text-red-400",
    active: "bg-yellow-500/15 text-yellow-400",
    upcoming: "bg-purple-500/15 text-purple-400",
    pending: "bg-orange-500/15 text-orange-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4">
      {error}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, Admin</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.users.total || 0}
          sub={`${stats.users.passengers || 0} passengers · ${stats.users.drivers || 0} drivers`}
          icon={Users}
          color="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          label="Total Trips"
          value={stats.trips.total || 0}
          sub={`${stats.trips.active || 0} active · ${stats.trips.completed || 0} completed`}
          icon={MapPin}
          color="bg-green-500/15 text-green-400"
        />
        <StatCard
          label="Total Bookings"
          value={stats.bookings.total || 0}
          sub={`${stats.bookings.confirmed || 0} confirmed`}
          icon={TrendingUp}
          color="bg-purple-500/15 text-purple-400"
        />
        <StatCard
          label="Revenue"
          value={`EGP ${Number(stats.revenue || 0).toFixed(0)}`}
          sub="Confirmed bookings"
          icon={DollarSign}
          color="bg-yellow-500/15 text-yellow-400"
        />
      </div>

      {/* Recent Trips */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Clock size={16} className="text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Recent Trips</h2>
        </div>
        {stats.recentTrips.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">No trips yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Route</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Driver</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Departure</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Price</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTrips.map((trip) => (
                  <tr key={trip.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground truncate max-w-[160px]">{trip.origin}</div>
                      <div className="text-muted-foreground text-xs truncate max-w-[160px]">→ {trip.destination}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">
                      {trip.driver_name || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell text-xs">
                      {trip.departure_time ? new Date(trip.departure_time).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-foreground">EGP {trip.price}</td>
                    <td className="px-5 py-3">{statusBadge(trip.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Bookings */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Car size={16} className="text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Recent Bookings</h2>
        </div>
        {stats.recentBookings.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">No bookings yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Passenger</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Route</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Seats</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{b.passenger_name}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell text-xs">
                      {b.origin} → {b.destination}
                    </td>
                    <td className="px-5 py-3 text-foreground">{b.seats}</td>
                    <td className="px-5 py-3">{statusBadge(b.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
