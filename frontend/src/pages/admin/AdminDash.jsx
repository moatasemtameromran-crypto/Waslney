import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../App.jsx';

const API = (path) => `/api${path}`;
const token = () => localStorage.getItem('shuttle_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

async function apiFetch(path, opts = {}) {
  const res = await fetch(API(path), { headers: authHeaders(), ...opts });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.json();
}

// ── Colour palette ───────────────────────────────────────────────────────────
const C = {
  bg: '#eef1f6',
  white: '#fff',
  blue: '#0065ff',
  blueLight: '#e6f0ff',
  sidebar: '#fff',
  border: '#e0e7ff',
  text: '#1e293b',
  muted: '#6b7280',
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f97316',
  purple: '#8b5cf6',
  yellow: '#eab308',
};

// ── Tiny reusable components ─────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = 'primary', small, style, disabled }) => {
  const base = { cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', borderRadius: 6, fontWeight: 600, padding: small ? '6px 14px' : '9px 20px', fontSize: small ? 13 : 14, transition: 'opacity .15s', opacity: disabled ? 0.6 : 1 };
  const variants = {
    primary: { background: C.blue, color: '#fff' },
    danger:  { background: C.red, color: '#fff' },
    ghost:   { background: C.blueLight, color: C.blue },
    outline: { background: 'transparent', border: `1px solid ${C.border}`, color: C.text },
    success: { background: C.green, color: '#fff' },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Input = ({ label, value, onChange, type = 'text', placeholder, style, readOnly }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: C.text }}>{label}</label>}
    <input
      type={type} value={value || ''} onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder} readOnly={readOnly}
      style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 14, outline: 'none', background: readOnly ? '#f8fafc' : '#fff', fontFamily: 'Poppins, sans-serif', ...style }}
    />
  </div>
);

const Select = ({ label, value, onChange, options, style }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: C.text }}>{label}</label>}
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 14, background: C.white, fontFamily: 'Poppins, sans-serif', ...style }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: C.white, borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.06)', border: `1px solid ${C.border}`, ...style }}>{children}</div>
);

