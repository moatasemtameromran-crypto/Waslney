const BASE = '/api/admin';

function getAdminToken() {
  return localStorage.getItem('admin_token');
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const t = getAdminToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const get  = (p)    => request('GET',    p);
const post = (p, b) => request('POST',   p, b);
const put  = (p, b) => request('PUT',    p, b);
const del  = (p)    => request('DELETE', p);

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const adminLogin        = (email, password)    => post('/auth/login', { email, password });
export const adminMe           = ()                   => get('/auth/me');
export const changePassword    = (current_password, new_password) =>
  put('/auth/change-password', { current_password, new_password });

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
export const getDashboardStats = () => get('/dashboard/stats');

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
export const getAnalyticsBookings   = (params = {}) => get(`/analytics/bookings?${new URLSearchParams(params)}`);
export const getAnalyticsDriverTrips= (params = {}) => get(`/analytics/driver-trips?${new URLSearchParams(params)}`);
export const getAnalyticsSummary    = (period = 'week') => get(`/analytics/summary?period=${period}`);
export const getAnalyticsRatings    = () => get('/analytics/ratings');

// ── USERS ─────────────────────────────────────────────────────────────────────
export const getUsers            = (params = {}) => get(`/users?${new URLSearchParams(params)}`);
export const getUser             = (id)           => get(`/users/${id}`);
export const getCustomers        = ()             => get('/users/customers');
export const getDrivers          = (params = {}) => get(`/users/drivers?${new URLSearchParams(params)}`);
export const updateUser          = (id, data)     => put(`/users/${id}`, data);
export const updateUserStatus    = (id, data)     => put(`/users/${id}/status`, data);
export const deleteUser          = (id)           => del(`/users/${id}`);
export const getDeleteRequests   = ()             => get('/users/delete-requests/list');
export const updateDeleteRequest = (id, status)   => put(`/users/delete-requests/${id}`, { status });

// ── TRIPS ─────────────────────────────────────────────────────────────────────
export const getTrips      = (params = {}) => get(`/trips?${new URLSearchParams(params)}`);
export const getTrip       = (id)           => get(`/trips/${id}`);
export const getTripBookings=(id)           => get(`/trips/${id}/bookings`);
export const createTrip    = (data)         => post('/trips', data);
export const updateTrip    = (id, data)     => put(`/trips/${id}`, data);
export const cancelTrip    = (id)           => put(`/trips/${id}/cancel`, {});
export const deleteTrip    = (id)           => del(`/trips/${id}`);

// ── PROMOTIONS ────────────────────────────────────────────────────────────────
export const getPromotions   = (params = {}) => get(`/promotions?${new URLSearchParams(params)}`);
export const createPromotion = (data)         => post('/promotions', data);
export const updatePromotion = (id, data)     => put(`/promotions/${id}`, data);
export const deletePromotion = (id)           => del(`/promotions/${id}`);

// ── HOLIDAYS ──────────────────────────────────────────────────────────────────
export const getHolidays   = (params = {}) => get(`/holidays?${new URLSearchParams(params)}`);
export const addHoliday    = (data)         => post('/holidays', data);
export const bulkHolidays  = (dates, city)  => post('/holidays/bulk', { dates, city });
export const deleteHoliday = (id)           => del(`/holidays/${id}`);

// ── CITIES ────────────────────────────────────────────────────────────────────
export const getCities    = ()       => get('/cities');
export const getCity      = (id)     => get(`/cities/${id}`);
export const createCity   = (data)   => post('/cities', data);
export const updateCity   = (id, d)  => put(`/cities/${id}`, d);
export const deleteCity   = (id)     => del(`/cities/${id}`);

// ── CANCELLATION ──────────────────────────────────────────────────────────────
export const getCancellationPolicies  = () => get('/cancellation/policies');
export const createCancellationPolicy = (d) => post('/cancellation/policies', d);
export const updateCancellationPolicy = (id, d) => put(`/cancellation/policies/${id}`, d);
export const deleteCancellationPolicy = (id) => del(`/cancellation/policies/${id}`);
export const getCancellationReasons   = () => get('/cancellation/reasons');
export const createCancellationReason = (d) => post('/cancellation/reasons', d);
export const updateCancellationReason = (id, d) => put(`/cancellation/reasons/${id}`, d);
export const deleteCancellationReason = (id) => del(`/cancellation/reasons/${id}`);

// ── VEHICLE TYPES ─────────────────────────────────────────────────────────────
export const getVehicleTypes   = (params = {}) => get(`/vehicle-types?${new URLSearchParams(params)}`);
export const getVehicleType    = (id)           => get(`/vehicle-types/${id}`);
export const createVehicleType = (data)         => post('/vehicle-types', data);
export const updateVehicleType = (id, data)     => put(`/vehicle-types/${id}`, data);
export const deleteVehicleType = (id)           => del(`/vehicle-types/${id}`);

// ── VEHICLES ──────────────────────────────────────────────────────────────────
export const getVehicles   = (params = {}) => get(`/vehicles?${new URLSearchParams(params)}`);
export const createVehicle = (data)         => post('/vehicles', data);
export const updateVehicle = (id, data)     => put(`/vehicles/${id}`, data);
export const deleteVehicle = (id)           => del(`/vehicles/${id}`);

// ── SHUTTLE ROUTES & STOPS ────────────────────────────────────────────────────
export const getShuttleRoutes  = (params = {}) => get(`/shuttle-routes?${new URLSearchParams(params)}`);
export const createShuttleRoute= (data)         => post('/shuttle-routes', data);
export const updateShuttleRoute= (id, data)     => put(`/shuttle-routes/${id}`, data);
export const deleteShuttleRoute= (id)           => del(`/shuttle-routes/${id}`);

export const getStops   = (params = {}) => get(`/stops?${new URLSearchParams(params)}`);
export const createStop = (data)         => post('/stops', data);
export const updateStop = (id, data)     => put(`/stops/${id}`, data);
export const deleteStop = (id)           => del(`/stops/${id}`);

// ── SHUTTLE TRIPS ─────────────────────────────────────────────────────────────
export const getShuttleTrips   = (params = {}) => get(`/shuttle-trips?${new URLSearchParams(params)}`);
export const getShuttleTrip    = (id)           => get(`/shuttle-trips/${id}`);
export const createShuttleTrip = (data)         => post('/shuttle-trips', data);
export const updateShuttleTrip = (id, data)     => put(`/shuttle-trips/${id}`, data);
export const deleteShuttleTrip = (id)           => del(`/shuttle-trips/${id}`);

// ── FARE ──────────────────────────────────────────────────────────────────────
export const getFareRules   = (params = {}) => get(`/fare?${new URLSearchParams(params)}`);
export const createFareRule = (data)         => post('/fare', data);
export const updateFareRule = (id, data)     => put(`/fare/${id}`, data);
export const deleteFareRule = (id)           => del(`/fare/${id}`);

// ── SHUTTLE PASSES ────────────────────────────────────────────────────────────
export const getShuttlePasses   = (params = {}) => get(`/shuttle-pass?${new URLSearchParams(params)}`);
export const createShuttlePass  = (data)         => post('/shuttle-pass', data);
export const updateShuttlePass  = (id, data)     => put(`/shuttle-pass/${id}`, data);
export const deleteShuttlePass  = (id)           => del(`/shuttle-pass/${id}`);

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
export const getPushes    = (params = {}) => get(`/pushes?${new URLSearchParams(params)}`);
export const sendPush     = (data)         => post('/pushes/send', data);
export const deletePush   = (id)           => del(`/pushes/${id}`);

// ── HOMESCREEN ────────────────────────────────────────────────────────────────
export const getHomescreen        = (params = {}) => get(`/homescreen?${new URLSearchParams(params)}`);
export const createHomescreenItem = (data)         => post('/homescreen', data);
export const updateHomescreenItem = (id, data)     => put(`/homescreen/${id}`, data);
export const deleteHomescreenItem = (id)           => del(`/homescreen/${id}`);
export const addGreeting          = (data)         => post('/homescreen/greetings', data);
export const deleteGreeting       = (id)           => del(`/homescreen/greetings/${id}`);

// ── SUGGESTED ROUTES ──────────────────────────────────────────────────────────
export const getSuggestedRoutes   = (params = {}) => get(`/suggested-routes?${new URLSearchParams(params)}`);
export const updateSuggestedRoute = (id, status)   => put(`/suggested-routes/${id}`, { status });
export const deleteSuggestedRoute = (id)            => del(`/suggested-routes/${id}`);

// ── DRIVER DOCUMENTS ──────────────────────────────────────────────────────────
export const getDriverDocTypes   = (params = {}) => get(`/driver-documents?${new URLSearchParams(params)}`);
export const createDriverDocType = (data)         => post('/driver-documents', data);
export const updateDriverDocType = (id, data)     => put(`/driver-documents/${id}`, data);
export const deleteDriverDocType = (id)           => del(`/driver-documents/${id}`);

// ── SETTINGS ──────────────────────────────────────────────────────────────────
export const getSettings     = (params = {}) => get(`/settings?${new URLSearchParams(params)}`);
export const updateSettings  = (data)         => put('/settings', data);
export const getCitySettings = (city)         => get(`/settings/city?city=${city}`);
export const updateCitySettings = (data)      => put('/settings/city', data);
export const getGeneralSettings = ()          => get('/settings/general');
export const updateGeneralSettings = (data)   => put('/settings/general', data);
