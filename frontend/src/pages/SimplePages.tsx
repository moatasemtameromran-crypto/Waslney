import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Pencil } from "lucide-react";

const inputCls = "w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

function TablePage({ title, columns, data, loading, onAdd, onEdit, onDelete, addLabel = "+ Add" }: any) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        {onAdd && (
          <button onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
            <Plus size={16} /> {addLabel}
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {columns.map((c: any) => <th key={c.key} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{c.label}</th>)}
                {(onEdit || onDelete) && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="text-center py-10 text-muted-foreground">No data found</td></tr>
              )}
              {data.map((row: any, i: number) => (
                <tr key={row.id ?? i} className="hover:bg-secondary/30 transition-colors">
                  {columns.map((c: any) => (
                    <td key={c.key} className="px-4 py-3">{c.render ? c.render(row) : String(row[c.key] ?? "—")}</td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {onEdit && (
                          <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Holidays ── */
export function Holidays() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.holidays({ year: String(year), month: String(month) })
      .then(d => setHolidays(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const getDays = () => {
    const days: Date[] = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return days;
  };

  const isHoliday = (date: Date) => holidays.some(h => h.holiday_date === date.toISOString().slice(0, 10));

  const toggleHoliday = async (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    const existing = holidays.find(h => h.holiday_date === dateStr);
    if (existing) await api.deleteHoliday(existing.id);
    else await api.createHoliday({ holiday_date: dateStr } as any);
    load();
  };

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Holiday List</h1>
        <div className="flex gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-4">{MONTHS[month-1]} {year}</h3>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {DAYS_SHORT.map(d => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>)}
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => <div key={`e${i}`} />)}
            {getDays().map(date => {
              const holiday = isHoliday(date);
              return (
                <button key={date.toISOString()} onClick={() => toggleHoliday(date)}
                  className={`text-center py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border ${holiday ? "bg-destructive/80 text-white border-destructive" : "bg-secondary/50 text-foreground border-border hover:bg-primary/10 hover:border-primary/30"}`}>
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">Click a day to mark/unmark as holiday (red)</p>
      </div>
    </div>
  );
}

/* ── Vehicle Types ── */
export function VehicleTypes() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ is_active: 1 });

  const load = () => { setLoading(true); api.vehicleTypes().then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ is_active: 1 }); setEditingId(null); setShowForm(false); };
  const save = async () => {
    if (!form.name) { alert("Name required"); return; }
    if (editingId) await api.updateVehicleType(editingId, form);
    else await api.createVehicleType(form);
    resetForm(); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Vehicle Types</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
          <Plus size={16} /> Add Vehicle Type
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3 max-w-lg">
          <h3 className="font-semibold">{editingId ? "Edit" : "Add"} Vehicle Type</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["name","Name *","text"],["capacity","Capacity","number"],["base_fare","Base Fare","number"],["per_km_rate","Per KM Rate","number"]].map(([k,l,t]) => (
              <div key={k}>
                <label className="text-xs text-muted-foreground mb-1 block">{l}</label>
                <input type={t} value={form[k] || ""} onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))} className={inputCls} />
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm((p: any) => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} className="accent-primary" />
            Active
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-secondary text-sm">Cancel</button>
            <button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <TablePage
        title="" columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "capacity", label: "Capacity" },
          { key: "base_fare", label: "Base Fare" },
          { key: "per_km_rate", label: "Per KM Rate" },
          { key: "is_active", label: "Status", render: (r: any) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.is_active ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
              {r.is_active ? "Active" : "Inactive"}
            </span>
          )},
        ]}
        data={items} loading={loading}
        onEdit={(r: any) => { setForm(r); setEditingId(r.id); setShowForm(true); }}
        onDelete={(r: any) => { if (confirm("Delete?")) api.deleteVehicleType(r.id).then(load); }}
      />
    </div>
  );
}

/* ── Cancellation ── */
export function Cancellation() {
  const [reasons, setReasons] = useState<any[]>([]);
  const [loadingR, setLoadingR] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ role: "passenger" });

  const loadReasons = () => { setLoadingR(true); api.cancellationReasons().then(d => setReasons(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoadingR(false)); };
  useEffect(() => { loadReasons(); }, []);

  const saveReason = async () => {
    if (!form.reason) { alert("Reason required"); return; }
    await api.createCancellationReason(form);
    setForm({ role: "passenger" }); setShowForm(false); loadReasons();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Cancellation</h1>

      {/* Cancellation Reasons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Cancellation Reasons</h2>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
            <Plus size={14} /> Add Reason
          </button>
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 max-w-md">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reason *</label>
              <input value={form.reason || ""} onChange={e => setForm((p: any) => ({ ...p, reason: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Role</label>
              <select value={form.role || "passenger"} onChange={e => setForm((p: any) => ({ ...p, role: e.target.value }))} className={inputCls}>
                <option value="passenger">Passenger</option>
                <option value="driver">Driver</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg bg-secondary text-sm">Cancel</button>
              <button onClick={saveReason} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save</button>
            </div>
          </div>
        )}

        <TablePage
          title="" columns={[
            { key: "id", label: "ID" },
            { key: "reason", label: "Reason" },
            { key: "role", label: "Role" },
          ]}
          data={reasons} loading={loadingR}
          onDelete={(r: any) => { if (confirm("Delete?")) api.deleteCancellationReason(r.id).then(loadReasons); }}
        />
      </div>
    </div>
  );
}

/* ── Delete Requests ── */
export function DeleteRequests() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); api.deleteRequests().then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const approve = async (id: number) => {
    if (!confirm("Approve and delete this user account?")) return;
    await api.approveDeleteRequest(id); load();
  };
  const reject = async (id: number) => {
    await api.rejectDeleteRequest(id); load();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Delete Account Requests</h1>
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {["Name","Email","Phone","Reason","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No requests</td></tr>}
              {items.map(item => (
                <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{item.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === "pending" ? "bg-yellow-500/15 text-yellow-400" : item.status === "approved" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => approve(item.id)} className="px-2 py-1 rounded-md bg-green-500/15 text-green-500 text-xs font-medium hover:bg-green-500/25 transition-colors">Approve</button>
                        <button onClick={() => reject(item.id)} className="px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">Reject</button>
                      </div>
                    )}
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
