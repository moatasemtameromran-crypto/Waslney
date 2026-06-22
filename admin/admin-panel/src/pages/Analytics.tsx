import { useEffect, useState } from "react";
import { api, AnalyticsSummary } from "@/lib/api";
import { TrendingUp, DollarSign, Users, MapPin, Route as RouteIcon, PieChart } from "lucide-react";
import { AreaChart, DonutChart, BarList } from "@/components/Charts";

const STATUS_COLORS: Record<string, string> = {
  completed: "#3b82f6",
  confirmed: "#22c55e",
  cancelled: "#ef4444",
  pending: "#f59e0b",
};

export default function Analytics() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.analytics(period).then(setData).finally(() => setLoading(false));
  }, [period]);

  const t = data?.totals;
  const daily = data?.dailyRevenue || [];
  const statusBreakdown = data?.statusBreakdown || [];
  const topRoutes = data?.topRoutes || [];

  const revenueSeries = daily.map((d) => ({ date: d.date, value: Number(d.revenue || 0) }));
  const bookingSeries = daily.map((d) => ({ date: d.date, value: Number(d.bookings || 0) }));
  const donutSegments = statusBreakdown.map((s) => ({
    label: s.status, value: Number(s.count || 0), color: STATUS_COLORS[s.status] || "#a78bfa",
  }));

  const cards = [
    { label: "Revenue", value: `EGP ${Number(t?.revenue || 0).toLocaleString()}`, icon: DollarSign, from: "from-yellow-500/20", text: "text-yellow-400", ring: "shadow-yellow-500/10" },
    { label: "Bookings", value: Number(t?.total_bookings || 0).toLocaleString(), icon: TrendingUp, from: "from-blue-500/20", text: "text-blue-400", ring: "shadow-blue-500/10" },
    { label: "Trips", value: Number(t?.total_trips || 0).toLocaleString(), icon: MapPin, from: "from-green-500/20", text: "text-green-400", ring: "shadow-green-500/10" },
    { label: "Passengers", value: Number(t?.unique_passengers || 0).toLocaleString(), icon: Users, from: "from-purple-500/20", text: "text-purple-400", ring: "shadow-purple-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Revenue and booking trends</p>
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Gradient stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((item) => (
              <div key={item.label} className={`relative overflow-hidden bg-gradient-to-br ${item.from} to-card border border-border rounded-2xl p-5 shadow-lg ${item.ring}`}>
                <div className="absolute -right-4 -top-4 opacity-10">
                  <item.icon size={72} className={item.text} />
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-card/60 ${item.text}`}>
                  <item.icon size={18} />
                </div>
                <div className="text-2xl font-bold text-foreground">{item.value}</div>
                <div className="text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Revenue area chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-yellow-400" />
                <h2 className="font-semibold text-foreground">Daily Revenue</h2>
              </div>
              <span className="text-xs text-muted-foreground">EGP {Number(t?.revenue || 0).toLocaleString()} total</span>
            </div>
            {revenueSeries.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <AreaChart data={revenueSeries} color="#fbbf24" label="revenue" valuePrefix="EGP " height={220} />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bookings area chart */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-blue-400" />
                <h2 className="font-semibold text-foreground">Bookings Over Time</h2>
              </div>
              {bookingSeries.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
              ) : (
                <AreaChart data={bookingSeries} color="#60a5fa" label="bookings" height={180} />
              )}
            </div>

            {/* Status donut */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={16} className="text-green-400" />
                <h2 className="font-semibold text-foreground">Booking Status</h2>
              </div>
              {donutSegments.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No bookings yet</div>
              ) : (
                <div className="flex justify-center py-2"><DonutChart segments={donutSegments} /></div>
              )}
            </div>
          </div>

          {/* Top routes */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <RouteIcon size={16} className="text-purple-400" />
              <h2 className="font-semibold text-foreground">Busiest Routes</h2>
            </div>
            <BarList
              items={topRoutes.map((r) => ({ label: r.route, value: Number(r.bookings || 0), sub: `EGP ${Number(r.revenue || 0).toLocaleString()}` }))}
              color="#a78bfa"
            />
          </div>
        </>
      )}
    </div>
  );
}
