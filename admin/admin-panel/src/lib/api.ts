const BASE = "/api/admin";

function getToken(): string | null {
  return localStorage.getItem("waslney_admin_token");
}
export function setToken(token: string) {
  localStorage.setItem("waslney_admin_token", token);
}
export function clearToken() {
  localStorage.removeItem("waslney_admin_token");
}
export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) { clearToken(); window.location.href = "/"; }
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  /* Auth */
  login: (email: string, password: string) =>
    request<{ token: string; user: AdminUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<AdminUser>("/auth/me"),

  /* Dashboard */
  dashboard: () => request<DashboardStats>("/dashboard/stats"),

  /* Users */
  customers: () => request<User[]>("/users/customers"),
  drivers: (status?: string) => request<Driver[]>(`/users/drivers${status ? `?status=${status}` : ""}`),
  updateUserStatus: (id: number, account_status: string, rejection_note?: string) =>
    request(`/users/${id}/status`, { method: "PUT", body: JSON.stringify({ account_status, rejection_note }) }),

  /* Trips */
  trips: (params?: Record<string, string>) => request<Trip[]>(`/trips?${new URLSearchParams(params || {})}`),
  cancelTrip: (id: number) => request(`/trips/${id}/cancel`, { method: "PUT" }),

  /* Shuttle Stops */
  stops: () => request<any[]>("/stops"),
  createStop: (data: any) => request("/stops", { method: "POST", body: JSON.stringify(data) }),
  updateStop: (id: number, data: any) => request(`/stops/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteStop: (id: number) => request(`/stops/${id}`, { method: "DELETE" }),

  /* Shuttle Routes */
  shuttleRoutes: () => request<any[]>("/routes"),
  createShuttleRoute: (data: any) => request("/routes", { method: "POST", body: JSON.stringify(data) }),
  updateShuttleRoute: (id: number, data: any) => request(`/routes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteShuttleRoute: (id: number) => request(`/routes/${id}`, { method: "DELETE" }),

  /* Shuttle Vehicles */
  shuttleVehicles: () => request<any[]>("/vehicles"),
  createShuttleVehicle: (data: any) => request("/vehicles", { method: "POST", body: JSON.stringify(data) }),
  updateShuttleVehicle: (id: number, data: any) => request(`/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteShuttleVehicle: (id: number) => request(`/vehicles/${id}`, { method: "DELETE" }),

  /* Shuttle Fares */
  shuttleFares: () => request<any[]>("/fare"),
  createShuttleFare: (data: any) => request("/fare", { method: "POST", body: JSON.stringify(data) }),
  updateShuttleFare: (id: number, data: any) => request(`/fare/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteShuttleFare: (id: number) => request(`/fare/${id}`, { method: "DELETE" }),

  /* Shuttle Trips */
  shuttleTrips: (params?: Record<string, string>) => request<any[]>(`/shuttle-trips?${new URLSearchParams(params || {})}`),
  createShuttleTrip: (data: any) => request("/shuttle-trips", { method: "POST", body: JSON.stringify(data) }),
  updateShuttleTrip: (id: number, data: any) => request(`/shuttle-trips/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteShuttleTrip: (id: number) => request(`/shuttle-trips/${id}`, { method: "DELETE" }),

  /* Shuttle Passes */
  shuttlePasses: () => request<any[]>("/shuttle-pass"),
  createShuttlePass: (data: any) => request("/shuttle-pass", { method: "POST", body: JSON.stringify(data) }),
  updateShuttlePass: (id: number, data: any) => request(`/shuttle-pass/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteShuttlePass: (id: number) => request(`/shuttle-pass/${id}`, { method: "DELETE" }),

  /* Analytics */
  analytics: (period: string) => request<AnalyticsSummary>(`/analytics/summary?period=${period}`),

  /* Promotions */
  promotions: () => request<Promotion[]>("/promotions"),
  createPromotion: (data: Partial<Promotion>) => request("/promotions", { method: "POST", body: JSON.stringify(data) }),
  updatePromotion: (id: number, data: Partial<Promotion>) => request(`/promotions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePromotion: (id: number) => request(`/promotions/${id}`, { method: "DELETE" }),

  /* Suggested Routes */
  suggestedRoutes: (params?: Record<string, string>) => request<any[]>(`/suggested-routes?${new URLSearchParams(params || {})}`),
  updateSuggestedRoute: (id: number, status: string) => request(`/suggested-routes/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
  deleteSuggestedRoute: (id: number) => request(`/suggested-routes/${id}`, { method: "DELETE" }),

  /* Holidays */
  holidays: () => request<Holiday[]>("/holidays"),
  createHoliday: (data: Partial<Holiday>) => request("/holidays", { method: "POST", body: JSON.stringify(data) }),
  deleteHoliday: (id: number) => request(`/holidays/${id}`, { method: "DELETE" }),

  /* Vehicle Types */
  vehicleTypes: () => request<VehicleType[]>("/vehicle-types"),
  createVehicleType: (data: Partial<VehicleType>) => request("/vehicle-types", { method: "POST", body: JSON.stringify(data) }),
  deleteVehicleType: (id: number) => request(`/vehicle-types/${id}`, { method: "DELETE" }),

  /* Driver Documents */
  driverDocuments: () => request<any[]>("/driver-documents"),
  driverDocTypes: () => request<any[]>("/driver-documents"),
  createDriverDocType: (data: any) => request("/driver-documents", { method: "POST", body: JSON.stringify(data) }),
  deleteDriverDocType: (id: number) => request(`/driver-documents/${id}`, { method: "DELETE" }),

  /* Cancellation */
  cancellationPolicies: () => request<CancellationPolicy[]>("/cancellation/policies"),
  cancellationReasons: () => request<CancellationReason[]>("/cancellation/reasons"),
  createCancellationReason: (data: any) => request("/cancellation/reasons", { method: "POST", body: JSON.stringify(data) }),
  deleteCancellationReason: (id: number) => request(`/cancellation/reasons/${id}`, { method: "DELETE" }),

  /* Delete Requests */
  deleteRequests: () => request<DeleteRequest[]>("/users/delete-requests/list"),
  approveDeleteRequest: (id: number) => request(`/users/delete-requests/${id}`, { method: "PUT", body: JSON.stringify({ status: "approved" }) }),

  /* Operational Cities */
  cities: () => request<any[]>("/cities"),
  createCity: (data: any) => request("/cities", { method: "POST", body: JSON.stringify(data) }),
  updateCity: (id: number, data: any) => request(`/cities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCity: (id: number) => request(`/cities/${id}`, { method: "DELETE" }),

  /* Homescreen */
  homescreen: (city?: string) => request<any[]>(`/homescreen${city ? `?city=${city}` : ""}`),
  createHomescreenItem: (data: any) => request("/homescreen", { method: "POST", body: JSON.stringify(data) }),
  updateHomescreenItem: (id: number, data: any) => request(`/homescreen/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteHomescreenItem: (id: number) => request(`/homescreen/${id}`, { method: "DELETE" }),

  /* Push Notifications */
  pushHistory: () => request<any[]>("/pushes"),
  sendPush: (data: any) => request("/pushes", { method: "POST", body: JSON.stringify(data) }),

  /* Settings */
  settings: () => request<any>("/settings"),
  updateSetting: (key: string, value: string) =>
    request("/settings", { method: "PUT", body: JSON.stringify({ settings: { [key]: value } }) }),

  /* ── Tenders ── */
  tenders: () => request<any[]>("/tenders"),
  tenderDetail: (id: number) => request<any>(`/tenders/${id}`),
  openTender: (data: any) => request("/tenders", { method: "POST", body: JSON.stringify(data) }),
  cancelTender: (id: number) => request(`/tenders/${id}`, { method: "DELETE" }),

  /* ── New Account ── */
  createAccount: (data: any) => request<{ ok: boolean; user: any }>("/accounts", { method: "POST", body: JSON.stringify(data) }),

  /* ── Driver Review ── */
  pendingReview: () => request<{ drivers: any[] }>("/review/pending"),
  approveDriver: (id: number) => request(`/review/${id}/approve`, { method: "POST" }),
  rejectDriver: (id: number, note: string) => request(`/review/${id}/reject`, { method: "POST", body: JSON.stringify({ note }) }),

  /* ── Manage Bookings ── */
  bookingSettings: () => request<any>("/manage-bookings/settings"),
  saveBookingSettings: (data: any) => request("/manage-bookings/settings", { method: "PUT", body: JSON.stringify(data) }),
  bookingTripsList: () => request<any[]>("/manage-bookings/trips-list"),
  weekSchedule: (tripId: number) => request<any>(`/manage-bookings/week-schedule?trip_id=${tripId}`),
  allDayBookings: (date?: string) => request<any[]>(`/manage-bookings/all-day-bookings${date ? `?date=${date}` : ""}`),

  /* ── Create Trip ── */
  createTrip: (data: any) => request<{ id: number }>("/trips", { method: "POST", body: JSON.stringify(data) }),
  activeDrivers: () => request<any[]>("/users/drivers?status=active"),
};

/* ── Types ── */
export interface AdminUser { id: number; name: string; email: string; role: string; }

export interface DashboardStats {
  users: { total: number; passengers: number; drivers: number };
  trips: { total: number; active: number; completed: number; upcoming: number; cancelled: number };
  bookings: { total: number; confirmed: number; cancelled: number; completed: number };
  revenue: string;
  recentBookings: RecentBooking[];
  recentTrips: Trip[];
}
export interface RecentBooking { id: number; status: string; created_at: string; seats: number; passenger_name: string; origin: string; destination: string; price: number; }
export interface User { id: number; name: string; phone: string; email: string; role: string; account_status: string; car?: string; plate?: string; profile_photo?: string; created_at: string; }
export interface Driver extends User { avg_rating: number; total_trips: number; completed_trips: number; rejection_note?: string; }
export interface Trip { id: number; origin: string; destination: string; departure_time: string; price: number; seats: number; status: string; is_pool: number; driver_name: string; driver_phone: string; confirmed_bookings?: number; created_at: string; }
export interface AnalyticsSummary { totals: { total_bookings: number; revenue: number; total_trips: number; unique_passengers: number }; dailyRevenue: { date: string; revenue: number; bookings: number }[]; }
export interface Promotion { id: number; code: string; discount_type: string; discount_value: number; min_fare: number; max_uses: number; used_count: number; valid_from: string; valid_until: string; is_active: number; }
export interface Holiday { id: number; name: string; date: string; surge_multiplier: number; }
export interface VehicleType { id: number; name: string; capacity: number; base_fare: number; per_km_rate: number; is_active: number; }
export interface CancellationPolicy { id: number; name: string; hours_before: number; refund_percent: number; }
export interface CancellationReason { id: number; reason: string; role: string; }
export interface DeleteRequest { id: number; user_id: number; reason: string; status: string; created_at: string; name: string; phone: string; email: string; }
