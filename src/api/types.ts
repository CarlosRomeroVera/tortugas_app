export type Role = 'admin' | 'coordinacion' | 'ventas' | 'capitan' | 'chofer' | 'mantenimiento';

export interface User {
  id: number;
  name: string;
  roles: Role[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ServiceInfo {
  id: string;
  slug: string;
  name: string;
  shared: boolean;
  duration_minutes: number;
  currency: Currency;
  price_adult_cents: number;
  price_child_cents: number;
}

export interface SharedSlot {
  departure_id: string;
  starts_at: string;
  local_time: string;
  asset: string;
  capacity: number;
  seats_left: number;
  available: boolean;
}

export interface PrivateSlot {
  starts_at: string;
  local_time: string;
  assets: { id: string; name: string; capacity: number }[];
  available: boolean;
}

export interface AvailabilityResponse {
  service: ServiceInfo;
  date: string;
  timezone: string;
  slots: (SharedSlot | PrivateSlot)[];
}

export const isSharedSlot = (slot: SharedSlot | PrivateSlot): slot is SharedSlot => 'departure_id' in slot;

export type Currency = 'MXN' | 'USD';
export type Channel = 'website' | 'whatsapp' | 'agency' | 'counter' | 'phone';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'online' | 'agency_credit';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Payment {
  amount_cents: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentStatus;
  paid_at: string | null;
}

export interface Booking {
  id: string;
  code: string;
  status: BookingStatus;
  channel: Channel;
  adults: number;
  children: number;
  pax: number;
  currency: Currency;
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  cruise_ship: string | null;
  all_aboard_at: string | null;
  customer: { name: string; email: string | null; phone: string | null };
  departure: {
    id: string;
    code: string;
    service: string;
    asset: string;
    starts_at: string;
    local_time: string;
  };
  payments: Payment[];
}

export interface CreateBookingPayload {
  departure_id?: string;
  service_id?: string;
  starts_at?: string;
  asset_id?: string;
  adults: number;
  children?: number;
  channel: Channel;
  customer: { name: string; email?: string | null; phone?: string | null; country?: string | null };
  cruise_ship?: string | null;
  all_aboard_at?: string | null;
  pickup_location_id?: string | null;
  agency_reference?: string | null;
  notes?: string | null;
}

export interface CreatePaymentPayload {
  amount_cents: number;
  currency: Currency;
  method: PaymentMethod;
  usd_rate?: number;
  provider?: string | null;
  provider_reference?: string | null;
}

// ─── Perfil y catálogo ───────────────────────────────────────────────

export type StaffRole = 'captain' | 'driver' | 'guide' | 'mechanic';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  phone: string | null;
  license_number: string | null;
  license_expires_on: string | null;
}

/** GET /me. `staff` es null si el usuario no está ligado a una ficha de personal. */
export interface Me extends User {
  email: string;
  staff: Staff | null;
}

export interface ServiceStageInfo {
  id: string;
  position: number;
  name: string;
  requires_reading: boolean;
}

/** Elemento de GET /services. */
export interface CatalogService {
  id: string;
  slug: string;
  name: string;
  category: string;
  asset_kind: AssetKind;
  shared: boolean;
  duration_minutes: number;
  capacity: number;
  currency: Currency;
  price_adult_cents: number;
  price_child_cents: number;
  description: string | null;
  stages: ServiceStageInfo[];
}

// ─── Capitán y chofer ────────────────────────────────────────────────

export type AssetKind = 'boat' | 'vehicle';
export type DepartureStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface CrewDeparture {
  id: string;
  code: string;
  status: DepartureStatus;
  service: { id: string; slug: string; name: string; shared: boolean };
  asset: {
    id: string;
    name: string;
    kind: AssetKind;
    registration: string | null;
    capacity: number;
    /** `hours` = horómetro (embarcación), `km` = odómetro (vehículo). */
    reading: { unit: 'hours' | 'km'; current: number | null };
  };
  starts_at: string;
  ends_at: string;
  local_date: string;
  local_time: string;
  local_end_time: string;
  departed_at: string | null;
  returned_at: string | null;
  my_role: StaffRole | null;
  crew: { name: string; role: StaffRole; phone: string | null }[];
  capacity: number;
  bookings_count: number;
  /** `booked` no cuenta a los no presentados. */
  pax: { booked: number; checked_in: number; no_show: number };
  current_stage: { id: string; position: number; name: string } | null;
  stages_total: number;
  notes: string | null;
}

export interface DepartureStage extends ServiceStageInfo {
  /** null en una etapa saltada aunque `done` sea true. */
  reached_at: string | null;
  done: boolean;
}

export interface PickupLocation {
  id: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
}

export interface ManifestBooking {
  /** UUID: es el que va en `booking_id` de los eventos, no `code`. */
  id: string;
  code: string;
  status: BookingStatus;
  adults: number;
  children: number;
  pax: number;
  customer: { name: string; phone: string | null; country: string | null };
  cruise_ship: string | null;
  all_aboard_at: string | null;
  all_aboard_local_time: string | null;
  /** null = llega por su cuenta. */
  pickup: PickupLocation | null;
  checked_in_at: string | null;
  currency: Currency;
  balance_cents: number;
  notes: string | null;
}

export interface CrewDepartureDetail extends CrewDeparture {
  stages: DepartureStage[];
  manifest: ManifestBooking[];
}

// ─── POST /sync/events ───────────────────────────────────────────────

export type SyncEventType = 'stage' | 'check_in' | 'check_in_undo' | 'no_show' | 'fault';
export type FaultSeverity = 'minor' | 'blocking';

export interface SyncEvent {
  client_uuid: string;
  type: SyncEventType;
  occurred_at: string;
  departure_id?: string;
  stage_id?: string;
  reading?: number;
  booking_id?: string;
  asset_id?: string;
  severity?: FaultSeverity;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export type SyncStatus = 'applied' | 'ignored' | 'duplicate' | 'rejected';
export type SyncRejectReason =
  | 'not_found'
  | 'not_crew'
  | 'departure_cancelled'
  | 'departure_closed'
  | 'booking_cancelled'
  | 'checked_in'
  | 'reading_required'
  | 'invalid_reading';

export interface SyncResult {
  client_uuid: string;
  status: SyncStatus;
  reason?: SyncRejectReason;
  message?: string;
}
