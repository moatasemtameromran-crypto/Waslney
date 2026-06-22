import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, CheckCircle, XCircle, Send, FileText, Globe } from "lucide-react";

function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-500/15 text-green-400",
    inactive: "bg-muted text-muted-foreground",
    pending: "bg-yellow-500/15 text-yellow-400",
    reviewed: "bg-blue-500/15 text-blue-400",
    accepted: "bg-green-500/15 text-green-400",
    rejected: "bg-red-500/15 text-red-400",
    sent: "bg-blue-500/15 text-blue-400",
    draft: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

/* ─── Suggested Routes ─── */
export function SuggestedRoutes() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => { setLoading(true); api.suggestedRoutes().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function updateStatus(id: number, status: string) {
    setUpdating(id);
    try { await api.updateSuggestedRoute(id, status); load(); } finally { setUpdating(null); }
  }
  async function del(id: number) { if (confirm("Delete this suggestion?")) { await api.deleteSuggestedRoute(id); load(); } }

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Suggested Routes</h1><p className="text-sm text-muted-foreground">{items.length} passenger suggestions</p></div>
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Passenger</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Pickup</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Dropoff</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Actions</th></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No suggestions yet</td></tr> : items.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3"><div className="font-medium">{s.user_name || "Anonymous"}</div><div className="text-xs text-muted-foreground">{s.user_phone}</div></td>
                <td className="px-5 py-3 text-muted-foreground text-xs hidden sm:table-cell max-w-[150px] truncate">{s.pickup_address}</td>
                <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-[150px] truncate">{s.dropoff_address}</td>
                <td className="px-5 py-3">{statusBadge(s.status)}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1.5">
                    {s.status === "pending" && (
                      <>
                        <button disabled={updating === s.id} onClick={() => updateStatus(s.id, "accepted")} className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20" title="Accept"><CheckCircle size={14} /></button>
                        <button disabled={updating === s.id} onClick={() => updateStatus(s.id, "rejected")} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Reject"><XCircle size={14} /></button>
                      </>
                    )}
                    <button onClick={() => del(s.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Driver Documents ─── */
export function DriverDocuments() {
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ document_name: "", document_category: "identity", document_type: "image", number_of_images: "1", city: "Cairo" });

  const load = () => {
    setLoading(true);
    api.driverDocTypes()
      .then(setDocTypes)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function createType(e: React.FormEvent) {
    e.preventDefault();
    await api.createDriverDocType({ ...form, number_of_images: Number(form.number_of_images) });
    setShowForm(false); setForm({ document_name: "", document_category: "identity", document_type: "image", number_of_images: "1", city: "Cairo" }); load();
  }
  async function delType(id: number) { if (confirm("Delete doc type?")) { await api.deleteDriverDocType(id); load(); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Driver Documents</h1><p className="text-sm text-muted-foreground">Configure required document types</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add Type</button>
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {showForm && (
            <form onSubmit={createType} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold">New Document Type</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Name</label><input required value={form.document_name} onChange={(e) => setForm({...form,document_name:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Category</label><select value={form.document_category} onChange={(e) => setForm({...form,document_category:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="identity">Identity</option><option value="vehicle">Vehicle</option><option value="license">License</option><option value="other">Other</option></select></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Type</label><select value={form.document_type} onChange={(e) => setForm({...form,document_type:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="image">Image</option><option value="pdf">PDF</option></select></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Number of Images</label><input type="number" min="1" value={form.number_of_images} onChange={(e) => setForm({...form,number_of_images:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">City</label><input value={form.city} onChange={(e) => setForm({...form,city:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
            </form>
          )}
          <div className="bg-card border border-border rounded-xl overflow-hidden">

            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Name</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Category</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Required</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th><th className="px-5 py-3" /></tr></thead>
              <tbody>{docTypes.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No doc types configured</td></tr> : docTypes.map((d) => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-5 py-3 font-medium">{d.document_name}</td>
                  <td className="px-5 py-3 text-muted-foreground capitalize">{d.document_category}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">{d.doc_required ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-muted-foreground" />}</td>
                  <td className="px-5 py-3">{statusBadge(d.status)}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => delType(d.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Operational Cities (Geofence) ─── */
export function Cities() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", country: "Egypt", lat: "", lng: "", geofence_radius: "" });

  const load = () => { setLoading(true); api.cities().then(setItems).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createCity({ ...form, lat: form.lat ? Number(form.lat) : null, lng: form.lng ? Number(form.lng) : null, geofence_radius: form.geofence_radius ? Number(form.geofence_radius) : null });
    setShowForm(false); setForm({ name: "", country: "Egypt", lat: "", lng: "", geofence_radius: "" }); load();
  }
  async function del(id: number) { if (confirm("Delete city?")) { await api.deleteCity(id); load(); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Operational Cities</h1><p className="text-sm text-muted-foreground">{items.length} cities configured</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add City</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">New City</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["name","City Name","text",true],["country","Country","text",false],["lat","Latitude","number",false],["lng","Longitude","number",false],["geofence_radius","Geofence Radius (m)","number",false]].map(([k,label,type,req]) => (
              <div key={k as string}><label className="text-xs text-muted-foreground mb-1 block">{label as string}</label>
                <input required={!!req} type={type as string} step="any" value={(form as any)[k as string]} onChange={(e) => setForm({...form,[k as string]:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            ))}
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <Spinner /> : (
        <div className="grid gap-3">
          {items.length === 0 ? <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">No cities configured</div> : items.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center"><Globe size={18} className="text-primary" /></div>
                <div>
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.country} {c.lat ? `· ${c.lat}, ${c.lng}` : ""} {c.geofence_radius ? `· Radius: ${c.geofence_radius}m` : ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(c.status)}
                <button onClick={() => del(c.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Homescreen ─── */
const CATEGORIES = ["Promotions","Refer & Earn","Verify Documents","What's New","Why Mobility"];

export function Homescreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "Promotions", display_order: "1", active: true, user_type: "Customer", geofence_name: "Default", city: "Cairo" });

  const load = () => { setLoading(true); api.homescreen().then(d => setItems(Array.isArray(d) ? d : (d.items || []))).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.createHomescreenItem({ ...form, display_order: Number(form.display_order) });
    setShowForm(false); load();
  }
  async function toggleActive(id: number, active: boolean) { await api.updateHomescreenItem(id, { active: !active }); load(); }
  async function del(id: number) { if (confirm("Delete item?")) { await api.deleteHomescreenItem(id); load(); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Dynamic HomeScreen</h1><p className="text-sm text-muted-foreground">{items.length} items</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"><Plus size={16} /> Add Item</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">New HomeScreen Item</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Category</label><select value={form.category} onChange={(e) => setForm({...form,category:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">User Type</label><select value={form.user_type} onChange={(e) => setForm({...form,user_type:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option>Customer</option><option>Driver</option></select></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Display Order</label><input type="number" value={form.display_order} onChange={(e) => setForm({...form,display_order:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Geofence Name</label><input value={form.geofence_name} onChange={(e) => setForm({...form,geofence_name:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">City</label><input value={form.city} onChange={(e) => setForm({...form,city:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" id="active_hs" checked={form.active} onChange={(e) => setForm({...form,active:e.target.checked})} className="rounded accent-primary" /><label htmlFor="active_hs" className="text-sm">Active</label></div>
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button></div>
        </form>
      )}
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-muted-foreground font-medium">Category</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">User Type</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Order</th><th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">City</th><th className="text-left px-5 py-3 text-muted-foreground font-medium">Active</th><th className="px-5 py-3" /></tr></thead>
            <tbody>{items.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No homescreen items</td></tr> : items.map((h) => (
              <tr key={h.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3 font-medium">{h.category}</td>
                <td className="px-5 py-3 text-muted-foreground">{h.user_type}</td>
                <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{h.display_order}</td>
                <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{h.city}</td>
                <td className="px-5 py-3">
                  <button onClick={() => toggleActive(h.id, h.active)} className={`w-10 h-5 rounded-full transition-colors relative ${h.active ? "bg-primary" : "bg-muted"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${h.active ? "left-5" : "left-0.5"}`} />
                  </button>
                </td>
                <td className="px-5 py-3 text-right"><button onClick={() => del(h.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Push Notifications ─── */
export function Pushes() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", image_url: "", target_type: "all", city: "Cairo" });

  const load = () => { setLoading(true); api.pushHistory().then(setHistory).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function sendPush(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api.sendPush(form);
      setSent(true);
      setForm({ title: "", message: "", image_url: "", target_type: "all", city: "Cairo" });
      setTimeout(() => setSent(false), 3000);
      load();
    } finally { setSending(false); }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Push Notifications</h1><p className="text-sm text-muted-foreground">Send and manage push notifications</p></div>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Send size={16} className="text-primary" /> Compose & Send</h2>
          <form onSubmit={sendPush} className="space-y-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Title</label><input required value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Message</label><textarea required rows={3} value={form.message} onChange={(e) => setForm({...form,message:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Image URL (optional)</label><input value={form.image_url} onChange={(e) => setForm({...form,image_url:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Target</label><select value={form.target_type} onChange={(e) => setForm({...form,target_type:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="all">All Users</option><option value="passengers">Passengers</option><option value="drivers">Drivers</option></select></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">City</label><input value={form.city} onChange={(e) => setForm({...form,city:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            </div>
            <button type="submit" disabled={sending} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${sent ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"} disabled:opacity-60`}>
              <Send size={15} />{sent ? "Sent!" : sending ? "Sending..." : "Send Notification"}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border font-semibold">Sent History</div>
          {loading ? <Spinner /> : history.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-10">No notifications sent yet</div>
          ) : (
            <div className="divide-y divide-border overflow-y-auto max-h-96">
              {history.map((h) => (
                <div key={h.id} className="px-5 py-3 hover:bg-secondary/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{h.title}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{h.message}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                        <span>→ {h.target_type}</span>
                        <span>{h.city}</span>
                        {h.sent_count > 0 && <span>{h.sent_count} recipients</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.status === "sent" ? "bg-blue-500/15 text-blue-400" : "bg-muted text-muted-foreground"}`}>{h.status}</span>
                      <div className="text-xs text-muted-foreground mt-1">{h.sent_at ? new Date(h.sent_at).toLocaleDateString() : new Date(h.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
