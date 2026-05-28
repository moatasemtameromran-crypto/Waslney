import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../App.jsx';

const API = (path) => `/api${path}`;
const token = () => localStorage.getItem('shuttle_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

async function apiFetch(path, opts = {}) {
  const res = await fetch(API(path), { headers: authHeaders(), ...opts });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

// ── Colour palette matching the new admin system ────────────────────────────
const C = {
  bg: '#eef1f6',
  white: '#fff',
  blue: '#0065ff',
  blueLight: '#e6f0ff',
  sidebar: '#fff',
  border: '#e6f0ff',
  text: '#222',
  muted: '#6b7280',
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f97316',
};

// ── Tiny reusable components ─────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = 'primary', small, style }) => {
  const base = {
    cursor: 'pointer', border: 'none', borderRadius: 6, fontWeight: 600,
    padding: small ? '6px 14px' : '9px 20px', fontSize: small ? 13 : 14,
    transition: 'opacity .15s',
  };
  const variants = {
    primary: { background: C.blue, color: '#fff' },
    danger:  { background: C.red, color: '#fff' },
    ghost:   { background: C.blueLight, color: C.blue },
    outline: { background: 'transparent', border: `1px solid ${C.border}`, color: C.text },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} onClick={onClick}>{children}</button>;
};

const Input = ({ label, value, onChange, type = 'text', placeholder, style }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: C.text }}>{label}</label>}
    <input
      type={type} value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '8px 12px', fontSize: 14, outline: 'none',
        fontFamily: 'Poppins, sans-serif', ...style
      }}
    />
  </div>
);

const Select = ({ label, value, onChange, options, style }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: C.text }}>{label}</label>}
    <select
      value={value || ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 14, background: C.white, fontFamily: 'Poppins, sans-serif', ...style }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: C.white, borderRadius: 8, padding: 16, ...style }}>{children}</div>
);

