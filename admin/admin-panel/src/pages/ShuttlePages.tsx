import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Edit2, X, Check, MapPin, Bus, Route, DollarSign, Clock } from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-500/15 text-green-400",
    inactive: "bg-muted text-muted-foreground",
    cancelled: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

/* ─── Shuttle Stops ─── */
export function ShuttleStops() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", lat: "", lng: "", city: "Cairo", address: "" });

  const load = () => { setLoading(true); api.stops().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createStop({ ...form, lat: Number(form.lat), lng: Number(form.lng) });
    setShowForm(false); setForm({ name: "", lat: "", lng: "", city: "Cairo", address: "" }); load();
  }
  async function del(id: number) { if (confirm("Delete stop?")) { await api.deleteStop(id); load(); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Shuttle Stops</h1><p className="text-sm text-muted-foreground">{items.length} stops</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add Stop</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">New Stop</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["name","Name","text",true],["lat","Latitude","number",true],["lng","Longitude","number",true],["city","City","text",false],["address","Address","text",false]].map(([k,label,type,req]) => (
              <div key={k as string}><label className="text-xs text-muted-foreground mb-1 block">{label as string}</label>
                <input required={!!req} type={type as string} value={(form as any)[k as string]} onChange={(e) => setForm({...form,[k as string]:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            ))}
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Name</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Location</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">City</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th><th className="px-5 py-3" /></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No stops yet</td></tr> : items.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">{s.lat}, {s.lng}</td>
                <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{s.city}</td>
                <td className="px-5 py-3">{statusBadge(s.status)}</td>
                <td className="px-5 py-3 text-right"><button onClick={() => del(s.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Shuttle Routes ─── */
export function ShuttleRoutes() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ route_name: "", from_loc: "", to_loc: "", city: "Cairo" });

  const load = () => { setLoading(true); api.shuttleRoutes().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createShuttleRoute(form);
    setShowForm(false); setForm({ route_name: "", from_loc: "", to_loc: "", city: "Cairo" }); load();
  }
  async function del(id: number) { if (confirm("Delete route?")) { await api.deleteShuttleRoute(id); load(); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Shuttle Routes</h1><p className="text-sm text-muted-foreground">{items.length} routes</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add Route</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">New Route</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["route_name","Route Name",true],["from_loc","From",true],["to_loc","To",true],["city","City",false]].map(([k,label,req]) => (
              <div key={k as string}><label className="text-xs text-muted-foreground mb-1 block">{label as string}</label>
                <input required={!!req} value={(form as any)[k as string]} onChange={(e) => setForm({...form,[k as string]:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            ))}
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Route</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">From → To</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th><th className="px-5 py-3" /></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">No routes yet</td></tr> : items.map((r) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3 font-medium">{r.route_name || r.name}</td>
                <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell text-xs">{r.from_loc} → {r.to_loc}</td>
                <td className="px-5 py-3">{statusBadge(r.status)}</td>
                <td className="px-5 py-3 text-right"><button onClick={() => del(r.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Shuttle Vehicles ─── */
export function ShuttleVehicles() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_type: "", brand: "", model_name: "", vehicle_number: "", number_of_seats: "10", number_of_doors: "2", city: "Cairo" });

  const load = () => { setLoading(true); api.shuttleVehicles().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createShuttleVehicle({ ...form, number_of_seats: Number(form.number_of_seats), number_of_doors: Number(form.number_of_doors) });
    setShowForm(false); setForm({ vehicle_type: "", brand: "", model_name: "", vehicle_number: "", number_of_seats: "10", number_of_doors: "2", city: "Cairo" }); load();
  }
  async function del(id: number) { if (confirm("Delete vehicle?")) { await api.deleteShuttleVehicle(id); load(); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Shuttle Vehicles</h1><p className="text-sm text-muted-foreground">{items.length} vehicles</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add Vehicle</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">New Vehicle</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["vehicle_type","Type",false],["brand","Brand",false],["model_name","Model",true],["vehicle_number","Plate #",true],["number_of_seats","Seats","number",false],["number_of_doors","Doors","number",false],["city","City",false]].map(([k,label,typeOrReq,req]) => (
              <div key={k as string}><label className="text-xs text-muted-foreground mb-1 block">{label as string}</label>
                <input required={typeOrReq === true} type={typeOrReq === "number" ? "number" : "text"} value={(form as any)[k as string]} onChange={(e) => setForm({...form,[k as string]:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            ))}
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Vehicle</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Plate</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Seats</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th><th className="px-5 py-3" /></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No vehicles yet</td></tr> : items.map((v) => (
              <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3"><div className="font-medium">{v.brand} {v.model_name}</div><div className="text-xs text-muted-foreground">{v.vehicle_type}</div></td>
                <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">{v.vehicle_number}</td>
                <td className="px-5 py-3 hidden md:table-cell">{v.number_of_seats}</td>
                <td className="px-5 py-3">{statusBadge(v.status)}</td>
                <td className="px-5 py-3 text-right"><button onClick={() => del(v.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Shuttle Fare ─── */
export function ShuttleFare() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fare_type: "fare_per_km", base_fare: "", fare_per_stop: "", fare_per_km: "", city: "Cairo" });

  const load = () => { setLoading(true); api.shuttleFares().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createShuttleFare({ ...form, base_fare: Number(form.base_fare), fare_per_stop: Number(form.fare_per_stop), fare_per_km: Number(form.fare_per_km) });
    setShowForm(false); setForm({ fare_type: "fare_per_km", base_fare: "", fare_per_stop: "", fare_per_km: "", city: "Cairo" }); load();
  }
  async function del(id: number) { if (confirm("Delete fare?")) { await api.deleteShuttleFare(id); load(); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Shuttle Fare</h1><p className="text-sm text-muted-foreground">{items.length} fare configurations</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add Fare</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">New Fare</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select value={form.fare_type} onChange={(e) => setForm({...form,fare_type:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="fare_per_km">Per KM</option><option value="fare_per_stop">Per Stop</option><option value="fixed">Fixed</option>
              </select></div>
            {[["base_fare","Base Fare (EGP)"],["fare_per_stop","Per Stop (EGP)"],["fare_per_km","Per KM (EGP)"],["city","City"]].map(([k,label]) => (
              <div key={k as string}><label className="text-xs text-muted-foreground mb-1 block">{label as string}</label>
                <input type={k === "city" ? "text" : "number"} step="0.01" value={(form as any)[k as string]} onChange={(e) => setForm({...form,[k as string]:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            ))}
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Type</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Base Fare</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Per Stop</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Per KM</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th><th className="px-5 py-3" /></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No fares yet</td></tr> : items.map((f) => (
              <tr key={f.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3 font-medium capitalize">{f.fare_type?.replace(/_/g," ")}</td>
                <td className="px-5 py-3">EGP {f.base_fare}</td>
                <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">EGP {f.fare_per_stop}</td>
                <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">EGP {f.fare_per_km}</td>
                <td className="px-5 py-3">{statusBadge(f.status)}</td>
                <td className="px-5 py-3 text-right"><button onClick={() => del(f.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Shuttle Trips ─── */
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export function ShuttleTrips() {
  const [items, setItems] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ route_id: "", vehicle_id: "", driver_id: "", start_time: "", week_days: [] as string[], city: "Cairo" });

  const load = () => {
    setLoading(true);
    Promise.all([api.shuttleTrips(), api.shuttleRoutes(), api.shuttleVehicles()])
      .then(([trips, r, v]) => { setItems(trips); setRoutes(r); setVehicles(v); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function toggleDay(d: string) {
    setForm(f => ({ ...f, week_days: f.week_days.includes(d) ? f.week_days.filter(x => x !== d) : [...f.week_days, d] }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createShuttleTrip({ ...form, week_days: form.week_days.join(",") });
    setShowForm(false); setForm({ route_id: "", vehicle_id: "", driver_id: "", start_time: "", week_days: [], city: "Cairo" }); load();
  }
  async function del(id: number) { if (confirm("Delete trip?")) { await api.deleteShuttleTrip(id); load(); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Shuttle Trips</h1><p className="text-sm text-muted-foreground">{items.length} scheduled trips</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add Trip</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">New Shuttle Trip</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Route</label>
              <select required value={form.route_id} onChange={(e) => setForm({...form,route_id:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select route</option>{routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
              </select></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Vehicle</label>
              <select value={form.vehicle_id} onChange={(e) => setForm({...form,vehicle_id:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select vehicle</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model_name} ({v.vehicle_number})</option>)}
              </select></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Start Time</label>
              <input required type="time" value={form.start_time} onChange={(e) => setForm({...form,start_time:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">City</label>
              <input value={form.city} onChange={(e) => setForm({...form,city:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-2 block">Week Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map(d => <button key={d} type="button" onClick={() => toggleDay(d)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${form.week_days.includes(d) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{d}</button>)}
            </div></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Route</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Vehicle</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Driver</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Time</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden lg:table-cell">Days</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th><th className="px-5 py-3" /></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No shuttle trips yet</td></tr> : items.map((t) => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3 font-medium">{t.route_name || `Route #${t.route_id}`}</td>
                <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell text-xs">{t.vehicle_name || "—"}</td>
                <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{t.driver_name || "—"}</td>
                <td className="px-5 py-3 font-mono text-xs">{t.start_time}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground hidden lg:table-cell">{t.week_days || "—"}</td>
                <td className="px-5 py-3">{statusBadge(t.status)}</td>
                <td className="px-5 py-3 text-right"><button onClick={() => del(t.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Shuttle Pass ─── */
export function ShuttlePass() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration_days: "30", trip_limit: "", city: "Cairo" });

  const load = () => { setLoading(true); api.shuttlePasses().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createShuttlePass({ ...form, price: Number(form.price), duration_days: Number(form.duration_days), trip_limit: form.trip_limit ? Number(form.trip_limit) : null });
    setShowForm(false); setForm({ name: "", description: "", price: "", duration_days: "30", trip_limit: "", city: "Cairo" }); load();
  }
  async function del(id: number) { if (confirm("Delete pass?")) { await api.deleteShuttlePass(id); load(); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Shuttle Passes</h1><p className="text-sm text-muted-foreground">{items.length} pass types</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add Pass</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">New Pass</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["name","Name","text",true],["price","Price (EGP)","number",true],["duration_days","Duration (days)","number",false],["trip_limit","Trip Limit","number",false],["city","City","text",false]].map(([k,label,type,req]) => (
              <div key={k as string}><label className="text-xs text-muted-foreground mb-1 block">{label as string}</label>
                <input required={!!req} type={type as string} step="0.01" value={(form as any)[k as string]} onChange={(e) => setForm({...form,[k as string]:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            ))}
            <div className="col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Description</label><textarea rows={2} value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" /></div>
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <Spinner /> : (
        <div className="grid gap-3">
          {items.length === 0 ? <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">No passes yet</div> : items.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.duration_days} days · {p.trip_limit ? `${p.trip_limit} trips` : "Unlimited"} · {p.city}</div>
                {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-lg font-bold text-primary">EGP {p.price}</div>
                {statusBadge(p.status)}
                <button onClick={() => del(p.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}
