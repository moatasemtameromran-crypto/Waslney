import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Pencil, Download } from "lucide-react";

const inputCls = "w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

/* ── Suggested Routes ── */
export function SuggestedRoutes() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); api.suggestedRoutes().then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const exportCSV = () => {
    if (!items.length) return;
    const keys = ["id","user_name","user_phone","pickup_address","dropoff_address","shift_description"];
    const csv = [keys.join(","), ...items.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g,'""')}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv]));
    a.download = "suggested_routes.csv"; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Suggested Routes</h1>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {["Route ID","User Name","Phone","Pickup Address","Drop Address","Shift"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No suggested routes</td></tr>}
              {items.map(item => (
                <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{item.id}</td>
                  <td className="px-4 py-3 font-medium">{item.user_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.user_phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{item.pickup_address || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{item.dropoff_address || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.shift_description || "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm("Delete?")) api.deleteSuggestedRoute(item.id).then(load); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
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

/* ── Driver Documents ── */
export function DriverDocuments() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ status: "active", num_images: 1, doc_required: 1, gallery_restricted: 0 });

  const load = () => { setLoading(true); api.driverDocTypes().then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ status: "active", num_images: 1, doc_required: 1, gallery_restricted: 0 }); setEditingId(null); setShowForm(false); };
  const save = async () => {
    if (!form.doc_name) { alert("Document name required"); return; }
    if (editingId) await api.updateDriverDocType(editingId, form);
    else await api.createDriverDocType(form);
    resetForm(); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Driver Documents</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
          <Plus size={16} /> Add Document
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3 max-w-lg">
          <h3 className="font-semibold">{editingId ? "Edit" : "Add"} Driver Document</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Document Name *</label>
            <input value={form.doc_name || ""} onChange={e => setForm((p: any) => ({ ...p, doc_name: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Document Type</label>
              <select value={form.doc_type || "image"} onChange={e => setForm((p: any) => ({ ...p, doc_type: e.target.value }))} className={inputCls}>
                <option value="image">Image</option>
                <option value="pdf">PDF</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Number of Images</label>
              <input type="number" value={form.num_images || 1} onChange={e => setForm((p: any) => ({ ...p, num_images: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Expired Action</label>
            <select value={form.expired_action || "none"} onChange={e => setForm((p: any) => ({ ...p, expired_action: e.target.value }))} className={inputCls}>
              <option value="none">None</option>
              <option value="block">Block</option>
              <option value="notify">Notify</option>
            </select>
          </div>
          <div className="space-y-2">
            {[["gallery_restricted","Gallery Restricted"],["doc_required","Document Required"],["doc_number_required","Document Number Required"],["expiry_required","Expiry Date Required"]].map(([k,l]) => (
              <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form[k]} onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.checked ? 1 : 0 }))} className="accent-primary" />
                {l}
              </label>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <select value={form.status || "active"} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button>
            <button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {["ID","Document Name","Category","Images","Required","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No documents</td></tr>}
              {items.map(item => (
                <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{item.id}</td>
                  <td className="px-4 py-3 font-medium">{item.doc_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.doc_type || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.num_images}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.doc_required ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {item.doc_required ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === "active" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setForm(item); setEditingId(item.id); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (confirm("Delete?")) api.deleteDriverDocType(item.id).then(load); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
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

/* ── Cities ── */
export function Cities() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ status: "active" });

  const load = () => { setLoading(true); api.cities().then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ status: "active" }); setEditingId(null); setShowForm(false); };
  const save = async () => {
    if (!form.name) { alert("City name required"); return; }
    if (editingId) await api.updateCity(editingId, form);
    else await api.createCity(form);
    resetForm(); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Operational Cities</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
          <Plus size={16} /> Add City
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3 max-w-lg">
          <h3 className="font-semibold">{editingId ? "Edit" : "Add"} City</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">City Name *</label>
            <input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Country</label>
            <input value={form.country || ""} onChange={e => setForm((p: any) => ({ ...p, country: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
              <input type="number" value={form.lat || ""} onChange={e => setForm((p: any) => ({ ...p, lat: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
              <input type="number" value={form.lng || ""} onChange={e => setForm((p: any) => ({ ...p, lng: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Geofence Radius (m)</label>
            <input type="number" value={form.geofence_radius || ""} onChange={e => setForm((p: any) => ({ ...p, geofence_radius: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <select value={form.status || "active"} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button>
            <button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {["ID","City Name","Country","Geofence (m)","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No cities</td></tr>}
              {items.map(item => (
                <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{item.id}</td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.country || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.geofence_radius || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === "active" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setForm(item); setEditingId(item.id); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (confirm("Delete?")) api.deleteCity(item.id).then(load); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
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

/* ── Homescreen ── */
export function Homescreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ active: 1, user_type: "customer", display_order: 1 });

  const CATEGORIES = ["Promotions","Refer & Earn","Verify Documents","What's New","Why Mobility","Video"];

  const load = () => { setLoading(true); api.homescreen().then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ active: 1, user_type: "customer", display_order: 1 }); setEditingId(null); setShowForm(false); };
  const save = async () => {
    if (editingId) await api.updateHomescreenItem(editingId, form);
    else await api.createHomescreenItem(form);
    resetForm(); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">HomeScreen Settings</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
          <Plus size={16} /> Add
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3 max-w-md">
          <h3 className="font-semibold">{editingId ? "Edit" : "Add"} Item</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <select value={form.category || ""} onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))} className={inputCls}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Order</label>
              <input type="number" value={form.display_order || 1} onChange={e => setForm((p: any) => ({ ...p, display_order: Number(e.target.value) }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">User Type</label>
              <select value={form.user_type || "customer"} onChange={e => setForm((p: any) => ({ ...p, user_type: e.target.value }))} className={inputCls}>
                <option value="customer">Customer</option>
                <option value="driver">Driver</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!form.active} onChange={e => setForm((p: any) => ({ ...p, active: e.target.checked ? 1 : 0 }))} className="accent-primary" />
            Active
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button>
            <button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {["Category","Display Order","User Type","Active","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No items</td></tr>}
              {items.map(item => (
                <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.display_order}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.user_type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {item.active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setForm(item); setEditingId(item.id); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (confirm("Delete?")) api.deleteHomescreenItem(item.id).then(load); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
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

/* ── Pushes ── */
export function Pushes() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ user_type: "all" });

  const load = () => { setLoading(true); api.pushHistory().then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!form.title || !form.message) { alert("Title and message required"); return; }
    await api.sendPush(form);
    setForm({ user_type: "all" }); setShowForm(false); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Push Notifications</h1>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
          <Plus size={16} /> New Notification
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3 max-w-lg">
          <h3 className="font-semibold">Send Push Notification</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
            <input value={form.title || ""} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Message *</label>
            <textarea value={form.message || ""} onChange={e => setForm((p: any) => ({ ...p, message: e.target.value }))} rows={3}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-vertical" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Send To</label>
            <select value={form.user_type || "all"} onChange={e => setForm((p: any) => ({ ...p, user_type: e.target.value }))} className={inputCls}>
              <option value="all">All</option>
              <option value="passenger">Passengers</option>
              <option value="driver">Drivers</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button>
            <button onClick={send} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Send</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {["ID","Title","Message","Target","Date","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No notifications sent</td></tr>}
              {items.map(item => (
                <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{item.id}</td>
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{item.message}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.user_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.created_at?.slice(0, 10) || "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm("Delete?")) api.deletePush(item.id).then(load); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
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
