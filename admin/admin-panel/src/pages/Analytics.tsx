import { useEffect, useState } from "react";
import { api, AnalyticsSummary } from "@/lib/api";
import { TrendingUp, DollarSign, Users, MapPin } from "lucide-react";

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
  const maxRevenue = Math.max(...daily.map((d) => Number(d.revenue || 0)), 1);

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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Revenue", value: `EGP ${Number(t?.revenue || 0).toFixed(0)}`, icon: DollarSign, color: "bg-yellow-500/15 text-yellow-400" },
              { label: "Bookings", value: t?.total_bookings || 0, icon: TrendingUp, color: "bg-blue-500/15 text-blue-400" },
              { label: "Trips", value: t?.total_trips || 0, icon: MapPin, color: "bg-green-500/15 text-green-400" },
              { label: "Passengers", value: t?.unique_passengers || 0, icon: Users, color: "bg-purple-500/15 text-purple-400" },
            ].map((item) => (
              <div key={item.label} className="bg-card border border-border rounded-xl p-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
                  <item.icon size={18} />
                </div>
                <div className="text-2xl font-bold text-foreground">{item.value}</div>
                <div className="text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">Daily Revenue</h2>
            {daily.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <div className="h-48 flex items-end gap-1.5">
                {daily.map((d) => {
                  const h = (Number(d.revenue || 0) / maxRevenue) * 100;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                      <div className="relative flex-1 flex items-end w-full">
                        <div
                          className="w-full bg-primary/70 group-hover:bg-primary rounded-t-sm transition-all"
                          style={{ height: `${Math.max(h, 2)}%` }}
                          title={`EGP ${Number(d.revenue || 0).toFixed(0)}`}
                        />
                      </div>
                      <div className="text-[9px] text-muted-foreground truncate w-full text-center hidden sm:block">
                        {new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
