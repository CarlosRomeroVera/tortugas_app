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
