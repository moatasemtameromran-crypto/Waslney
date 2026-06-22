import { useEffect, useState } from "react";
import { api, Holiday, VehicleType, CancellationPolicy, DeleteRequest } from "@/lib/api";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";

export function Holidays() {
  const [items, setItems] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", holiday_date: "" });
  const [showForm, setShowForm] = useState(false);

  const load = () => { setLoading(true); api.holidays().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createHoliday({ name: form.name, holiday_date: form.holiday_date, no_service: true } as any);
    setShowForm(false); setForm({ name: "", holiday_date: "" }); load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Holidays</h1><p className="text-sm text-muted-foreground">{items.length} holidays</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">New Holiday</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Date</label><input required type="date" value={form.holiday_date} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="flex items-end"><span className="text-xs text-muted-foreground pb-2">🚫 No service on this day</span></div>
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Name</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Date</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Service</th><th className="px-5 py-3" /></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">No holidays</td></tr> : items.map((h: any) => (
              <tr key={h.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3 font-medium">{h.name || "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{h.holiday_date ? new Date(h.holiday_date).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-3 text-foreground">{h.no_service ? "🚫 No service" : "Running"}</td>
                <td className="px-5 py-3 text-right"><button onClick={async () => { if (confirm("Delete?")) { await api.deleteHoliday(h.id); load(); } }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function VehicleTypes() {
  const [items, setItems] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_name: "", seats: "", ride_type: "Shuttle", vehicle_type: "Shuttle" });

  const load = () => { setLoading(true); api.vehicleTypes().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createVehicleType({ vehicle_name: form.vehicle_name, seats: Number(form.seats), ride_type: form.ride_type, vehicle_type: form.vehicle_type });
    setShowForm(false); setForm({ vehicle_name: "", seats: "", ride_type: "Shuttle", vehicle_type: "Shuttle" }); load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Vehicle Types</h1><p className="text-sm text-muted-foreground">{items.length} types</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">New Vehicle Type</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Name</label><input required value={form.vehicle_name} onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Seats</label><input required type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Ride Type</label><input value={form.ride_type} onChange={(e) => setForm({ ...form, ride_type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Vehicle Type</label><input value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Name</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Seats</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Ride Type</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Type</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No vehicle types</td></tr> : items.map((v: any) => (
              <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3 font-medium">{v.vehicle_name}</td>
                <td className="px-5 py-3 text-muted-foreground">{v.seats} seats</td>
                <td className="px-5 py-3 text-muted-foreground">{v.ride_type}</td>
                <td className="px-5 py-3 text-muted-foreground">{v.vehicle_type}</td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.status === "active" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>{v.status === "active" ? "Active" : "Inactive"}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Cancellation() {
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.cancellationPolicies().then(setPolicies).finally(() => setLoading(false)); }, []);

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Cancellation Policies</h1><p className="text-sm text-muted-foreground">Refund rules by time window</p></div>
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Policy Name</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Hours Before</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Refund %</th></tr></thead>
            <tbody>{policies.length === 0 ? <tr><td colSpan={3} className="px-5 py-10 text-center text-muted-foreground">No policies configured</td></tr> : policies.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3 font-medium">{p.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{p.hours_before}h before</td>
                <td className="px-5 py-3"><span className="text-green-400 font-medium">{p.refund_percent}%</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function DeleteRequests() {
  const [items, setItems] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);

  const load = () => { setLoading(true); api.deleteRequests().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function approve(id: number) {
    if (!confirm("Approve this account deletion request? This will mark it as approved.")) return;
    setApproving(id);
    try { await api.approveDeleteRequest(id); load(); } finally { setApproving(null); }
  }

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Delete Requests</h1><p className="text-sm text-muted-foreground">{items.length} pending requests</p></div>
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">User</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Reason</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Actions</th></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">No delete requests</td></tr> : items.map((r) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3"><div className="font-medium">{r.name || `User #${r.user_id}`}</div><div className="text-xs text-muted-foreground">{r.phone}</div></td>
                <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{r.reason || "—"}</td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "pending" ? "bg-yellow-500/15 text-yellow-400" : r.status === "approved" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>{r.status}</span></td>
                <td className="px-5 py-3">
                  {r.status === "pending" && (
                    <button disabled={approving === r.id} onClick={() => approve(r.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs transition-colors">
                      <CheckCircle size={12} /> Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Notifications() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Push Notifications</h1><p className="text-sm text-muted-foreground">Send notifications to users</p></div>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="max-w-lg space-y-4">
          <div><label className="text-sm font-medium block mb-1.5">Title</label><input className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Notification title" /></div>
          <div><label className="text-sm font-medium block mb-1.5">Message</label><textarea rows={3} className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="Notification message..." /></div>
          <div><label className="text-sm font-medium block mb-1.5">Target</label>
            <select className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="all">All Users</option><option value="passenger">Passengers Only</option><option value="driver">Drivers Only</option>
            </select>
          </div>
          <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">Send Notification</button>
        </div>
      </div>
    </div>
  );
}
