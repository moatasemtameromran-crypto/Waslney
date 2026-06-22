import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  UserPlus, ShieldCheck, CalendarDays, Building2, Plus, Trash2,
  Check, X, CheckCircle2,
} from "lucide-react";

const inp = "w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";
const lbl = "text-xs text-muted-foreground mb-1 block";
const btnP = "flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-60";

function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}

/* ══════════════════════════ 1. NEW ACCOUNT ══════════════════════════ */
export function NewAccount() {
  const ROLES = ["passenger", "driver", "admin", "company"];
  const empty = { name: "", phone: "", email: "", password: "", role: "passenger", car: "", plate: "" };
  const [form, setForm] = useState<any>(empty);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [err, setErr] = useState("");
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (form.role === "driver" && (!form.car || !form.plate)) { setErr("Car model and plate are required for drivers."); return; }
    setLoading(true);
    try {
      const res = await api.createAccount(form);
      setCreated(res.user); setForm(empty);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-xl font-bold">New Account</h1>
        <p className="text-sm text-muted-foreground">Create any user — activated immediately, no verification</p>
      </div>

      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className={lbl}>Account type</label>
          <div className="flex gap-2 flex-wrap">
            {ROLES.map((r) => (
              <button type="button" key={r} onClick={() => setForm((p: any) => ({ ...p, role: r }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${form.role === r ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Full name</label><input required value={form.name} onChange={f("name")} className={inp} /></div>
          <div><label className={lbl}>Phone</label><input required value={form.phone} onChange={f("phone")} placeholder="+20100..." className={inp} /></div>
          <div><label className={lbl}>Email (optional)</label><input type="email" value={form.email} onChange={f("email")} className={inp} /></div>
          <div><label className={lbl}>Password</label><input required value={form.password} onChange={f("password")} className={inp} /></div>
        </div>
        {form.role === "driver" && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
            <div><label className={lbl}>Car model</label><input value={form.car} onChange={f("car")} placeholder="Toyota Hiace" className={inp} /></div>
            <div><label className={lbl}>Plate</label><input value={form.plate} onChange={f("plate")} placeholder="أ ب ج 1234" className={inp} /></div>
          </div>
        )}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={loading} className={btnP}><UserPlus size={16} />{loading ? "Creating…" : `Create ${form.role} account`}</button>
      </form>

      {created && (
        <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 text-green-400 text-sm font-semibold mb-1"><CheckCircle2 size={16} /> Account created</div>
          <div className="text-sm">{created.name} · {created.phone} · {created.role}</div>
          <div className="text-xs text-muted-foreground">Status: {created.account_status}</div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ 2. DRIVER REVIEW ══════════════════════════ */
export function DriverReview() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = () => { setLoading(true); api.pendingReview().then((d) => setDrivers(d.drivers || [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function approve(id: number) { setBusy(id); try { await api.approveDriver(id); load(); } finally { setBusy(null); } }
  async function reject(id: number) {
    const note = prompt("Reason for rejection (optional):") ?? "";
    setBusy(id); try { await api.rejectDriver(id, note); load(); } finally { setBusy(null); }
  }

  const Doc = ({ label, url }: { label: string; url?: string }) => (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      {url ? (
        <img src={url} alt={label} onClick={() => setLightbox(url)} className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80" />
      ) : (
        <div className="w-full h-24 rounded-lg border border-dashed border-border flex items-center justify-center text-[11px] text-muted-foreground">None</div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Driver Review</h1>
        <p className="text-sm text-muted-foreground">{drivers.length} driver(s) awaiting approval</p>
      </div>
      {loading ? <Spinner /> : drivers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground">No drivers pending review 🎉</div>
      ) : drivers.map((d) => (
        <div key={d.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {d.profile_photo
                ? <img src={d.profile_photo} className="w-12 h-12 rounded-full object-cover border border-border" onClick={() => setLightbox(d.profile_photo)} />
                : <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold">{d.name?.[0] || "?"}</div>}
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-sm text-muted-foreground">{d.phone} · {d.car || "—"} · {d.plate || "—"}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button disabled={busy === d.id} onClick={() => approve(d.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/15 text-green-400 text-sm hover:bg-green-500/25"><Check size={15} /> Approve</button>
              <button disabled={busy === d.id} onClick={() => reject(d.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm hover:bg-red-500/25"><X size={15} /> Reject</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Doc label="🚗 Car License" url={d.car_license_photo} />
            <Doc label="🪪 Driver License" url={d.driver_license_photo} />
            <Doc label="📄 Criminal Record" url={d.criminal_record_photo} />
          </div>
        </div>
      ))}
      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6">
          <img src={lightbox} className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ 3. MANAGE BOOKINGS ══════════════════════════ */
export function ManageBookings() {
  const [view, setView] = useState<"schedule" | "daily" | "settings">("schedule");
  const [trips, setTrips] = useState<any[]>([]);
  const [tripId, setTripId] = useState("");
  const [schedule, setSchedule] = useState<any>(null);
  const [date, setDate] = useState("");
  const [dayBookings, setDayBookings] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ booking_round_start_day: 5, surge_percent: 10, surge_after_friday: 1 });
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.bookingTripsList().then(setTrips); api.bookingSettings().then(setSettings); }, []);
  useEffect(() => { if (tripId) api.weekSchedule(Number(tripId)).then(setSchedule); else setSchedule(null); }, [tripId]);
  useEffect(() => { api.allDayBookings(date || undefined).then(setDayBookings); }, [date]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    await api.saveBookingSettings({
      booking_round_start_day: Number(settings.booking_round_start_day),
      surge_percent: Number(settings.surge_percent),
      surge_after_friday: settings.surge_after_friday ? 1 : 0,
    });
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Manage Bookings</h1>
        <p className="text-sm text-muted-foreground">Schedule, daily bookings and pricing rules</p>
      </div>
      <div className="flex gap-2">
        {[["schedule", "🗓 Schedule"], ["daily", "📋 Daily"], ["settings", "⚙️ Settings"]].map(([id, label]) => (
          <button key={id} onClick={() => setView(id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${view === id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>

      {view === "schedule" && (
        <div className="space-y-4">
          <select value={tripId} onChange={(e) => setTripId(e.target.value)} className={inp + " max-w-md"}>
            <option value="">Select a trip…</option>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.from_loc} → {t.to_loc} ({t.pickup_time})</option>)}
          </select>
          {schedule && (
            <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">Day</th><th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Booked</th><th className="text-left px-5 py-3 font-medium">Available</th>
                  <th className="text-left px-5 py-3 font-medium">Price</th></tr></thead>
                <tbody>
                  {schedule.schedule.map((s: any) => (
                    <tr key={s.date} className="border-b border-border/50">
                      <td className="px-5 py-3">{s.day_name}</td><td className="px-5 py-3 text-muted-foreground">{s.date}</td>
                      <td className="px-5 py-3">{s.booked}/{s.total_seats}</td>
                      <td className="px-5 py-3">{s.available}</td>
                      <td className="px-5 py-3">EGP {s.effective_price} {s.is_surge && <span className="text-yellow-400 text-xs">surge</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === "daily" && (
        <div className="space-y-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp + " max-w-xs"} />
          <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Passenger</th><th className="text-left px-5 py-3 font-medium">Route</th>
                <th className="text-left px-5 py-3 font-medium">Date</th><th className="text-left px-5 py-3 font-medium">Seats</th>
                <th className="text-left px-5 py-3 font-medium">Driver</th><th className="text-left px-5 py-3 font-medium">Status</th></tr></thead>
              <tbody>
                {dayBookings.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No bookings</td></tr> :
                  dayBookings.map((b) => (
                    <tr key={b.id} className="border-b border-border/50">
                      <td className="px-5 py-3"><div>{b.passenger_name}</div><div className="text-xs text-muted-foreground">{b.passenger_phone}</div></td>
                      <td className="px-5 py-3 text-muted-foreground">{b.from_loc} → {b.to_loc}</td>
                      <td className="px-5 py-3 text-muted-foreground">{b.travel_date}</td>
                      <td className="px-5 py-3">{b.seats}</td>
                      <td className="px-5 py-3 text-muted-foreground">{b.driver_name || "—"}</td>
                      <td className="px-5 py-3">{b.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "settings" && (
        <form onSubmit={saveSettings} className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-md">
          <div>
            <label className={lbl}>Booking round start day</label>
            <select value={settings.booking_round_start_day} onChange={(e) => setSettings({ ...settings, booking_round_start_day: e.target.value })} className={inp}>
              {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Surge percent (%)</label><input type="number" value={settings.surge_percent} onChange={(e) => setSettings({ ...settings, surge_percent: e.target.value })} className={inp} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!Number(settings.surge_after_friday)} onChange={(e) => setSettings({ ...settings, surge_after_friday: e.target.checked ? 1 : 0 })} />
            Apply surge on the booking-round days
          </label>
          <button className={btnP}><CalendarDays size={16} /> Save settings</button>
          {saved && <span className="text-green-400 text-sm ml-3">Saved ✓</span>}
        </form>
      )}
    </div>
  );
}

/* ══════════════════════════ 4. TENDERS ══════════════════════════ */
export function Tenders() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ trip_id: "", duration_minutes: "60", description: "" });

  const load = () => { setLoading(true); api.tenders().then(setTenders).finally(() => setLoading(false)); };
  useEffect(() => { load(); api.bookingTripsList().then(setTrips); }, []);

  async function open(e: React.FormEvent) {
    e.preventDefault();
    await api.openTender({ trip_id: Number(form.trip_id), duration_minutes: Number(form.duration_minutes), description: form.description });
    setShowForm(false); setForm({ trip_id: "", duration_minutes: "60", description: "" }); load();
  }
  async function cancel(id: number) { if (!confirm("Cancel this tender?")) return; await api.cancelTender(id); load(); }

  function badge(s: string) {
    const m: Record<string, string> = { open: "bg-green-500/15 text-green-400", awarded: "bg-blue-500/15 text-blue-400", cancelled: "bg-red-500/15 text-red-400", closed: "bg-muted text-muted-foreground" };
    return <span className={`px-2 py-0.5 rounded-full text-xs ${m[s] || "bg-muted text-muted-foreground"}`}>{s}</span>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Tenders</h1><p className="text-sm text-muted-foreground">{tenders.length} tender(s)</p></div>
        <button onClick={() => setShowForm(!showForm)} className={btnP}><Plus size={16} /> Open Tender</button>
      </div>

      {showForm && (
        <form onSubmit={open} className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold">Open a tender</h3>
          <div><label className={lbl}>Trip</label>
            <select required value={form.trip_id} onChange={(e) => setForm({ ...form, trip_id: e.target.value })} className={inp}>
              <option value="">Select a trip…</option>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.from_loc} → {t.to_loc} ({t.pickup_time})</option>)}
            </select></div>
          <div><label className={lbl}>Duration (minutes)</label><input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className={inp} /></div>
          <div><label className={lbl}>Description (optional)</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} /></div>
          <button className={btnP}><Building2 size={16} /> Open tender</button>
        </form>
      )}

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground">
              <th className="text-left px-5 py-3 font-medium">Route</th><th className="text-left px-5 py-3 font-medium">Ends</th>
              <th className="text-left px-5 py-3 font-medium">Bids</th><th className="text-left px-5 py-3 font-medium">Lowest</th>
              <th className="text-left px-5 py-3 font-medium">Status</th><th className="text-left px-5 py-3 font-medium">Action</th></tr></thead>
            <tbody>
              {tenders.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No tenders</td></tr> :
                tenders.map((t) => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="px-5 py-3">{t.from_loc} → {t.to_loc}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{t.ends_at ? new Date(t.ends_at).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3">{t.bid_count || 0}</td>
                    <td className="px-5 py-3">{t.lowest_bid != null ? `EGP ${t.lowest_bid}` : "—"}</td>
                    <td className="px-5 py-3">{badge(t.status)}</td>
                    <td className="px-5 py-3">
                      {t.status === "open" && <button onClick={() => cancel(t.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 size={14} /></button>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ 5. CREATE TRIP ══════════════════════════ */
export function CreateTrip() {
  const empty = { origin: "", destination: "", date: "", departure_time: "", price: "", seats: "14", driver_id: "" };
  const [form, setForm] = useState<any>(empty);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  useEffect(() => { api.activeDrivers().then(setDrivers).catch(() => setDrivers([])); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const allStops = [
        { type: "pickup", label: form.origin },
        ...stops.map((s) => ({ type: "stop", label: s })),
        { type: "dropoff", label: form.destination },
      ].filter((s) => s.label);
      await api.createTrip({
        origin: form.origin, destination: form.destination,
        date: form.date || null, departure_time: form.departure_time,
        price: Number(form.price), seats: Number(form.seats),
        driver_id: form.driver_id ? Number(form.driver_id) : null,
        stops: allStops,
      });
      setDone(true); setForm(empty); setStops([]);
      setTimeout(() => setDone(false), 3000);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div><h1 className="text-xl font-bold">Create Trip</h1><p className="text-sm text-muted-foreground">Add a new trip with stops and an optional driver</p></div>
      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>From (origin)</label><input required value={form.origin} onChange={f("origin")} className={inp} /></div>
          <div><label className={lbl}>To (destination)</label><input required value={form.destination} onChange={f("destination")} className={inp} /></div>
          <div><label className={lbl}>Date</label><input type="date" value={form.date} onChange={f("date")} className={inp} /></div>
          <div><label className={lbl}>Departure time</label><input type="time" value={form.departure_time} onChange={f("departure_time")} className={inp} /></div>
          <div><label className={lbl}>Price (EGP)</label><input required type="number" value={form.price} onChange={f("price")} className={inp} /></div>
          <div><label className={lbl}>Seats</label><input required type="number" value={form.seats} onChange={f("seats")} className={inp} /></div>
        </div>
        <div>
          <label className={lbl}>Driver (optional)</label>
          <select value={form.driver_id} onChange={f("driver_id")} className={inp}>
            <option value="">— Unassigned —</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Intermediate stops (optional)</label>
          {stops.map((s, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={s} onChange={(e) => setStops(stops.map((x, j) => j === i ? e.target.value : x))} className={inp} placeholder={`Stop ${i + 1}`} />
              <button type="button" onClick={() => setStops(stops.filter((_, j) => j !== i))} className="p-2 rounded-lg bg-red-500/10 text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
          <button type="button" onClick={() => setStops([...stops, ""])} className="flex items-center gap-1.5 text-sm text-primary"><Plus size={14} /> Add stop</button>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={loading} className={btnP}><ShieldCheck size={16} />{loading ? "Creating…" : "Create trip"}</button>
        {done && <span className="text-green-400 text-sm ml-3">Trip created ✓</span>}
      </form>
    </div>
  );
}