const Table = ({ columns, data, onEdit, onDelete, extraActions }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          {columns.map(c => <th key={c.key} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{c.label}</th>)}
          {(onEdit || onDelete || extraActions) && <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>Action</th>}
        </tr>
      </thead>
      <tbody>
        {!data.length && <tr><td colSpan={columns.length + 1} style={{ padding: '32px', textAlign: 'center', color: C.muted }}>No data found</td></tr>}
        {data.map((row, i) => (
          <tr key={row.id || i} style={{ borderBottom: `1px solid ${C.border}` }}>
            {columns.map(c => <td key={c.key} style={{ padding: '10px 12px', color: C.text }}>{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>)}
            {(onEdit || onDelete || extraActions) && (
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {onEdit && <Btn small variant="ghost" onClick={() => onEdit(row)}>Edit</Btn>}
                  {extraActions && extraActions(row)}
                  {onDelete && <Btn small variant="danger" onClick={() => onDelete(row)}>Delete</Btn>}
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Badge = ({ label, color }) => (
  <span style={{ background: color + '22', color, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>{label}</span>
);

const statusBadge = (s) => {
  if (!s) return null;
  const color = s === 'active' ? C.green : s === 'inactive' ? C.muted : s === 'rejected' ? C.red : s === 'pending_review' ? C.orange : C.muted;
  return <Badge label={s} color={color} />;
};

const Modal = ({ title, children, onClose, wide }) => (
  <div style={{ position: 'fixed', inset: 0, background: '#00000066', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div style={{ background: C.white, borderRadius: 12, padding: 28, width: wide ? 700 : 540, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px #0003' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const StatCard = ({ label, value, color = C.blue, icon }) => (
  <div style={{ background: C.white, borderRadius: 10, padding: '18px 20px', flex: 1, minWidth: 140, boxShadow: '0 1px 4px rgba(0,0,0,.06)', border: `1px solid ${C.border}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{value ?? 0}</div>
      </div>
      {icon && <div style={{ background: color + '18', borderRadius: 8, padding: '8px', fontSize: 20 }}>{icon}</div>}
    </div>
  </div>
);

// ── useCrud hook ──────────────────────────────────────────────────────────────
function useCrud(endpoint) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(endpoint).then(d => setItems(Array.isArray(d) ? d : [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const create = async (body) => { const r = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }); load(); return r; };
  const update = async (id, body) => { const r = await apiFetch(`${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(body) }); load(); return r; };
  const remove = async (id) => { await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' }); load(); };

  return { items, loading, error, load, create, update, remove };
}

// ── Leaflet map hook ──────────────────────────────────────────────────────────
function useLeafletMap(ref, options = {}) {
  const mapRef = useRef(null);

  const init = useCallback((center = [30.0626, 31.2497], zoom = 11) => {
    if (!ref.current || mapRef.current) return;
    import('leaflet').then(L => {
      const Lf = L.default || L;
      const map = Lf.map(ref.current, { center, zoom });
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
      if (options.onInit) options.onInit(map, Lf);
    });
  }, []);

  const destroy = useCallback(() => {
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
  }, []);

  return { mapInstance: mapRef, init, destroy };
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = C.blue, height = 160, label = '' }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div>
      {label && <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
        {data.map((d, i) => {
          const val = Number(d[valueKey]) || 0;
          const h = Math.max(3, (val / max) * (height - 28));
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{val > 0 ? val : ''}</div>
              <div title={`${d[labelKey]}: ${val}`} style={{ width: '100%', height: h, background: `linear-gradient(180deg, ${color}cc, ${color})`, borderRadius: '4px 4px 0 0', transition: 'height .3s', cursor: 'default' }} />
              <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', overflow: 'hidden', maxWidth: 44, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {String(d[labelKey]).slice(-5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SVG Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ segments, size = 140 }) {
  const r = 50, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
  let offset = 0;
  const arcs = segments.map(seg => {
    const len = ((seg.value || 0) / total) * circumference;
    const arc = { ...seg, offset, len };
    offset += len;
    return arc;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} viewBox="0 0 140 140">
        {arcs.map((arc, i) => (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={arc.color} strokeWidth={22}
            strokeDasharray={`${arc.len} ${circumference - arc.len}`}
            strokeDashoffset={-arc.offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 18, fontWeight: 700, fill: C.text }}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 10, fill: C.muted }}>Total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ color: C.muted }}>{s.label}</span>
            <span style={{ fontWeight: 700, color: C.text, marginLeft: 'auto' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const adminMapRef = useRef(null);
  const adminLeafletMap = useRef(null);
  const adminPins = useRef({});

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/dashboard?period=${period}`)
      .then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  // Live admin map
  useEffect(() => {
    if (!adminMapRef.current || adminLeafletMap.current) return;
    import('leaflet').then(L => {
      const Lf = L.default || L;
      const map = Lf.map(adminMapRef.current, { center: [30.0626, 31.2497], zoom: 11 });
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      adminLeafletMap.current = map;
      apiFetch('/location/all').then(locs => {
        if (!Array.isArray(locs)) return;
        locs.forEach(d => {
          if (!d.lat || !d.lng) return;
          const icon = Lf.divIcon({
            html: `<div style="background:#0065ff;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3)">🚐 ${d.driver_name || 'Driver'}</div>`,
            className: '', iconAnchor: [0, 0],
          });
          adminPins.current[d.driver_id] = Lf.marker([parseFloat(d.lat), parseFloat(d.lng)], { icon }).addTo(map).bindPopup(`${d.driver_name}`);
        });
      }).catch(() => {});
      setTimeout(() => map.invalidateSize(), 300);
    });
    return () => { if (adminLeafletMap.current) { adminLeafletMap.current.remove(); adminLeafletMap.current = null; } };
  }, []);

  const periods = ['today', '7d', '30d'];
  const periodLabel = { today: 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {periods.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13,
                background: period === p ? C.blue : C.white, color: period === p ? '#fff' : C.text, fontWeight: 600 }}>
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color: C.muted }}>Loading…</p> : stats && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total Bookings"  value={stats.total_bookings}   color={C.blue}   icon="📋" />
            <StatCard label="Booked"          value={stats.booked_bookings}  color={C.green}  icon="✅" />
            <StatCard label="Cancelled"       value={stats.cancelled_bookings} color={C.red}  icon="❌" />
            <StatCard label="Completed"       value={stats.completed_bookings} color={C.purple} icon="🏁" />
            <StatCard label="Total Earning"   value={`${stats.total_earning?.toFixed(0)} EGP`} color={C.green} icon="💰" />
            <StatCard label="New Users"       value={stats.new_users}        color={C.orange} icon="👤" />
            <StatCard label="Active Trips"    value={stats.active_trips}     color={C.blue}   icon="🚐" />
            <StatCard label="Missed"          value={stats.missed_bookings}  color={C.orange} icon="⏰" />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Revenue chart */}
            {stats.revenue_chart?.length > 0 && (
              <Card>
                <BarChart data={stats.revenue_chart} valueKey="revenue" labelKey="date" color={C.blue} label="Revenue — Last 7 Days (EGP)" height={180} />
              </Card>
            )}

            {/* Bookings status donut */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Bookings Breakdown</div>
              <DonutChart segments={[
                { label: 'Booked',    value: stats.booked_bookings    || 0, color: C.green },
                { label: 'Cancelled', value: stats.cancelled_bookings || 0, color: C.red },
                { label: 'Completed', value: stats.completed_bookings || 0, color: C.purple },
                { label: 'Active',    value: stats.active_bookings    || 0, color: C.blue },
              ]} />
            </Card>
          </div>

          {/* New users bar */}
          {stats.revenue_chart?.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              <BarChart data={stats.revenue_chart} valueKey="new_users" labelKey="date" color={C.orange} label="New Users — Last 7 Days" height={140} />
            </Card>
          )}
        </>
      )}

      {/* Live map */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Live Driver Locations</div>
        <div style={{ position: 'relative', height: 360, borderRadius: 8, overflow: 'hidden' }}>
          <div ref={adminMapRef} style={{ height: '100%', width: '100%' }} />
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>🚐 Active drivers shown on map</div>
      </Card>

      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    </div>
  );
}

// ── Stops page with Leaflet map ───────────────────────────────────────────────
function StopsPage() {
  const { items, loading, create, update, remove, load } = useCrud('/shuttle/stops');
  const [modal, setModal] = useState(null);  // 'add' | 'edit' | 'map'
  const [form, setForm] = useState({});
  const [mapMode, setMapMode] = useState(false);

  // Map refs
  const mapDivRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const clickMarker = useRef(null);

  const openAdd = () => { setForm({ status: 'active', radius: 100 }); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row }); setModal('edit'); };

  const save = async () => {
    if (!form.name) { alert('Name is required'); return; }
    if (!form.lat || !form.lng) { alert('Latitude and longitude are required'); return; }
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };

  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  // Init stops map
  const initStopsMap = useCallback(() => {
    if (!mapDivRef.current || leafletMap.current) return;
    import('leaflet').then(L => {
      const Lf = L.default || L;
      const map = Lf.map(mapDivRef.current, { center: [30.0626, 31.2497], zoom: 11 });
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      leafletMap.current = map;

      // Add existing stops
      items.forEach(stop => {
        if (!stop.lat || !stop.lng) return;
        const color = stop.status === 'active' ? '#22c55e' : '#6b7280';
        const icon = Lf.divIcon({
          html: `<div style="background:${color};color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">${stop.name}</div>`,
          className: '', iconAnchor: [0, 0],
        });
        markersRef.current.push(
          Lf.marker([parseFloat(stop.lat), parseFloat(stop.lng)], { icon })
            .addTo(map)
            .bindPopup(`<b>${stop.name}</b><br/>${stop.address || ''}<br/>Radius: ${stop.radius}m`)
        );
      });

      if (markersRef.current.length > 1) {
        const group = Lf.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds(), { padding: [40, 40] });
      }

      // Click to place new stop
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (clickMarker.current) map.removeLayer(clickMarker.current);
        const icon = Lf.divIcon({
          html: `<div style="background:#0065ff;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">📍 New stop</div>`,
          className: '', iconAnchor: [0, 0],
        });
        clickMarker.current = Lf.marker([lat, lng], { icon }).addTo(map).bindPopup('Click "Add Here" to create a stop').openPopup();

        // Open add modal with pre-filled lat/lng
        setForm({ status: 'active', radius: 100, lat: lat.toFixed(6), lng: lng.toFixed(6) });
        setModal('add');
      });

      setTimeout(() => map.invalidateSize(), 300);
    });
  }, [items]);

  useEffect(() => {
    if (mapMode) {
      setTimeout(initStopsMap, 50);
    } else {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; markersRef.current = []; clickMarker.current = null; }
    }
    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
  }, [mapMode]);

  return (
    <div>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Stops Management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant={mapMode ? 'primary' : 'outline'} small onClick={() => setMapMode(v => !v)}>
            {mapMode ? '📋 Table View' : '🗺️ Map View'}
          </Btn>
          <Btn onClick={openAdd}>+ Add Stop</Btn>
        </div>
      </div>

      {/* Map view */}
      {mapMode && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            🟢 Active stops shown as green labels · Click anywhere on the map to add a new stop
          </div>
          <div ref={mapDivRef} style={{ height: 480, borderRadius: 8, overflow: 'hidden' }} />
        </Card>
      )}

      {/* Table view */}
      {loading ? <p>Loading…</p> : (
        <Card>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>{items.length} Results Found</p>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Name' },
              { key: 'address', label: 'Stop Location' },
              { key: 'lat', label: 'Latitude', render: r => r.lat ? parseFloat(r.lat).toFixed(5) : '—' },
              { key: 'lng', label: 'Longitude', render: r => r.lng ? parseFloat(r.lng).toFixed(5) : '—' },
              { key: 'radius', label: 'Radius', render: r => `${r.radius || 100}m` },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete stop?')) remove(r.id); }}
          />
        </Card>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Stop' : 'Edit Stop'} onClose={() => { setModal(null); if (clickMarker.current && leafletMap.current) { leafletMap.current.removeLayer(clickMarker.current); clickMarker.current = null; } }}>
          <StopPickerModal form={form} setForm={setForm} />
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <Input label="Radius (meters)" {...f('radius')} type="number" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Stop picker modal (embedded mini-map + form) ──────────────────────────────
function StopPickerModal({ form, setForm }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const marker = useRef(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    import('leaflet').then(L => {
      const Lf = L.default || L;
      const lat = parseFloat(form.lat) || 30.0626;
      const lng = parseFloat(form.lng) || 31.2497;
      const map = Lf.map(mapRef.current, { center: [lat, lng], zoom: form.lat ? 15 : 11 });
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      leafletMap.current = map;

      const icon = Lf.divIcon({ html: `<div style="width:16px;height:16px;border-radius:50%;background:#0065ff;border:3px solid #fff;box-shadow:0 0 8px #0065ff88"></div>`, iconSize: [16, 16], iconAnchor: [8, 8], className: '' });

      if (form.lat && form.lng) {
        marker.current = Lf.marker([lat, lng], { icon, draggable: true }).addTo(map);
        marker.current.on('dragend', e => {
          const p = e.target.getLatLng();
          setForm(prev => ({ ...prev, lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) }));
        });
      }

      map.on('click', e => {
        const { lat: la, lng: ln } = e.latlng;
        if (marker.current) map.removeLayer(marker.current);
        marker.current = Lf.marker([la, ln], { icon, draggable: true }).addTo(map);
        marker.current.on('dragend', ev => {
          const p = ev.target.getLatLng();
          setForm(prev => ({ ...prev, lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) }));
        });
        setForm(prev => ({ ...prev, lat: la.toFixed(6), lng: ln.toFixed(6) }));
      });

      setTimeout(() => map.invalidateSize(), 200);
    });
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  return (
    <>
      <Input label="Stop Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Main Street Stop" />
      <Input label="Address" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="Street address" />
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.text }}>Location — click map to place pin</label>
        <div ref={mapRef} style={{ height: 260, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Input label="Latitude" value={form.lat} onChange={v => setForm(p => ({ ...p, lat: v }))} type="number" placeholder="30.0626" />
          <Input label="Longitude" value={form.lng} onChange={v => setForm(p => ({ ...p, lng: v }))} type="number" placeholder="31.2497" />
        </div>
      </div>
    </>
  );
}

// ── Routes ───────────────────────────────────────────────────────────────────
function RoutesPage() {
  const { items, loading, create, update, remove } = useCrud('/shuttle/routes');
  const { items: stops } = useCrud('/shuttle/stops');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [selectedStops, setSelectedStops] = useState([]);

  const openAdd = () => { setForm({ status: 'active', customer_fare: 0, driver_fare: 0 }); setSelectedStops([]); setModal('add'); };
  const openEdit = (row) => { setForm(row); setSelectedStops((row.stops || []).map(s => s.id)); setModal('edit'); };
  const save = async () => {
    const body = { ...form, stop_ids: selectedStops };
    if (modal === 'add') await create(body); else await update(form.id, body);
    setModal(null);
  };
  const toggleStop = (id) => setSelectedStops(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Routes Management</h2>
        <Btn onClick={openAdd}>+ Add Route</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Route' },
              { key: 'stop_count', label: 'Stops' },
              { key: 'customer_fare', label: 'Customer Fare' },
              { key: 'driver_fare', label: 'Driver Fare' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete route?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Route' : 'Edit Route'} onClose={() => setModal(null)} wide>
          <RouteMapPreview stops={stops} selectedStops={selectedStops} />
          <Input label="Route Name *" {...f('name')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Customer Fare" {...f('customer_fare')} type="number" />
            <Input label="Driver Fare" {...f('driver_fare')} type="number" />
          </div>
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: C.text }}>Select Stops (in order)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 140, overflowY: 'auto', padding: 4 }}>
              {stops.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', background: selectedStops.includes(s.id) ? C.blueLight : '#f8fafc', padding: '5px 10px', borderRadius: 6, border: `1px solid ${selectedStops.includes(s.id) ? C.blue : C.border}`, color: selectedStops.includes(s.id) ? C.blue : C.text }}>
                  <input type="checkbox" checked={selectedStops.includes(s.id)} onChange={() => toggleStop(s.id)} style={{ accentColor: C.blue }} />
                  {s.name}
                </label>
              ))}
            </div>
            {selectedStops.length > 0 && <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{selectedStops.length} stop(s) selected</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Route map preview (inside modal) ─────────────────────────────────────────
function RouteMapPreview({ stops, selectedStops }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    import('leaflet').then(L => {
      const Lf = L.default || L;
      const map = Lf.map(mapRef.current, { center: [30.0626, 31.2497], zoom: 11, zoomControl: false });
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      leafletMap.current = map;

      const selected = stops.filter(s => selectedStops.includes(s.id) && s.lat && s.lng);
      const bounds = [];
      selected.forEach((s, i) => {
        const icon = Lf.divIcon({ html: `<div style="background:#0065ff;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px #0065ff66">${i + 1}</div>`, iconSize: [22, 22], iconAnchor: [11, 11], className: '' });
        Lf.marker([parseFloat(s.lat), parseFloat(s.lng)], { icon }).addTo(map).bindPopup(s.name);
        bounds.push([parseFloat(s.lat), parseFloat(s.lng)]);
      });
      if (bounds.length > 1) {
        Lf.polyline(bounds, { color: C.blue, weight: 3, dashArray: '8,5' }).addTo(map);
        map.fitBounds(bounds, { padding: [30, 30] });
      }
      setTimeout(() => map.invalidateSize(), 200);
    });
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, [selectedStops, stops]);

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.text }}>Route Preview Map</label>
      <div ref={mapRef} style={{ height: 200, borderRadius: 8, border: `1px solid ${C.border}` }} />
    </div>
  );
}

// ── Vehicles ──────────────────────────────────────────────────────────────────
function VehiclesPage() {
  const { items, loading, create, update, remove } = useCrud('/shuttle/vehicles');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const openAdd = () => { setForm({ status: 'active', seats: 20, doors: 2, total_rows: 5, total_columns: 4 }); setModal('add'); };
  const openEdit = (row) => { setForm(row); setModal('edit'); };
  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Vehicle</h2>
        <Btn onClick={openAdd}>+ Add Vehicle</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'vehicle_type_name', label: 'Vehicle Type' },
              { key: 'brand', label: 'Brand' },
              { key: 'model_name', label: 'Model Name' },
              { key: 'vehicle_number', label: 'Vehicle Number' },
              { key: 'seats', label: 'Seats' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete vehicle?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Vehicle' : 'Edit Vehicle'} onClose={() => setModal(null)}>
          <Input label="Brand *" {...f('brand')} />
          <Input label="Model Name *" {...f('model_name')} />
          <Input label="Vehicle Number *" {...f('vehicle_number')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Seats" {...f('seats')} type="number" />
            <Input label="Doors" {...f('doors')} type="number" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Total Rows" {...f('total_rows')} type="number" />
            <Input label="Total Columns" {...f('total_columns')} type="number" />
          </div>
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Vehicle Types ─────────────────────────────────────────────────────────────
function VehicleTypesPage() {
  const { items, loading, create, update, remove } = useCrud('/vehicle-types');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const openAdd = () => { setForm({ status: 'active' }); setModal('add'); };
  const openEdit = (row) => { setForm(row); setModal('edit'); };
  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Vehicle Type</h2>
        <Btn onClick={openAdd}>+ Add Vehicle Type</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Vehicle Name' },
              { key: 'ride_type', label: 'Ride Type' },
              { key: 'vehicle_type', label: 'Vehicle Type' },
              { key: 'seats', label: 'Seats' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete vehicle type?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Vehicle Type' : 'Edit Vehicle Type'} onClose={() => setModal(null)}>
          <Input label="Vehicle Name *" {...f('name')} />
          <Select label="Ride Type" {...f('ride_type')} options={[{ value: '', label: 'Select' }, { value: 'shuttle', label: 'Shuttle' }, { value: 'on_demand', label: 'On Demand' }]} />
          <Select label="Vehicle Type" {...f('vehicle_type')} options={[{ value: '', label: 'Select' }, { value: 'bus', label: 'Bus' }, { value: 'hiace', label: 'Hiace' }, { value: 'coaster', label: 'Coaster' }, { value: 'car', label: 'Car' }]} />
          <Input label="Seats" {...f('seats')} type="number" />
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Fares ─────────────────────────────────────────────────────────────────────
function FaresPage() {
  const { items, loading, create, update, remove } = useCrud('/shuttle/fares');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const openAdd = () => { setForm({ status: 'active', fare_type: 'fare_per_km', base_fare: 0, fare_per_stop: 0, fare_per_km: 0 }); setModal('add'); };
  const openEdit = (row) => { setForm(row); setModal('edit'); };
  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Fare</h2>
        <Btn onClick={openAdd}>+ Add Fare</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'Fare ID' },
              { key: 'fare_type', label: 'Type' },
              { key: 'base_fare', label: 'Base Fare' },
              { key: 'fare_per_stop', label: 'Fare Per Stop' },
              { key: 'fare_per_km', label: 'Fare Per Km' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete fare?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Fare' : 'Edit Fare'} onClose={() => setModal(null)}>
          <Select label="Fare Type *" {...f('fare_type')} options={[{ value: 'fare_per_km', label: 'Fare Per Km' }, { value: 'fare_per_stop', label: 'Fare Per Stop' }, { value: 'flat', label: 'Flat' }]} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Base Fare" {...f('base_fare')} type="number" />
            <Input label="Fare Per Km" {...f('fare_per_km')} type="number" />
          </div>
          <Input label="Fare Per Stop" {...f('fare_per_stop')} type="number" />
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Trips page with map ───────────────────────────────────────────────────────
function TripsPage() {
  const { items, loading, create, update, remove } = useCrud('/shuttle/trips');
  const { items: routes } = useCrud('/shuttle/routes');
  const { items: vehicles } = useCrud('/shuttle/vehicles');
  const { items: stops } = useCrud('/shuttle/stops');
  const [drivers, setDrivers] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [weekDays, setWeekDays] = useState([]);
  const [mapTrip, setMapTrip] = useState(null); // trip to show on map

  useEffect(() => { apiFetch('/users/drivers').then(d => setDrivers(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const openAdd = () => { setForm({ status: 'active' }); setWeekDays([]); setModal('add'); };
  const openEdit = (row) => { setForm(row); setWeekDays(row.week_days ? String(row.week_days).split(',') : []); setModal('edit'); };
  const save = async () => {
    if (!form.route_id || !form.start_time) { alert('Route and start time required'); return; }
    const body = { ...form, week_days: weekDays };
    if (modal === 'add') await create(body); else await update(form.id, body);
    setModal(null);
  };
  const toggleDay = (d) => setWeekDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  // Get stops for a given route
  const getRouteStops = (routeId) => {
    const route = routes.find(r => r.id == routeId);
    if (!route || !route.stops) return stops.slice(0, 4); // fallback
    return route.stops.map(rs => stops.find(s => s.id === rs.id)).filter(Boolean);
  };

  return (
    <div>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Trip</h2>
        <Btn onClick={openAdd}>+ Add Trip</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'route_name', label: 'Route' },
              { key: 'start_time', label: 'Start Time' },
              { key: 'vehicle_name', label: 'Vehicle' },
              { key: 'driver_name', label: 'Driver' },
              { key: 'week_days', label: 'Days' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete trip?')) remove(r.id); }}
            extraActions={r => (
              <Btn small variant="ghost" onClick={() => setMapTrip(r)}>🗺️ Map</Btn>
            )}
          />
        </Card>
      )}

      {/* Trip map modal */}
      {mapTrip && (
        <Modal title={`Trip Map — ${mapTrip.route_name || 'Route'}`} onClose={() => setMapTrip(null)} wide>
          <TripRouteMap trip={mapTrip} stops={getRouteStops(mapTrip.route_id)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Btn variant="outline" onClick={() => setMapTrip(null)}>Close</Btn>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Trip' : 'Edit Trip'} onClose={() => setModal(null)}>
          <Select label="Select Route *" {...f('route_id')} options={[{ value: '', label: 'Select route' }, ...routes.map(r => ({ value: r.id, label: r.name }))]} />
          <Input label="Start Time *" {...f('start_time')} placeholder="HH:MM" />
          <Select label="Select Vehicle" {...f('vehicle_id')} options={[{ value: '', label: 'Select vehicle' }, ...vehicles.map(v => ({ value: v.id, label: `${v.model_name} (${v.vehicle_number})` }))]} />
          <Select label="Driver" {...f('driver_id')} options={[{ value: '', label: 'Select driver' }, ...drivers.map(d => ({ value: d.id, label: d.name }))]} />
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: C.text }}>Week Days *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DAYS.map(d => (
                <button key={d} onClick={() => toggleDay(d)} style={{
                  padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: weekDays.includes(d) ? C.blue : C.blueLight,
                  color: weekDays.includes(d) ? '#fff' : C.blue, border: 'none',
                }}>{d.slice(0, 3)}</button>
              ))}
            </div>
          </div>
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Trip route map component ──────────────────────────────────────────────────
function TripRouteMap({ trip, stops }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    import('leaflet').then(L => {
      const Lf = L.default || L;
      const map = Lf.map(mapRef.current, { center: [30.0626, 31.2497], zoom: 11 });
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      leafletMap.current = map;

      const validStops = stops.filter(s => s && s.lat && s.lng);
      const bounds = [];

      validStops.forEach((s, i) => {
        const isFirst = i === 0, isLast = i === validStops.length - 1;
        const color = isFirst ? '#22c55e' : isLast ? '#ef4444' : C.blue;
        const icon = Lf.divIcon({
          html: `<div style="background:${color};color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 8px ${color}88">${i + 1}</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12], className: '',
        });
        Lf.marker([parseFloat(s.lat), parseFloat(s.lng)], { icon })
          .addTo(map)
          .bindPopup(`<b>${i + 1}. ${s.name}</b>${s.address ? '<br/>' + s.address : ''}${isFirst ? '<br/>🟢 Start' : isLast ? '<br/>🔴 End' : ''}`);
        bounds.push([parseFloat(s.lat), parseFloat(s.lng)]);
      });

      if (bounds.length > 1) {
        Lf.polyline(bounds, { color: C.blue, weight: 3, opacity: 0.8 }).addTo(map);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
      setTimeout(() => map.invalidateSize(), 200);
    });
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  return (
    <>
      <div style={{ background: C.blueLight, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
        <strong>{trip.route_name}</strong> · {trip.start_time} · {trip.week_days} · Driver: {trip.driver_name || '—'}
      </div>
      <div ref={mapRef} style={{ height: 380, borderRadius: 8, border: `1px solid ${C.border}` }} />
      {stops.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {stops.map((s, i) => s && (
            <span key={i} style={{ background: i === 0 ? '#dcfce7' : i === stops.length - 1 ? '#fee2e2' : C.blueLight, color: i === 0 ? '#16a34a' : i === stops.length - 1 ? '#dc2626' : C.blue, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              {i + 1}. {s.name}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

// ── Booking Analytics ─────────────────────────────────────────────────────────
function BookingsAnalyticsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (startDate) q.set('start_date', startDate);
    if (endDate) q.set('end_date', endDate);
    apiFetch(`/admin/dashboard/bookings?${q}`).then(setBookings).catch(() => {}).finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => { load(); }, []);

  const exportCSV = () => {
    if (!bookings.length) return;
    const keys = Object.keys(bookings[0]);
    const csv = [keys.join(','), ...bookings.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'bookings.csv'; a.click();
  };

  // Daily revenue chart data
  const dailyData = Object.values(bookings.reduce((acc, b) => {
    const d = b.travel_date?.slice(0, 10) || '';
    if (!acc[d]) acc[d] = { date: d, revenue: 0, count: 0 };
    acc[d].revenue += parseFloat(b.effective_price) || 0;
    acc[d].count += 1;
    return acc;
  }, {})).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Bookings Analytics</h2>
        <Btn small variant="outline" onClick={exportCSV}>Export CSV</Btn>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Input label="Start Date" value={startDate} onChange={setStartDate} type="date" style={{ width: 160 }} />
          <Input label="End Date" value={endDate} onChange={setEndDate} type="date" style={{ width: 160 }} />
          <Btn onClick={load} style={{ marginBottom: 12 }}>Filter</Btn>
        </div>
      </Card>

      {dailyData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Card><BarChart data={dailyData} valueKey="revenue" labelKey="date" color={C.blue} label="Revenue per Day (EGP)" height={180} /></Card>
          <Card><BarChart data={dailyData} valueKey="count" labelKey="date" color={C.green} label="Bookings per Day" height={180} /></Card>
        </div>
      )}

      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'booking_id', label: 'Booking ID' },
              { key: 'passenger_name', label: 'Passenger' },
              { key: 'passenger_phone', label: 'Phone' },
              { key: 'from_loc', label: 'From' },
              { key: 'to_loc', label: 'To' },
              { key: 'travel_date', label: 'Date', render: r => r.travel_date?.slice(0, 10) },
              { key: 'seats', label: 'Seats' },
              { key: 'effective_price', label: 'Price' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={bookings}
          />
        </Card>
      )}
    </div>
  );
}

// ── Cancellation policies ─────────────────────────────────────────────────────
function CancellationPage() {
  const { items, loading, create, update, remove } = useCrud('/cancellation/policies');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const openAdd = () => { setForm({ status: 'active', cancellation_type: 'percentage', driver_charge: 0, passenger_charge: 0 }); setModal('add'); };
  const openEdit = (row) => { setForm(row); setModal('edit'); };
  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Cancellation Policy</h2>
        <Btn onClick={openAdd}>+ Add Policy</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Policy Name' },
              { key: 'cancellation_type', label: 'Type' },
              { key: 'driver_charge', label: 'Driver Charge' },
              { key: 'passenger_charge', label: 'Passenger Charge' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete policy?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Cancellation Policy' : 'Edit Policy'} onClose={() => setModal(null)}>
          <Input label="Policy Name *" {...f('name')} />
          <Select label="Cancellation Type" {...f('cancellation_type')} options={[{ value: 'percentage', label: 'Percentage' }, { value: 'flat', label: 'Flat Fee' }]} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Driver Charge" {...f('driver_charge')} type="number" />
            <Input label="Passenger Charge" {...f('passenger_charge')} type="number" />
          </div>
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Cancellation Reasons ──────────────────────────────────────────────────────
function CancellationReasonsPage() {
  const { items, loading, create, update, remove } = useCrud('/cancellation/reasons');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const openAdd = () => { setForm({ status: 'active', user_type: 'passenger' }); setModal('add'); };
  const openEdit = (row) => { setForm(row); setModal('edit'); };
  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Cancellation Reasons</h2>
        <Btn onClick={openAdd}>+ Add Reason</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'reason', label: 'Reason' },
              { key: 'user_type', label: 'User Type' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete reason?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Reason' : 'Edit Reason'} onClose={() => setModal(null)}>
          <Input label="Reason *" {...f('reason')} />
          <Select label="User Type" {...f('user_type')} options={[{ value: 'passenger', label: 'Passenger' }, { value: 'driver', label: 'Driver' }, { value: 'both', label: 'Both' }]} />
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Promotions ────────────────────────────────────────────────────────────────
function PromotionsPage() {
  const { items, loading, create, update, remove } = useCrud('/promotions');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const openAdd = () => { setForm({ status: 'active', promo_type: 'flat', discount_value: 0, discount_percentage: 0 }); setModal('add'); };
  const openEdit = (row) => { setForm(row); setModal('edit'); };
  const save = async () => {
    if (!form.title || !form.promo_code) { alert('Title and promo code required'); return; }
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Promotions</h2>
        <Btn onClick={openAdd}>+ Create New Promotion</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Title' },
              { key: 'promo_code', label: 'Promo Code' },
              { key: 'promo_type', label: 'Type' },
              { key: 'discount_value', label: 'Discount Value' },
              { key: 'discount_percentage', label: 'Discount %' },
              { key: 'end_date', label: 'End Date', render: r => r.end_date?.slice(0, 10) || '—' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete promotion?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Create Promotion' : 'Edit Promotion'} onClose={() => setModal(null)}>
          <Input label="Title *" {...f('title')} />
          <Input label="Promo Code *" {...f('promo_code')} placeholder="e.g. SAVE20" />
          <Select label="Promo Type" {...f('promo_type')} options={[{ value: 'flat', label: 'Flat Discount' }, { value: 'percentage', label: 'Percentage' }]} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Discount Value" {...f('discount_value')} type="number" />
            <Input label="Discount %" {...f('discount_percentage')} type="number" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Start Date" {...f('start_date')} type="date" />
            <Input label="End Date" {...f('end_date')} type="date" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Max Per User" {...f('max_per_user')} type="number" />
            <Input label="Total Limit" {...f('total_limit')} type="number" />
          </div>
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Suggested Routes ──────────────────────────────────────────────────────────
function SuggestedRoutesPage() {
  const { items, loading, remove } = useCrud('/suggested-routes');

  const exportCSV = () => {
    if (!items.length) return;
    const keys = ['id', 'user_name', 'user_phone', 'pickup_address', 'dropoff_address', 'shift_description'];
    const csv = [keys.join(','), ...items.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'suggested_routes.csv'; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Suggested Routes</h2>
        <Btn small variant="outline" onClick={exportCSV}>Export CSV</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'Route ID' },
              { key: 'user_name', label: 'User Name' },
              { key: 'user_phone', label: 'Phone Number' },
              { key: 'pickup_address', label: 'Pickup Address' },
              { key: 'dropoff_address', label: 'Drop Address' },
              { key: 'shift_description', label: 'Shift Description' },
            ]}
            data={items}
            onDelete={r => { if (window.confirm('Delete suggested route?')) remove(r.id); }}
          />
        </Card>
      )}
    </div>
  );
}

// ── Holiday ───────────────────────────────────────────────────────────────────
function HolidayPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/holidays?year=${year}&month=${month}`).then(setHolidays).catch(() => {}).finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const getDays = () => {
    const days = []; const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return days;
  };
  const isHoliday = (date) => holidays.some(h => h.holiday_date === date.toISOString().slice(0, 10));
  const toggleHoliday = async (date) => {
    const dateStr = date.toISOString().slice(0, 10);
    const existing = holidays.find(h => h.holiday_date === dateStr);
    if (existing) await apiFetch(`/holidays/${existing.id}`, { method: 'DELETE' });
    else await apiFetch('/holidays', { method: 'POST', body: JSON.stringify({ holiday_date: dateStr }) });
    load();
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Holiday List</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={e => setYear(+e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>
      <Card>
        <h3 style={{ margin: '0 0 16px', color: C.text }}>{MONTHS[month-1]} {year}</h3>
        {loading ? <p>Loading…</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {DAYS_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: C.muted, padding: 6 }}>{d}</div>)}
            {Array.from({ length: new Date(year, month-1, 1).getDay() }).map((_, i) => <div key={`e${i}`} />)}
            {getDays().map(date => {
              const holiday = isHoliday(date);
              return (
                <div key={date.toISOString()} onClick={() => toggleHoliday(date)}
                  style={{ textAlign: 'center', padding: '10px 4px', borderRadius: 6, cursor: 'pointer', fontSize: 13, transition: 'all .15s',
                    background: holiday ? C.red : C.blueLight, color: holiday ? '#fff' : C.text, fontWeight: holiday ? 700 : 400,
                    border: `1px solid ${holiday ? C.red : C.border}` }}>
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        )}
        <p style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>Click a day to mark/unmark as holiday (red)</p>
      </Card>
    </div>
  );
}

// ── Shuttle Pass ──────────────────────────────────────────────────────────────
function ShuttlePassPage() {
  const { items, loading, create, update, remove } = useCrud('/shuttle/passes');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Shuttle Pass</h2>
        <Btn onClick={() => { setForm({ status: 'active', validity_days: 30, fare_discount: 0 }); setModal('add'); }}>+ Create New Pass</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'Pass ID' },
              { key: 'name', label: 'Pass Name' },
              { key: 'pass_type', label: 'Pass Type' },
              { key: 'fare_discount', label: 'Discount %' },
              { key: 'validity_days', label: 'Validity (days)' },
              { key: 'total_pass_limit', label: 'Total Limit' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
              { key: 'recommended', label: 'Recommended', render: r => r.recommended ? <Badge label="Yes" color={C.green} /> : '—' },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete pass?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Create Pass' : 'Edit Pass'} onClose={() => setModal(null)}>
          <Input label="Pass Name *" {...f('name')} />
          <Select label="Pass Type" {...f('pass_type')} options={[{ value: '', label: 'Select' }, { value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Evening' }, { value: 'both', label: 'Morning & Evening' }]} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Fare Discount (%)" {...f('fare_discount')} type="number" />
            <Input label="Validity (days)" {...f('validity_days')} type="number" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Total Pass Limit" {...f('total_pass_limit')} type="number" />
            <Input label="Per User Limit" {...f('per_user_pass_limit')} type="number" />
          </div>
          <Input label="Per User Cancellation Limit" {...f('per_user_cancellation_limit')} type="number" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={!!form.recommended} onChange={e => setForm(p => ({ ...p, recommended: e.target.checked ? 1 : 0 }))} style={{ accentColor: C.blue }} />
            Recommended
          </label>
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Customers ─────────────────────────────────────────────────────────────────
function RidersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/users').then(data => setUsers((Array.isArray(data) ? data : []).filter(u => u.role === 'passenger'))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search));

  const exportCSV = () => {
    if (!users.length) return;
    const keys = ['id', 'name', 'phone', 'account_status', 'created_at'];
    const csv = [keys.join(','), ...users.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'customers.csv'; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Customer</h2>
        <Btn small variant="outline" onClick={exportCSV}>Export CSV</Btn>
      </div>
      <Card style={{ marginBottom: 12 }}>
        <Input placeholder="Search by name or phone…" value={search} onChange={setSearch} style={{ marginBottom: 0 }} />
      </Card>
      {loading ? <p>Loading…</p> : (
        <Card>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>{filtered.length} customers</p>
          <Table
            columns={[
              { key: 'id', label: 'Customer ID' },
              { key: 'name', label: 'Name' },
              { key: 'phone', label: 'Phone' },
              { key: 'account_status', label: 'Status', render: r => statusBadge(r.account_status) },
              { key: 'created_at', label: 'Registered', render: r => r.created_at?.slice(0, 10) },
            ]}
            data={filtered}
          />
        </Card>
      )}
    </div>
  );
}

// ── Drivers ───────────────────────────────────────────────────────────────────
function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch('/users/drivers/all').then(d => setDrivers(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    await apiFetch(`/users/${id}/approve`, { method: 'POST' });
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, account_status: 'active' } : d));
  };
  const reject = async (id) => {
    const note = window.prompt('Rejection reason (optional):');
    if (note === null) return;
    await apiFetch(`/users/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, account_status: 'rejected' } : d));
  };

  const filtered = drivers.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.phone?.includes(search));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Driver</h2>
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: C.muted }}>
          <span style={{ color: C.green }}>● {drivers.filter(d=>d.account_status==='active').length} active</span>
          <span style={{ color: C.orange }}>● {drivers.filter(d=>d.account_status==='pending_review').length} pending</span>
          <span style={{ color: C.red }}>● {drivers.filter(d=>d.account_status==='rejected').length} rejected</span>
        </div>
      </div>
      <Card style={{ marginBottom: 12 }}>
        <Input placeholder="Search by name or phone…" value={search} onChange={setSearch} style={{ marginBottom: 0 }} />
      </Card>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Name' },
              { key: 'phone', label: 'Phone' },
              { key: 'car', label: 'Car' },
              { key: 'plate', label: 'Plate' },
              { key: 'account_status', label: 'Status', render: r => statusBadge(r.account_status) },
              { key: 'avg_rating', label: 'Rating', render: r => `★ ${Number(r.avg_rating||0).toFixed(1)}` },
              { key: 'total_trips', label: 'Trips' },
            ]}
            data={filtered}
            extraActions={r => r.account_status === 'pending_review' && <>
              <Btn small variant="success" onClick={() => approve(r.id)}>Approve</Btn>
              <Btn small variant="danger" onClick={() => reject(r.id)}>Reject</Btn>
            </>}
          />
        </Card>
      )}
    </div>
  );
}

// ── Delete Account Requests ───────────────────────────────────────────────────
function DeleteRequestsPage() {
  const { items, loading, load } = useCrud('/delete-requests');

  const approve = async (id) => {
    if (!window.confirm('Approve and delete this user account?')) return;
    await apiFetch(`/delete-requests/${id}/approve`, { method: 'PUT' });
    load();
  };
  const reject = async (id) => {
    await apiFetch(`/delete-requests/${id}/reject`, { method: 'PUT' });
    load();
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 16px', color: C.text }}>Delete Account Request</h2>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'user_name', label: 'User Name' },
              { key: 'user_role', label: 'Role' },
              { key: 'reason', label: 'Reason' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            extraActions={r => r.status === 'pending' && <>
              <Btn small variant="success" onClick={() => approve(r.id)}>Approve</Btn>
              <Btn small variant="danger" onClick={() => reject(r.id)}>Reject</Btn>
            </>}
          />
        </Card>
      )}
    </div>
  );
}

// ── Driver Documents ──────────────────────────────────────────────────────────
function DriverDocumentsPage() {
  const { items, loading, create, update, remove } = useCrud('/driver-doc-types');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Driver Documents</h2>
        <Btn onClick={() => { setForm({ status: 'active', num_images: 1, doc_required: 1, gallery_restricted: 0 }); setModal('add'); }}>+ Add Document</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'doc_name', label: 'Document Name' },
              { key: 'doc_type', label: 'Category' },
              { key: 'num_images', label: 'Images' },
              { key: 'doc_required', label: 'Required', render: r => r.doc_required ? <Badge label="Yes" color={C.green} /> : 'No' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete document type?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Driver Document' : 'Edit Document'} onClose={() => setModal(null)}>
          <Input label="Document Name *" {...f('doc_name')} />
          <Select label="Document Type" {...f('doc_type')} options={[{ value: 'image', label: 'Image' }, { value: 'pdf', label: 'PDF' }, { value: 'both', label: 'Both' }]} />
          <Input label="Number of Images" {...f('num_images')} type="number" />
          <Select label="Expired Action" {...f('expired_action')} options={[{ value: 'none', label: 'None' }, { value: 'block', label: 'Block' }, { value: 'notify', label: 'Notify' }]} />
          {[['gallery_restricted', 'Gallery Restricted'], ['doc_required', 'Document Required'], ['doc_number_required', 'Document Number Required'], ['expiry_required', 'Expiry Date Required']].map(([k, lbl]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={!!form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked ? 1 : 0 }))} style={{ accentColor: C.blue }} />
              {lbl}
            </label>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Pushes ────────────────────────────────────────────────────────────────────
function PushesPage() {
  const { items, loading, create, update, remove } = useCrud('/pushes');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const save = async () => {
    if (!form.title || !form.message) { alert('Title and message required'); return; }
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Push Notifications</h2>
        <Btn onClick={() => { setForm({ user_type: 'all', status: 'draft' }); setModal('add'); }}>+ New Notification</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Title' },
              { key: 'message', label: 'Message' },
              { key: 'user_type', label: 'Target' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
              { key: 'created_at', label: 'Date', render: r => r.created_at?.slice(0, 10) },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete notification?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'New Notification' : 'Edit Notification'} onClose={() => setModal(null)}>
          <Input label="Title *" {...f('title')} />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: C.text }}>Message *</label>
            <textarea value={form.message || ''} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3}
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 14, fontFamily: 'Poppins, sans-serif', resize: 'vertical' }} />
          </div>
          <Select label="Send To" {...f('user_type')} options={[{ value: 'all', label: 'All' }, { value: 'passenger', label: 'Passengers' }, { value: 'driver', label: 'Drivers' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Send</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── General Settings ──────────────────────────────────────────────────────────
function GeneralSettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/admin/settings/general').then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    await apiFetch('/admin/settings/general', { method: 'PUT', body: JSON.stringify(settings) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  const f = (k) => ({ value: settings[k], onChange: v => setSettings(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', color: C.text }}>General Settings</h2>
      {loading ? <p>Loading…</p> : (
        <Card style={{ maxWidth: 560 }}>
          <Input label="Client Name" {...f('client_name')} />
          <Input label="Support Email" {...f('support_email')} type="email" />
          <Input label="Brand Logo URL" {...f('brand_logo_url')} />
          <Input label="Favicon URL" {...f('favicon_url')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Nearby Stops Count" {...f('nearby_stops_count')} type="number" />
            <Input label="Max Nearby Distance (m)" {...f('max_nearby_distance')} type="number" />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Btn onClick={save}>Save Settings</Btn>
            {saved && <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Saved</span>}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── City Settings ─────────────────────────────────────────────────────────────
function CitySettingsPage() {
  const CITY_ID = 1;
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch(`/admin/settings/city/${CITY_ID}`).then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    await apiFetch(`/admin/settings/city/${CITY_ID}`, { method: 'PUT', body: JSON.stringify(settings) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  const f = (k) => ({ value: settings[k], onChange: v => setSettings(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', color: C.text }}>City Settings</h2>
      {loading ? <p>Loading…</p> : (
        <Card style={{ maxWidth: 560 }}>
          <Input label="Customer Support Number" {...f('customer_support_number')} />
          <Input label="Driver Support Number" {...f('driver_support_number')} />
          <Input label="Emergency Number" {...f('emergency_number')} />
          <Select label="Service Type" {...f('service_type')} options={[{ value: 'both', label: 'Both' }, { value: 'shuttle', label: 'Shuttle Only' }, { value: 'on_demand', label: 'On Demand Only' }]} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Btn onClick={save}>Save Settings</Btn>
            {saved && <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Saved</span>}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Manager Settings ──────────────────────────────────────────────────────────
function ManagerSettingsPage() {
  const { items, loading, create, update, remove } = useCrud('/managers');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const save = async () => {
    if (!form.name || !form.email) { alert('Name and email required'); return; }
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Manager Settings</h2>
        <Btn onClick={() => { setForm({ status: 'active' }); setModal('add'); }}>+ Add Manager</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete manager?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Manager' : 'Edit Manager'} onClose={() => setModal(null)}>
          <Input label="Name *" {...f('name')} />
          <Input label="Email *" {...f('email')} type="email" />
          <Input label="Phone" {...f('phone')} />
          {modal === 'add' && <Input label="Password *" {...f('password')} type="password" />}
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Roles ─────────────────────────────────────────────────────────────────────
function RolesPage() {
  const { items, loading, create, update, remove } = useCrud('/roles');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const save = async () => {
    if (!form.name) { alert('Role name required'); return; }
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Roles and Permissions</h2>
        <Btn onClick={() => { setForm({}); setModal('add'); }}>+ Add Role</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Role Name' },
              { key: 'description', label: 'Description' },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete role?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Role' : 'Edit Role'} onClose={() => setModal(null)}>
          <Input label="Role Name *" {...f('name')} />
          <Input label="Description" {...f('description')} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Operational Cities ────────────────────────────────────────────────────────
function OperationalCitiesPage() {
  const { items, loading, create, update, remove } = useCrud('/cities');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const save = async () => {
    if (!form.name) { alert('City name required'); return; }
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>Operational Cities</h2>
        <Btn onClick={() => { setForm({ status: 'active' }); setModal('add'); }}>+ Add City</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'City Name' },
              { key: 'country', label: 'Country' },
              { key: 'geofence_radius', label: 'Geofence (m)' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete city?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add City' : 'Edit City'} onClose={() => setModal(null)}>
          <Input label="City Name *" {...f('name')} />
          <Input label="Country" {...f('country')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Latitude" {...f('lat')} type="number" />
            <Input label="Longitude" {...f('lng')} type="number" />
          </div>
          <Input label="Geofence Radius (m)" {...f('geofence_radius')} type="number" />
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── HomeScreen Settings ───────────────────────────────────────────────────────
function HomeScreenPage() {
  const CITY_ID = 1;
  const { items, loading, create, update, remove } = useCrud(`/admin/settings/homescreen/${CITY_ID}`);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const CATEGORIES = ['Promotions', 'Refer & Earn', 'Verify Documents', "What's New", 'Why Mobility', 'Video'];
  const save = async () => {
    const body = { ...form, city_id: CITY_ID };
    if (modal === 'add') await create(body); else await update(form.id, body);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.text }}>HomeScreen Settings</h2>
        <Btn onClick={() => { setForm({ active: 1, user_type: 'customer', display_order: 1 }); setModal('add'); }}>+ Add</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'category', label: 'Category' },
              { key: 'display_order', label: 'Display Order' },
              { key: 'user_type', label: 'User Type' },
              { key: 'active', label: 'Active', render: r => r.active ? <Badge label="Yes" color={C.green} /> : 'No' },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete item?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Item' : 'Edit Item'} onClose={() => setModal(null)}>
          <Select label="Category" {...f('category')} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Input label="Display Order" {...f('display_order')} type="number" />
          <Select label="User Type" {...f('user_type')} options={[{ value: 'customer', label: 'Customer' }, { value: 'driver', label: 'Driver' }, { value: 'both', label: 'Both' }]} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={!!form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked ? 1 : 0 }))} style={{ accentColor: C.blue }} />
            Active
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ════════════════════════════════════════════════════════════════════════════
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { section: 'Shuttle' },
  { id: 'stops',               label: 'Stops',               icon: '📍' },
  { id: 'routes',              label: 'Routes',              icon: '🛤️' },
  { id: 'vehicles',            label: 'Vehicles',            icon: '🚐' },
  { id: 'fares',               label: 'Fare',                icon: '💰' },
  { id: 'trips',               label: 'Trips',               icon: '🗓️' },
  { id: 'analytics',           label: 'Analytics',           icon: '📈' },
  { id: 'cancellation',        label: 'Cancellation',        icon: '❌' },
  { id: 'cancellation-reasons',label: 'Cancellation Reasons',icon: '📋' },
  { id: 'promotions',          label: 'Promotions',          icon: '🎁' },
  { id: 'suggested-routes',    label: 'Suggested Routes',    icon: '🗺️' },
  { id: 'holiday',             label: 'Holiday',             icon: '🏖️' },
  { id: 'shuttle-pass',        label: 'Shuttle Pass',        icon: '🎫' },
  { section: 'Users' },
  { id: 'customers',           label: 'Customer',            icon: '👤' },
  { id: 'drivers',             label: 'Driver',              icon: '🚗' },
  { id: 'delete-requests',     label: 'Delete Requests',     icon: '🗑️' },
  { id: 'driver-documents',    label: 'Driver Documents',    icon: '📄' },
  { id: 'vehicle-types',       label: 'Vehicle Type',        icon: '🚌' },
  { section: 'Settings' },
  { id: 'homescreen',          label: 'HomeScreen',          icon: '📱' },
  { id: 'pushes',              label: 'Pushes',              icon: '🔔' },
  { id: 'general-settings',    label: 'General Settings',    icon: '⚙️' },
  { id: 'city-settings',       label: 'City Settings',       icon: '🏙️' },
  { id: 'manager-settings',    label: 'Manager Settings',    icon: '👔' },
  { id: 'roles',               label: 'Roles & Permissions', icon: '🔑' },
  { id: 'operational-cities',  label: 'Operational Cities',  icon: '🌍' },
];

const PAGE_MAP = {
  dashboard:             DashboardPage,
  stops:                 StopsPage,
  routes:                RoutesPage,
  vehicles:              VehiclesPage,
  fares:                 FaresPage,
  trips:                 TripsPage,
  analytics:             BookingsAnalyticsPage,
  cancellation:          CancellationPage,
  'cancellation-reasons':CancellationReasonsPage,
  promotions:            PromotionsPage,
  'suggested-routes':    SuggestedRoutesPage,
  holiday:               HolidayPage,
  'shuttle-pass':        ShuttlePassPage,
  customers:             RidersPage,
  drivers:               DriversPage,
  'delete-requests':     DeleteRequestsPage,
  'driver-documents':    DriverDocumentsPage,
  'vehicle-types':       VehicleTypesPage,
  homescreen:            HomeScreenPage,
  pushes:                PushesPage,
  'general-settings':    GeneralSettingsPage,
  'city-settings':       CitySettingsPage,
  'manager-settings':    ManagerSettingsPage,
  roles:                 RolesPage,
  'operational-cities':  OperationalCitiesPage,
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD LAYOUT
// ════════════════════════════════════════════════════════════════════════════
export default function AdminDash() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState(() => localStorage.getItem('adm_page') || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const goPage = (id) => { localStorage.setItem('adm_page', id); setPage(id); };
  const PageComponent = PAGE_MAP[page] || DashboardPage;

  return (
    <div style={{ fontFamily: "'Poppins', -apple-system, sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .sidebar-item:hover { background: #f0f4ff !important; }
      `}</style>

      {/* Top AppBar */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.text, padding: 4 }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: C.blue, borderRadius: 8, padding: '5px 8px', color: '#fff', fontSize: 16 }}>🚐</div>
            <span style={{ fontWeight: 700, fontSize: 17, color: C.blue, letterSpacing: '-.01em' }}>Waslney Admin</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: C.blue, fontWeight: 700 }}>
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{user?.name || 'Admin'}</span>
          </div>
          <Btn small variant="outline" onClick={logout}>Logout</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', marginTop: 64 }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{ width: 252, background: C.sidebar, borderRight: `1px solid ${C.border}`, position: 'fixed', top: 64, bottom: 0, left: 0, overflowY: 'auto', zIndex: 999, padding: '10px 0' }}>
            {NAV.map((item, i) => {
              if (item.section) return (
                <div key={i} style={{ padding: '12px 20px 4px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>{item.section}</div>
              );
              const active = page === item.id;
              return (
                <div key={item.id} className="sidebar-item" onClick={() => goPage(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px',
                  cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                  background: active ? C.blueLight : 'transparent',
                  color: active ? C.blue : C.text,
                  borderLeft: active ? `3px solid ${C.blue}` : '3px solid transparent',
                  transition: 'all .1s', margin: '1px 0',
                }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, marginLeft: sidebarOpen ? 252 : 0, padding: '24px 28px', minHeight: 'calc(100vh - 64px)', transition: 'margin .2s' }}>
          <PageComponent />
        </div>
      </div>
    </div>
  );
}
