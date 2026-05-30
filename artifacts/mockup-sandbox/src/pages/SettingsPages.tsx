import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Save, Check, Plus, Trash2, Pencil } from "lucide-react";

/* ── Shared helpers ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

function SaveBar({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
        <Save size={15} /> Save Settings
      </button>
      {saved && (
        <span className="flex items-center gap-1 text-green-500 text-sm font-medium">
          <Check size={15} /> Saved
        </span>
      )}
    </div>
  );
}

/* ── General Settings ── */
export function GeneralSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settingsGeneral().then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    await api.updateSettingsGeneral(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const s = (k: string) => ({
    value: settings[k] || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSettings(p => ({ ...p, [k]: e.target.value })),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">General Settings</h1>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-lg">
          <Field label="Client Name">
            <input {...s("client_name")} className={inputCls} placeholder="Waslney" />
          </Field>
          <Field label="Support Email">
            <input type="email" {...s("support_email")} className={inputCls} placeholder="support@waslney.com" />
          </Field>
          <Field label="Brand Logo URL">
            <input {...s("brand_logo")} className={inputCls} placeholder="https://..." />
          </Field>
          <Field label="Favicon URL">
            <input {...s("favicon")} className={inputCls} placeholder="https://..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nearby Stops Count">
              <input type="number" {...s("nearby_stops_count")} className={inputCls} />
            </Field>
            <Field label="Max Nearby Distance (m)">
              <input type="number" {...s("nearby_stops_distance")} className={inputCls} />
            </Field>
          </div>
          <SaveBar onSave={save} saved={saved} />
        </div>
      )}
    </div>
  );
}

/* ── City Settings ── */
export function CitySettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settingsCity("Cairo").then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    await api.updateSettingsCity({ settings: settings, city: "Cairo" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const s = (k: string) => ({
    value: settings[k] || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setSettings(p => ({ ...p, [k]: e.target.value })),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">City Settings</h1>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-lg">
          <Field label="Customer Support Number">
            <input {...s("customer_support_number")} className={inputCls} placeholder="+20..." />
          </Field>
          <Field label="Driver Support Number">
            <input {...s("driver_support_number")} className={inputCls} placeholder="+20..." />
          </Field>
          <Field label="Emergency Number">
            <input {...s("emergency_number")} className={inputCls} placeholder="+20..." />
          </Field>
          <Field label="Service Type">
            <select {...s("service_type")} className={inputCls}>
              <option value="On-Demand and Scheduled">On-Demand and Scheduled</option>
              <option value="shuttle">Shuttle Only</option>
              <option value="on_demand">On Demand Only</option>
            </select>
          </Field>
          <SaveBar onSave={save} saved={saved} />
        </div>
      )}
    </div>
  );
}

/* ── Manager Settings ── */
interface Manager { id: number; name: string; email: string; phone?: string; status: string; }

export function ManagerSettings() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Manager> & { password?: string }>({ status: "active" });

  const load = () => {
    setLoading(true);
    // managers endpoint from old backend
    fetch("/api/managers", { headers: { Authorization: `Bearer ${localStorage.getItem("waslney_admin_token")}` } })
      .then(r => r.json()).then(d => setManagers(Array.isArray(d) ? d : []))
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ status: "active" }); setEditingId(null); setShowForm(false); };

  const save = async () => {
    if (!form.name || !form.email) { alert("Name and email required"); return; }
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/managers/${editingId}` : "/api/managers";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("waslney_admin_token")}` },
      body: JSON.stringify(form),
    });
    resetForm();
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this manager?")) return;
    await fetch(`/api/managers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("waslney_admin_token")}` } });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Manager Settings</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
          <Plus size={16} /> Add Manager
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold">{editingId ? "Edit Manager" : "Add Manager"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *">
              <input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Email *">
              <input type="email" value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} />
            </Field>
            {!editingId && (
              <Field label="Password *">
                <input type="password" value={form.password || ""} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={inputCls} />
              </Field>
            )}
            <Field label="Status">
              <select value={form.status || "active"} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputCls}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-secondary text-sm hover:bg-muted transition-colors">Cancel</button>
            <button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Save</button>
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
                {["ID", "Name", "Email", "Phone", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {managers.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No managers found</td></tr>
              )}
              {managers.map(m => (
                <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{m.id}</td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === "active" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setForm(m); setEditingId(m.id); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(m.id)}
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

/* ── Roles & Permissions ── */
interface Role { id: number; name: string; description?: string; }

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Role>>({});

  const token = () => localStorage.getItem("waslney_admin_token");
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  const load = () => {
    setLoading(true);
    fetch("/api/roles", { headers: headers() as any })
      .then(r => r.json()).then(d => setRoles(Array.isArray(d) ? d : []))
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({}); setEditingId(null); setShowForm(false); };

  const save = async () => {
    if (!form.name) { alert("Role name required"); return; }
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/roles/${editingId}` : "/api/roles";
    await fetch(url, { method, headers: headers() as any, body: JSON.stringify(form) });
    resetForm();
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this role?")) return;
    await fetch(`/api/roles/${id}`, { method: "DELETE", headers: headers() as any });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Roles & Permissions</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
          <Plus size={16} /> Add Role
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-md">
          <h3 className="font-semibold">{editingId ? "Edit Role" : "Add Role"}</h3>
          <Field label="Role Name *">
            <input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Description">
            <input value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputCls} />
          </Field>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-secondary text-sm hover:bg-muted transition-colors">Cancel</button>
            <button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Save</button>
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
                {["ID", "Role Name", "Description", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">No roles found</td></tr>
              )}
              {roles.map(r => (
                <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{r.id}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.description || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setForm(r); setEditingId(r.id); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(r.id)}
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