const Table = ({ columns, data, onEdit, onDelete, extraActions }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#f9f9f9' }}>
          {columns.map(c => (
            <th key={c.key} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontWeight: 700, position: 'relative' }}>
              {c.label}
            </th>
          ))}
          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>Action</th>
        </tr>
      </thead>
      <tbody>
        {!data.length && (
          <tr><td colSpan={columns.length + 1} style={{ padding: '24px', textAlign: 'center', color: C.muted }}>No data found</td></tr>
        )}
        {data.map((row, i) => (
          <tr key={row.id || i} style={{ borderBottom: `1px solid ${C.border}` }}>
            {columns.map(c => (
              <td key={c.key} style={{ padding: '10px 12px' }}>
                {c.render ? c.render(row) : String(row[c.key] ?? '-')}
              </td>
            ))}
            <td style={{ padding: '10px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {onEdit && <Btn small variant="ghost" onClick={() => onEdit(row)}>Edit</Btn>}
              {extraActions && extraActions(row)}
              {onDelete && <Btn small variant="danger" onClick={() => onDelete(row)}>Delete</Btn>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Badge = ({ label, color }) => (
  <span style={{ background: color + '22', color, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
    {label}
  </span>
);

const statusBadge = (s) => {
  if (!s) return null;
  const color = s === 'active' ? C.green : s === 'inactive' ? C.muted : C.orange;
  return <Badge label={s} color={color} />;
};

const Modal = ({ title, children, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: '#00000066', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: C.white, borderRadius: 12, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px #0002' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// ── Stat card for dashboard ──────────────────────────────────────────────────
const StatCard = ({ label, value, color = C.blue }) => (
  <div style={{ background: C.white, borderRadius: 8, padding: '18px 20px', flex: 1, minWidth: 140 }}>
    <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value ?? 0}</div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// ── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/dashboard?period=${period}`)
      .then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  const periods = ['today', '7d', '30d'];
  const periodLabel = { today: 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {periods.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13,
                background: period === p ? '#000' : C.white, color: period === p ? '#fff' : C.text, fontWeight: 600 }}>
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color: C.muted }}>Loading…</p> : stats && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatCard label="Total Bookings" value={stats.total_bookings} />
            <StatCard label="Booked" value={stats.booked_bookings} color={C.green} />
            <StatCard label="Missed" value={stats.missed_bookings} color={C.orange} />
            <StatCard label="Active" value={stats.active_bookings} color={C.blue} />
            <StatCard label="Completed" value={stats.completed_bookings} color="#8b5cf6" />
            <StatCard label="Cancelled" value={stats.cancelled_bookings} color={C.red} />
            <StatCard label="Total Earning" value={stats.total_earning?.toFixed(0)} color={C.green} />
            <StatCard label="New Users" value={stats.new_users} />
          </div>

          {stats.revenue_chart?.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 12px' }}>Revenue — Last 7 Days</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                {stats.revenue_chart.map((d, i) => {
                  const maxRev = Math.max(...stats.revenue_chart.map(x => x.revenue), 1);
                  const h = Math.max(4, (d.revenue / maxRev) * 100);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div title={`${d.revenue} EGP`} style={{ width: '100%', height: `${h}%`, background: C.blue, borderRadius: '4px 4px 0 0' }} />
                      <span style={{ fontSize: 10, color: C.muted }}>{d.date?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Generic CRUD page factory ─────────────────────────────────────────────────
function useCrud(endpoint) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(endpoint).then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const create = async (body) => { const r = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }); load(); return r; };
  const update = async (id, body) => { const r = await apiFetch(`${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(body) }); load(); return r; };
  const remove = async (id) => { await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' }); load(); };

  return { items, loading, error, load, create, update, remove };
}

// ── Stops ────────────────────────────────────────────────────────────────────
function StopsPage() {
  const { items, loading, create, update, remove } = useCrud('/shuttle/stops');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const openAdd = () => { setForm({ status: 'active', radius: 100 }); setModal('add'); };
  const openEdit = (row) => { setForm(row); setModal('edit'); };
  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };

  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Stops Management</h2>
        <Btn onClick={openAdd}>+ Add Stop</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <p style={{ color: C.muted, fontSize: 13 }}>{items.length} Results Found</p>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Name' },
              { key: 'address', label: 'Stop Location' },
              { key: 'radius', label: 'Radius', render: r => `${r.radius}m` },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete stop?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Stop' : 'Edit Stop'} onClose={() => setModal(null)}>
          <Input label="Name *" {...f('name')} />
          <Input label="Address" {...f('address')} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Latitude *" {...f('lat')} type="number" />
            <Input label="Longitude *" {...f('lng')} type="number" />
          </div>
          <Input label="Radius (meters)" {...f('radius')} type="number" />
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
        <h2 style={{ margin: 0 }}>Routes Management</h2>
        <Btn onClick={openAdd}>+ Add Route</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Route' },
              { key: 'stop_count', label: 'Number of Stops' },
              { key: 'customer_fare', label: 'Customer Fare Per Route' },
              { key: 'driver_fare', label: 'Driver Fare Per Route' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete route?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Route' : 'Edit Route'} onClose={() => setModal(null)}>
          <Input label="Route Name *" {...f('name')} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Customer Fare" {...f('customer_fare')} type="number" />
            <Input label="Driver Fare" {...f('driver_fare')} type="number" />
          </div>
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Stops</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {stops.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedStops.includes(s.id)} onChange={() => toggleStop(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
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

// ── Vehicles ─────────────────────────────────────────────────────────────────
function VehiclesPage() {
  const { items, loading, create, update, remove } = useCrud('/shuttle/vehicles');
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
        <h2 style={{ margin: 0 }}>Vehicle</h2>
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
              { key: 'seats', label: 'Number of Seats' },
              { key: 'doors', label: 'Number of Doors' },
              { key: 'total_rows', label: 'Total Rows' },
              { key: 'total_columns', label: 'Total Columns' },
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
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Number of Seats" {...f('seats')} type="number" />
            <Input label="Number of Doors" {...f('doors')} type="number" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Total Rows" {...f('total_rows')} type="number" />
            <Input label="Total Columns" {...f('total_columns')} type="number" />
          </div>
          <Input label="Vehicle Number *" {...f('vehicle_number')} />
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
        <h2 style={{ margin: 0 }}>Vehicle Type</h2>
        <Btn onClick={openAdd}>+ Add Vehicle</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Vehicle Name' },
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

// ── Fares ────────────────────────────────────────────────────────────────────
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
        <h2 style={{ margin: 0 }}>Fare</h2>
        <Btn onClick={openAdd}>+ Add Fare</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'Fare ID' },
              { key: 'fare_type', label: 'Type' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
              { key: 'fare_per_stop', label: 'Fare Per Stop' },
              { key: 'base_fare', label: 'Base Fare' },
              { key: 'fare_per_km', label: 'Fare per Km' },
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
          <Input label="Fare Per Stop" {...f('fare_per_stop')} type="number" />
          <Input label="Base Fare" {...f('base_fare')} type="number" />
          <Input label="Fare Per Km" {...f('fare_per_km')} type="number" />
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

// ── Trips (Journey) ──────────────────────────────────────────────────────────
function TripsPage() {
  const { items, loading, create, update, remove } = useCrud('/shuttle/trips');
  const { items: routes } = useCrud('/shuttle/routes');
  const { items: vehicles } = useCrud('/shuttle/vehicles');
  const { items: drivers } = useCrud('/users/drivers');
  const { items: policies } = useCrud('/cancellation/policies');
  const { items: promos } = useCrud('/promotions');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [weekDays, setWeekDays] = useState([]);

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const openAdd = () => { setForm({ status: 'active' }); setWeekDays([]); setModal('add'); };
  const openEdit = (row) => {
    setForm(row);
    setWeekDays(row.week_days ? row.week_days.split(',') : []);
    setModal('edit');
  };
  const save = async () => {
    const body = { ...form, week_days: weekDays };
    if (modal === 'add') await create(body); else await update(form.id, body);
    setModal(null);
  };
  const toggleDay = (d) => setWeekDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Trip</h2>
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
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Trip' : 'Edit Trip'} onClose={() => setModal(null)}>
          <Select label="Select Route *" {...f('route_id')} options={[{ value: '', label: 'Select route' }, ...routes.map(r => ({ value: r.id, label: r.name }))]} />
          <Input label="Start Time *" {...f('start_time')} placeholder="HH:MM" />
          <Select label="Select Vehicle" {...f('vehicle_id')} options={[{ value: '', label: 'Select vehicle' }, ...vehicles.map(v => ({ value: v.id, label: `${v.model_name} (${v.vehicle_number})` }))]} />
          <Select label="Drivers" {...f('driver_id')} options={[{ value: '', label: 'Select driver' }, ...drivers.map(d => ({ value: d.id, label: d.name }))]} />
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Week Days *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DAYS.map(d => (
                <button key={d} onClick={() => toggleDay(d)} style={{
                  padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  background: weekDays.includes(d) ? C.blue : C.blueLight,
                  color: weekDays.includes(d) ? '#fff' : C.blue,
                  border: 'none', fontWeight: 600
                }}>{d}</button>
              ))}
            </div>
          </div>
          <Select label="Cancellation Policy" {...f('cancellation_policy_id')} options={[{ value: '', label: 'None' }, ...policies.map(p => ({ value: p.id, label: p.name }))]} />
          <Select label="Promotion" {...f('promotion_id')} options={[{ value: '', label: 'None' }, ...promos.map(p => ({ value: p.id, label: p.title }))]} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Booking Analytics ─────────────────────────────────────────────────────────
function BookingsAnalyticsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (startDate) q.set('start_date', startDate);
    if (endDate) q.set('end_date', endDate);
    apiFetch(`/admin/dashboard/bookings?${q}`).then(setBookings).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const exportCSV = () => {
    if (!bookings.length) return;
    const keys = Object.keys(bookings[0]);
    const csv = [keys.join(','), ...bookings.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'bookings.csv'; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Analytics — Bookings</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }} />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }} />
          <Btn small variant="ghost" onClick={load}>Filter</Btn>
          <Btn small variant="outline" onClick={exportCSV}>Export CSV</Btn>
        </div>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'booking_id', label: 'Booking ID' },
              { key: 'passenger_name', label: 'User' },
              { key: 'from_loc', label: 'Trip' },
              { key: 'travel_date', label: 'Date' },
              { key: 'pickup_time', label: 'Time' },
              { key: 'seats', label: 'Seats' },
              { key: 'effective_price', label: 'Amount' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={bookings}
          />
        </Card>
      )}
    </div>
  );
}

// ── Cancellation ──────────────────────────────────────────────────────────────
function CancellationPage() {
  const { items, loading, create, update, remove } = useCrud('/cancellation/policies');
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
        <h2 style={{ margin: 0 }}>Cancellation</h2>
        <Btn onClick={() => { setForm({ status: 'active', applicable_for_pass: 0 }); setModal('add'); }}>+ Add Cancellation Policy</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Name' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
              { key: 'applicable_for_pass', label: 'Applicable for Shuttle Pass', render: r => r.applicable_for_pass ? 'Yes' : 'No' },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete policy?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Policy' : 'Edit Policy'} onClose={() => setModal(null)}>
          <Input label="Name *" {...f('name')} />
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={!!form.applicable_for_pass} onChange={e => setForm(p => ({ ...p, applicable_for_pass: e.target.checked ? 1 : 0 }))} />
            Applicable for Shuttle Pass
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

// ── Cancellation Reasons ──────────────────────────────────────────────────────
function CancellationReasonsPage() {
  const { items, loading, create, update, remove } = useCrud('/cancellation/reasons');
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
        <h2 style={{ margin: 0 }}>Cancellation Reasons</h2>
        <Btn onClick={() => { setForm({ status: 'active' }); setModal('add'); }}>+ Add Reason</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'status', label: 'Status', render: r => statusBadge(r.status) }]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete reason?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Reason' : 'Edit Reason'} onClose={() => setModal(null)}>
          <Input label="Name *" {...f('name')} />
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

  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Promotions</h2>
        <Btn onClick={() => { setForm({ status: 'active', promo_type: 'flat' }); setModal('add'); }}>+ Add Promotions</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Title' },
              { key: 'promo_type', label: 'Promo Type' },
              { key: 'discount_value', label: 'Discount Values' },
              { key: 'discount_percentage', label: 'Discount %' },
              { key: 'max_discount', label: 'Max Discount' },
              { key: 'start_date', label: 'Start Date' },
              { key: 'end_date', label: 'End Date' },
              { key: 'max_per_user', label: 'Max Per User' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
              { key: 'promo_code', label: 'Promo Code' },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete promotion?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Promotion' : 'Edit Promotion'} onClose={() => setModal(null)}>
          <Input label="Title *" {...f('title')} />
          <Input label="Promo Code *" {...f('promo_code')} />
          <Select label="Promo Type" {...f('promo_type')} options={[{ value: 'flat', label: 'Flat' }, { value: 'percentage', label: 'Percentage' }]} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Discount Value" {...f('discount_value')} type="number" />
            <Input label="Discount %" {...f('discount_percentage')} type="number" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Max Discount" {...f('max_discount')} type="number" />
            <Input label="Max Per User" {...f('max_per_user')} type="number" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Start Date" {...f('start_date')} type="date" />
            <Input label="End Date" {...f('end_date')} type="date" />
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
    const keys = ['id', 'user_name', 'user_phone', 'pickup_address', 'dropoff_address', 'shift_description', 'created_at'];
    const csv = [keys.join(','), ...items.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'suggested-routes.csv'; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Suggested Routes</h2>
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

  const load = () => {
    setLoading(true);
    apiFetch(`/holidays?year=${year}&month=${month}`).then(setHolidays).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [year, month]);

  const getDays = () => {
    const days = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const isHoliday = (date) => holidays.some(h => h.holiday_date === date.toISOString().slice(0, 10));

  const toggleHoliday = async (date) => {
    const dateStr = date.toISOString().slice(0, 10);
    const existing = holidays.find(h => h.holiday_date === dateStr);
    if (existing) {
      await apiFetch(`/holidays/${existing.id}`, { method: 'DELETE' });
    } else {
      await apiFetch('/holidays', { method: 'POST', body: JSON.stringify({ holiday_date: dateStr }) });
    }
    load();
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Holiday List</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={e => setYear(+e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>Month {m}</option>)}
          </select>
        </div>
      </div>
      <Card>
        <h3 style={{ margin: '0 0 16px' }}>Days in {MONTHS[month-1]} {year}</h3>
        {loading ? <p>Loading…</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {DAYS_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: C.muted, padding: 6 }}>{d}</div>)}
            {Array.from({ length: new Date(year, month-1, 1).getDay() }).map((_, i) => <div key={`e${i}`} />)}
            {getDays().map(date => {
              const holiday = isHoliday(date);
              const dayName = DAYS_SHORT[date.getDay()];
              return (
                <div key={date.toISOString()} onClick={() => toggleHoliday(date)}
                  style={{
                    textAlign: 'center', padding: '8px 4px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                    background: holiday ? C.red : C.blueLight,
                    color: holiday ? '#fff' : C.text, fontWeight: holiday ? 700 : 400,
                    border: `1px solid ${holiday ? C.red : C.border}`,
                    transition: 'all .15s'
                  }}>
                  {date.getDate()}<br /><span style={{ fontSize: 10 }}>{dayName}</span>
                </div>
              );
            })}
          </div>
        )}
        <p style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>Click a day to mark/unmark as holiday (shown in red)</p>
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
        <h2 style={{ margin: 0 }}>Shuttle Pass</h2>
        <Btn onClick={() => { setForm({ status: 'active', validity_days: 30, fare_discount: 0 }); setModal('add'); }}>+ Create New Pass</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'Pass ID' },
              { key: 'name', label: 'Pass Name' },
              { key: 'pass_type', label: 'Pass Type' },
              { key: 'morning_evening_fare', label: 'Morning/Evening Ride Fare' },
              { key: 'fare_discount', label: 'Discount %' },
              { key: 'validity_days', label: 'Validity (days)' },
              { key: 'per_user_cancellation_limit', label: 'Per User Cancel Limit' },
              { key: 'total_pass_limit', label: 'Total Pass Limit' },
              { key: 'per_user_pass_limit', label: 'Per User Pass Limit' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
              { key: 'recommended', label: 'Recommended', render: r => r.recommended ? <Badge label="Yes" color={C.green} /> : 'No' },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete pass?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Create Pass' : 'Edit Pass'} onClose={() => setModal(null)}>
          <Select label="Status" {...f('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <Input label="Pass Name *" {...f('name')} />
          <Select label="Pass Type" {...f('pass_type')} options={[{ value: '', label: 'Select' }, { value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Evening' }, { value: 'both', label: 'Morning & Evening' }]} />
          <Input label="Fare Discount (%)" {...f('fare_discount')} type="number" />
          <Input label="Validity (days)" {...f('validity_days')} type="number" />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Total Pass Limit" {...f('total_pass_limit')} type="number" />
            <Input label="Per User Pass Limit" {...f('per_user_pass_limit')} type="number" />
          </div>
          <Input label="Per User Cancellation Limit" {...f('per_user_cancellation_limit')} type="number" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={!!form.recommended} onChange={e => setForm(p => ({ ...p, recommended: e.target.checked ? 1 : 0 }))} />
            Recommended
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

// ── Riders (Customers) ─────────────────────────────────────────────────────────
function RidersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/users').then(data => setUsers(data.filter(u => u.role === 'passenger'))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    if (!users.length) return;
    const keys = ['id', 'name', 'phone', 'account_status', 'created_at'];
    const csv = [keys.join(','), ...users.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'customers.csv'; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Customer</h2>
        <Btn small variant="outline" onClick={exportCSV}>Export CSV</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'Customer ID' },
              { key: 'name', label: 'Name' },
              { key: 'phone', label: 'Phone' },
              { key: 'account_status', label: 'Status', render: r => statusBadge(r.account_status) },
              { key: 'created_at', label: 'Registered', render: r => r.created_at?.slice(0, 10) },
            ]}
            data={users}
          />
        </Card>
      )}
    </div>
  );
}

// ── Drivers Page ──────────────────────────────────────────────────────────────
function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/users/drivers/all').then(setDrivers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const approve = async (id) => {
    await apiFetch(`/users/${id}/approve`, { method: 'POST' });
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, account_status: 'active' } : d));
  };
  const reject = async (id) => {
    const note = window.prompt('Rejection reason:');
    if (note === null) return;
    await apiFetch(`/users/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, account_status: 'rejected' } : d));
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 16px' }}>Driver</h2>
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
              { key: 'avg_rating', label: 'Rating', render: r => Number(r.avg_rating).toFixed(1) },
              { key: 'total_trips', label: 'Trips' },
            ]}
            data={drivers}
            extraActions={r => r.account_status === 'pending_review' && <>
              <Btn small variant="ghost" onClick={() => approve(r.id)}>Approve</Btn>
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
        <h2 style={{ margin: 0 }}>Driver Documents</h2>
        <Btn onClick={() => { setForm({ status: 'active', num_images: 1, doc_required: 1, gallery_restricted: 0, doc_number_required: 0, expiry_required: 0, expired_action: 'none' }); setModal('add'); }}>+ Add Document</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'Document ID' },
              { key: 'doc_name', label: 'Document Name' },
              { key: 'doc_type', label: 'Document Category' },
              { key: 'num_images', label: 'Number of Images' },
              { key: 'gallery_restricted', label: 'Gallery Restricted', render: r => r.gallery_restricted ? 'Yes' : 'No' },
              { key: 'doc_required', label: 'Document Required', render: r => r.doc_required ? 'Yes' : 'No' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete document type?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Driver Document' : 'Edit Driver Document'} onClose={() => setModal(null)}>
          <Input label="Document Name *" {...f('doc_name')} />
          <Select label="Document Type" {...f('doc_type')} options={[{ value: 'image', label: 'Image' }, { value: 'pdf', label: 'PDF' }, { value: 'both', label: 'Both' }]} />
          <Input label="Number of Images" {...f('num_images')} type="number" />
          <Select label="Expired Action" {...f('expired_action')} options={[{ value: 'none', label: 'None' }, { value: 'block', label: 'Block' }, { value: 'notify', label: 'Notify' }]} />
          {[['gallery_restricted', 'Gallery Restricted'], ['doc_required', 'Document Required'], ['doc_number_required', 'Document Number Required'], ['expiry_required', 'Document Expiry Date Required']].map(([k, label]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={!!form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked ? 1 : 0 }))} />
              {label}
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
      <h2 style={{ margin: '0 0 16px' }}>Delete Account Request</h2>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'user_name', label: 'User Name' },
              { key: 'user_role', label: 'User' },
              { key: 'reason', label: 'Reason' },
              { key: 'feedback', label: 'Feedback' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            extraActions={r => r.status === 'pending' && <>
              <Btn small variant="ghost" onClick={() => approve(r.id)}>Approve</Btn>
              <Btn small variant="danger" onClick={() => reject(r.id)}>Reject</Btn>
            </>}
          />
        </Card>
      )}
    </div>
  );
}

// ── Push Notifications ────────────────────────────────────────────────────────
function PushesPage() {
  const { items, loading, create, remove } = useCrud('/pushes');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ user_type: 'all', title: '', message: '' });

  const send = async () => {
    await create(form);
    setModal(false);
    setForm({ user_type: 'all', title: '', message: '' });
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Pushes</h2>
        <Btn onClick={() => setModal(true)}>Create Push</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Title' },
              { key: 'message', label: 'Message' },
              { key: 'user_type', label: 'Sent To' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
              { key: 'created_at', label: 'Date', render: r => r.created_at?.slice(0, 16) },
            ]}
            data={items}
            onDelete={r => { if (window.confirm('Delete push?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title="Send Push Notification" onClose={() => setModal(false)}>
          <Input label="Notification Title *" {...f('title')} />
          <Input label="Notification Message *" {...f('message')} />
          <Select label="Send Push To" {...f('user_type')} options={[{ value: 'all', label: 'All Users' }, { value: 'customer', label: 'Customers' }, { value: 'driver', label: 'Drivers' }]} />
          <Input label="Image URL (Optional)" {...f('image_url')} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={send}>Send Push</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── General Settings ──────────────────────────────────────────────────────────
function GeneralSettingsPage() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/admin/settings/general').then(setForm).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    await apiFetch('/admin/settings/general', { method: 'PUT', body: JSON.stringify(form) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <h2 style={{ margin: '0 0 20px' }}>General Settings</h2>
      {loading ? <p>Loading…</p> : (
        <Card style={{ maxWidth: 600 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 15 }}>Client Settings</h4>
          <Input label="Client Name *" {...f('client_name')} />
          <Input label="Support Email *" {...f('support_email')} type="email" />
          <Input label="Brand Logo URL" {...f('brand_logo_url')} />
          <Input label="Favicon URL" {...f('favicon_url')} />
          <Btn onClick={save} style={{ marginBottom: 24 }}>Update</Btn>
          {saved && <span style={{ color: C.green, marginLeft: 10, fontSize: 13 }}>Saved!</span>}

          <h4 style={{ margin: '0 0 16px', fontSize: 15, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>Feature Settings</h4>
          <Input label="Number of Nearby Stops to Show" {...f('nearby_stops_count')} type="number" />
          <Input label="Maximum Distance for Nearby Stops (meters)" {...f('max_nearby_distance')} type="number" />
          <Btn onClick={save}>Update</Btn>
        </Card>
      )}
    </div>
  );
}

// ── City Settings ─────────────────────────────────────────────────────────────
function CitySettingsPage() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const CITY_ID = 1;

  useEffect(() => {
    apiFetch(`/admin/settings/city/${CITY_ID}`).then(setForm).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    await apiFetch(`/admin/settings/city/${CITY_ID}`, { method: 'PUT', body: JSON.stringify(form) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <h2 style={{ margin: '0 0 20px' }}>City Settings</h2>
      {loading ? <p>Loading…</p> : (
        <Card style={{ maxWidth: 600 }}>
          <Input label="Customer Support Number *" {...f('customer_support_number')} />
          <Input label="Driver Support Number *" {...f('driver_support_number')} />
          <Input label="Emergency Number *" {...f('emergency_number')} />
          <Select label="Service Type *" {...f('service_type')} options={[
            { value: 'both', label: 'On-Demand and Scheduled' },
            { value: 'on_demand', label: 'On-Demand Only' },
            { value: 'scheduled', label: 'Scheduled Only' },
          ]} />
          <Btn onClick={save}>Update</Btn>
          {saved && <span style={{ color: C.green, marginLeft: 10, fontSize: 13 }}>Saved!</span>}
        </Card>
      )}
    </div>
  );
}

// ── Manager Settings ──────────────────────────────────────────────────────────
function ManagerSettingsPage() {
  const { items, loading, create, update, remove, load } = useCrud('/managers');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const { items: roles } = useCrud('/roles');

  const save = async () => {
    if (modal === 'add') await create(form); else await update(form.id, form);
    setModal(null);
  };
  const resetPwd = async (id) => {
    const password = window.prompt('New password:');
    if (!password) return;
    await apiFetch(`/managers/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) });
    window.alert('Password reset successfully');
  };
  const f = (k) => ({ value: form[k], onChange: v => setForm(p => ({ ...p, [k]: v })) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Manager Settings</h2>
        <Btn onClick={() => { setForm({ status: 'active' }); setModal('add'); }}>+ Add Manager</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
              { key: 'role_name', label: 'Role' },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete manager?')) remove(r.id); }}
            extraActions={r => <Btn small variant="outline" onClick={() => resetPwd(r.id)}>Reset Password</Btn>}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Manager' : 'Edit Manager'} onClose={() => setModal(null)}>
          <Input label="Admin Name *" {...f('name')} />
          <Input label="Email *" {...f('email')} type="email" />
          {modal === 'add' && <>
            <Input label="Password *" {...f('password')} type="password" />
            <Input label="Confirm Password *" {...f('confirm_password')} type="password" />
          </>}
          <Select label="Role *" {...f('role_id')} options={[{ value: '', label: 'Select Role' }, ...roles.map(r => ({ value: r.id, label: r.name }))]} />
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

// ── Roles & Permissions ───────────────────────────────────────────────────────
function RolesPage() {
  const { items, loading, create, update, remove } = useCrud('/roles');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [selectedPerms, setSelectedPerms] = useState([]);

  const ALL_TABS = ['Customer', 'Vehicle Type', 'Driver Documents', 'Dynamic HomeScreen', 'Manager Settings', 'Geofence', 'General Settings', 'City Settings', 'Map View', 'Dashboard', 'Shuttle Stops', 'Shuttle Routes', 'Shuttle Vehicles', 'Shuttle Fare', 'Shuttle Trips', 'Shuttle Analytics', 'Shuttle Cancellation', 'Operational Cities', 'Pushes', 'Shuttle Cancellation Reason', 'Driver', 'Roles and Permissions', 'Delete Account'];

  const openAdd = () => { setForm({}); setSelectedPerms([]); setModal('add'); };
  const openEdit = (r) => { setForm(r); setSelectedPerms(r.permissions || []); setModal('edit'); };
  const save = async () => {
    const body = { ...form, permissions: selectedPerms };
    if (modal === 'add') await create(body); else await update(form.id, body);
    setModal(null);
  };
  const togglePerm = (p) => setSelectedPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Roles & Permissions</h2>
        <Btn onClick={openAdd}>+ Add Role</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Role Name' }, { key: 'permissions', label: 'Permissions', render: r => <span style={{ fontSize: 12, color: C.muted }}>{(r.permissions || []).join(', ') || 'None'}</span> }]}
            data={items}
            onEdit={openEdit}
            onDelete={r => { if (window.confirm('Delete role?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Role' : 'Edit Role'} onClose={() => setModal(null)}>
          <Input label="Role Name *" value={form.name || ''} onChange={v => setForm(p => ({ ...p, name: v }))} />
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Select Tabs *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALL_TABS.map(t => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', padding: '4px 8px', borderRadius: 5, background: selectedPerms.includes(t) ? C.blueLight : '#f5f5f5' }}>
                  <input type="checkbox" checked={selectedPerms.includes(t)} onChange={() => togglePerm(t)} />
                  {t}
                </label>
              ))}
            </div>
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

// ── Operational Cities ────────────────────────────────────────────────────────
function OperationalCitiesPage() {
  const { items, loading, create, update, remove } = useCrud('/cities');
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
        <h2 style={{ margin: 0 }}>Operational Cities</h2>
        <Btn onClick={() => { setForm({ status: 'active' }); setModal('add'); }}>+ Add City</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'City Name' },
              { key: 'country', label: 'Country' },
              { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete city?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Operational City' : 'Edit City'} onClose={() => setModal(null)}>
          <Input label="City Name *" {...f('name')} />
          <Input label="Country" {...f('country')} />
          <div style={{ display: 'flex', gap: 12 }}>
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
        <h2 style={{ margin: 0 }}>HomeScreen Settings</h2>
        <Btn onClick={() => { setForm({ active: 1, user_type: 'customer', display_order: 1 }); setModal('add'); }}>+ Add</Btn>
      </div>
      {loading ? <p>Loading…</p> : (
        <Card>
          <Table
            columns={[
              { key: 'category', label: 'Category' },
              { key: 'display_order', label: 'Display Order' },
              { key: 'active', label: 'Active', render: r => r.active ? <Badge label="Yes" color={C.green} /> : 'No' },
              { key: 'user_type', label: 'User Type' },
              { key: 'geofence_name', label: 'Geofence Name' },
            ]}
            data={items}
            onEdit={r => { setForm(r); setModal('edit'); }}
            onDelete={r => { if (window.confirm('Delete item?')) remove(r.id); }}
          />
        </Card>
      )}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Data' : 'Edit Data'} onClose={() => setModal(null)}>
          <Select label="Category" {...f('category')} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Input label="Display Order" {...f('display_order')} type="number" />
          <Select label="User Type" {...f('user_type')} options={[{ value: 'customer', label: 'Customer' }, { value: 'driver', label: 'Driver' }, { value: 'both', label: 'Both' }]} />
          <Input label="Geofence Name" {...f('geofence_name')} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={!!form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked ? 1 : 0 }))} />
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

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', section: null },
  { section: 'Shuttle' },
  { id: 'stops', label: 'Stops', icon: '📍' },
  { id: 'routes', label: 'Routes', icon: '🛤️' },
  { id: 'vehicles', label: 'Vehicles', icon: '🚐' },
  { id: 'fares', label: 'Fare', icon: '💰' },
  { id: 'trips', label: 'Trips', icon: '🗓️' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'cancellation', label: 'Cancellation', icon: '❌' },
  { id: 'cancellation-reasons', label: 'Cancellation Reasons', icon: '📋' },
  { id: 'promotions', label: 'Promotions', icon: '🎁' },
  { id: 'suggested-routes', label: 'Suggested Routes', icon: '🗺️' },
  { id: 'holiday', label: 'Holiday', icon: '🏖️' },
  { id: 'shuttle-pass', label: 'Shuttle Pass', icon: '🎫' },
  { section: 'Users' },
  { id: 'customers', label: 'Customer', icon: '👤' },
  { id: 'drivers', label: 'Driver', icon: '🚗' },
  { id: 'delete-requests', label: 'Delete Account Request', icon: '🗑️' },
  { id: 'driver-documents', label: 'Driver Documents', icon: '📄' },
  { id: 'vehicle-types', label: 'Vehicle Type', icon: '🚌' },
  { section: 'Settings' },
  { id: 'homescreen', label: 'HomeScreen', icon: '📱' },
  { id: 'pushes', label: 'Pushes', icon: '🔔' },
  { id: 'general-settings', label: 'General Settings', icon: '⚙️' },
  { id: 'city-settings', label: 'City Settings', icon: '🏙️' },
  { id: 'manager-settings', label: 'Manager Settings', icon: '👔' },
  { id: 'roles', label: 'Roles and Permissions', icon: '🔑' },
  { id: 'operational-cities', label: 'Operational Cities', icon: '🌍' },
];

const PAGE_MAP = {
  dashboard: DashboardPage,
  stops: StopsPage,
  routes: RoutesPage,
  vehicles: VehiclesPage,
  fares: FaresPage,
  trips: TripsPage,
  analytics: BookingsAnalyticsPage,
  cancellation: CancellationPage,
  'cancellation-reasons': CancellationReasonsPage,
  promotions: PromotionsPage,
  'suggested-routes': SuggestedRoutesPage,
  holiday: HolidayPage,
  'shuttle-pass': ShuttlePassPage,
  customers: RidersPage,
  drivers: DriversPage,
  'delete-requests': DeleteRequestsPage,
  'driver-documents': DriverDocumentsPage,
  'vehicle-types': VehicleTypesPage,
  homescreen: HomeScreenPage,
  pushes: PushesPage,
  'general-settings': GeneralSettingsPage,
  'city-settings': CitySettingsPage,
  'manager-settings': ManagerSettingsPage,
  roles: RolesPage,
  'operational-cities': OperationalCitiesPage,
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminDash() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const PageComponent = PAGE_MAP[page] || DashboardPage;

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif', background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top AppBar */}
      <div style={{
        background: C.white, borderBottom: `1px solid ${C.border}`,
        height: 66, display: 'flex', alignItems: 'center', padding: '0 20px',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.text }}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 18, color: C.blue }}>Admin Panel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: C.muted }}>Welcome, {user?.name}</span>
          <Btn small variant="outline" onClick={logout}>Logout</Btn>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: 'flex', marginTop: 66 }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 260, background: C.sidebar, borderRight: `1px solid ${C.border}`,
            position: 'fixed', top: 66, bottom: 0, left: 0, overflowY: 'auto',
            zIndex: 999, padding: '12px 0',
          }}>
            {NAV.map((item, i) => {
              if (item.section) return (
                <div key={i} style={{ padding: '10px 20px 4px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.section}</div>
              );
              const active = page === item.id;
              return (
                <div key={item.id} onClick={() => setPage(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
                  cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
                  background: active ? C.blueLight : 'transparent',
                  color: active ? C.blue : C.text,
                  borderLeft: active ? `3px solid ${C.blue}` : '3px solid transparent',
                  transition: 'all .15s',
                }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, marginLeft: sidebarOpen ? 260 : 0, padding: 24, transition: 'margin .2s', minHeight: 'calc(100vh - 66px)' }}>
          <PageComponent />
        </div>
      </div>
    </div>
  );
}
