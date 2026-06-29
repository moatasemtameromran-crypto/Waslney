import { useEffect, useState } from "react";
import { api, User, Driver, Company } from "@/lib/api";
import { Search, CheckCircle, XCircle, Clock, Star, Building2, Car, Users, RefreshCw } from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-500/15 text-green-400",
    pending_review: "bg-yellow-500/15 text-yellow-400",
    rejected: "bg-red-500/15 text-red-400",
    suspended: "bg-orange-500/15 text-orange-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-muted text-muted-foreground"}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

export function Customers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.customers().then((data) => { setUsers(data); setFiltered(data); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter((u) => u.name?.toLowerCase().includes(q) || u.phone?.includes(q) || u.email?.toLowerCase().includes(q)));
  }, [search, users]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">{users.length} total passengers</p>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone or email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Phone</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Bookings</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">No customers found</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary text-xs font-bold">{u.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{u.phone}</td>
                    <td className="px-5 py-3 text-foreground hidden md:table-cell">{(u as any).total_bookings || 0}</td>
                    <td className="px-5 py-3">{statusBadge(u.account_status)}</td>
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

export function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filtered, setFiltered] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.drivers(statusFilter || undefined).then((data) => { setDrivers(data); setFiltered(data); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  useEffect(() => {
    if (!search) { setFiltered(drivers); return; }
    const q = search.toLowerCase();
    setFiltered(drivers.filter((d) => d.name?.toLowerCase().includes(q) || d.phone?.includes(q)));
  }, [search, drivers]);

  async function updateStatus(id: number, status: string, note?: string) {
    setUpdating(id);
    try {
      await api.updateUserStatus(id, status, note);
      load();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Drivers</h1>
        <p className="text-sm text-muted-foreground">{drivers.length} registered drivers</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drivers..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending_review">Pending Review</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
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
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Driver</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Vehicle</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Rating</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden lg:table-cell">Trips</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No drivers found</td></tr>
                ) : filtered.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary text-xs font-bold">{d.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{d.name}</div>
                          <div className="text-xs text-muted-foreground">{d.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">
                      {d.car || "—"} {d.plate ? `· ${d.plate}` : ""}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star size={13} fill="currentColor" />
                        <span className="text-sm text-foreground">{Number(d.avg_rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-foreground hidden lg:table-cell">{d.total_trips || 0}</td>
                    <td className="px-5 py-3">{statusBadge(d.account_status)}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        {d.account_status === "pending_review" && (
                          <>
                            <button
                              disabled={updating === d.id}
                              onClick={() => updateStatus(d.id, "active")}
                              className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              disabled={updating === d.id}
                              onClick={() => {
                                const note = prompt("Rejection reason:");
                                if (note !== null) updateStatus(d.id, "rejected", note);
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              title="Reject"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {d.account_status === "active" && (
                          <button
                            disabled={updating === d.id}
                            onClick={() => updateStatus(d.id, "suspended")}
                            className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                            title="Suspend"
                          >
                            <Clock size={14} />
                          </button>
                        )}
                        {d.account_status === "suspended" && (
                          <button
                            disabled={updating === d.id}
                            onClick={() => updateStatus(d.id, "active")}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                            title="Re-activate"
                          >
                            <CheckCircle size={14} />
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
    </div>
  );
}


export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    api.companies().then(setCompanies).catch(() => setCompanies([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const q = search.toLowerCase();
  const filtered = companies.filter((c) => !q || c.company_name?.toLowerCase().includes(q) || c.phone?.includes(q));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Companies</h1>
          <p className="text-sm text-muted-foreground">{companies.length} registered companies - each with its drivers and cars</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm hover:bg-secondary/70 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Building2 size={36} className="mx-auto text-muted-foreground mb-3" />
          <div className="font-medium">No companies found</div>
          <p className="text-sm text-muted-foreground mt-1">Create company accounts from Operations - New Account.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{c.company_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.phone || "-"} - Fleet {c.fleet_number || "-"}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 justify-end"><Users size={13} /> {c.driver_count || 0} drivers</div>
                  <div className="flex items-center gap-1 justify-end mt-1"><Car size={13} /> {c.car_count || 0} cars</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-secondary/30 border border-border rounded-lg p-3">
                  <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Drivers ({c.drivers?.length || 0})</div>
                  {(!c.drivers || c.drivers.length === 0) ? (
                    <div className="text-xs text-muted-foreground">No drivers added</div>
                  ) : (
                    <div className="space-y-2">
                      {c.drivers.map((d) => (
                        <div key={d.id} className="text-sm">
                          <div className="font-medium text-foreground">{d.name}</div>
                          <div className="text-xs text-muted-foreground">{d.phone || "-"} - {d.license_number || "no license"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-secondary/30 border border-border rounded-lg p-3">
                  <div className="text-xs font-medium text-purple-400 uppercase tracking-wide mb-2">Cars ({c.cars?.length || 0})</div>
                  {(!c.cars || c.cars.length === 0) ? (
                    <div className="text-xs text-muted-foreground">No cars added</div>
                  ) : (
                    <div className="space-y-2">
                      {c.cars.map((car) => (
                        <div key={car.id} className="text-sm">
                          <div className="font-medium text-foreground">{car.plate}</div>
                          <div className="text-xs text-muted-foreground">{car.model || "-"}{car.capacity ? ` - ${car.capacity} seats` : ""}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}