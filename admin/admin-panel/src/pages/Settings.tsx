import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Save } from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.settings().then((data) => {
      const obj = (data && typeof data === "object" && !Array.isArray(data))
        ? (data as Record<string, string>)
        : {};
      setSettings(obj);
      setEdits({ ...obj });
    }).finally(() => setLoading(false));
  }, []);

  async function save(key: string) {
    setSaving(key);
    try {
      await api.updateSetting(key, edits[key]);
      setSettings((prev) => ({ ...prev, [key]: edits[key] }));
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  const keys = Object.keys(settings);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">App configuration and preferences</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          No settings configured yet
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {keys.map((key) => (
              <div key={key} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{key}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    value={edits[key] ?? ""}
                    onChange={(e) => setEdits({ ...edits, [key]: e.target.value })}
                    className="w-48 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    disabled={saving === key || edits[key] === settings[key]}
                    onClick={() => save(key)}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                      saved === key
                        ? "bg-green-500/15 text-green-400"
                        : "bg-primary/15 text-primary hover:bg-primary/25"
                    }`}
                    title="Save"
                  >
                    <Save size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
