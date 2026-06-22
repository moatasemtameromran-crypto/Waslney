import { useEffect, useState } from "react";
import { api, Promotion } from "@/lib/api";
import { Plus, Trash2, Tag } from "lucide-react";

export default function Promotions() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", discount_type: "percentage", discount_value: "", min_fare: "", usage_limit: "", valid_from: "", valid_to: "" });

  const load = () => { setLoading(true); api.promotions().then(setPromos).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await api.createPromotion({ ...form, discount_value: Number(form.discount_value), min_fare: Number(form.min_fare), usage_limit: form.usage_limit ? Number(form.usage_limit) : null } as any);
    setShowForm(false);
    setForm({ code: "", discount_type: "percentage", discount_value: "", min_fare: "", usage_limit: "", valid_from: "", valid_to: "" });
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this promotion?")) return;
    await api.deletePromotion(id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Promotions</h1>
          <p className="text-sm text-muted-foreground">{promos.length} promo codes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus size={16} /> Add Promo
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">New Promotion</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Code</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="percentage">Percentage</option><option value="fixed">Fixed</option>
              </select></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Discount Value</label>
              <input required type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Min Fare</label>
              <input type="number" value={form.min_fare} onChange={(e) => setForm({ ...form, min_fare: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Max Uses</label>
              <input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Valid From</label>
              <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Valid Until</label>
              <input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Create</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : promos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Tag size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No promotions yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {promos.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 rounded-lg bg-primary/15 text-primary font-bold font-mono text-sm">{p.code}</div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {p.discount_value}{p.discount_type === "percentage" ? "%" : " EGP"} off
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.used_count || 0}/{(p as any).usage_limit || "∞"} used · {(p as any).valid_to ? `Expires ${new Date((p as any).valid_to).toLocaleDateString()}` : "No expiry"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(p as any).status === "active" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {(p as any).status === "active" ? "Active" : "Inactive"}
                </span>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
