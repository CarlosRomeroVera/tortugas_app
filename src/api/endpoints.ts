import { api } from './http';
import type {
  AvailabilityResponse,
  Booking,
  CatalogService,
  CreateBookingPayload,
  CreatePaymentPayload,
  CrewDeparture,
  CrewDepartureDetail,
  LoginResponse,
  Me,
  SyncEvent,
  SyncResult,
} from './types';

export const authApi = {
  login: (email: string, password: string, device_name: string): Promise<LoginResponse> =>
    api<LoginResponse>('/auth/token', { method: 'POST', body: { email, password, device_name } }),
  logout: (): Promise<void> => api<void>('/auth/token', { method: 'DELETE' }),
};

export const meApi = {
  get: (): Promise<Me> => api<{ data: Me }>('/me').then((r) => r.data),
};

export const servicesApi = {
  list: (): Promise<CatalogService[]> => api<{ data: CatalogService[] }>('/services').then((r) => r.data),
};

/** Capitán y chofer: solo las salidas donde el usuario va como tripulación. */
export const crewApi = {
  /** `date` es la fecha local de Cozumel (YYYY-MM-DD). */
  departures: (date: string): Promise<CrewDeparture[]> =>
    api<{ data: CrewDeparture[] }>('/me/departures', { query: { date } }).then((r) => r.data),
  departure: (id: string): Promise<CrewDepartureDetail> =>
    api<{ data: CrewDepartureDetail }>(`/me/departures/${encodeURIComponent(id)}`).then((r) => r.data),
};

export const syncApi = {
  /** Máximo 200 eventos por lote. Los resultados vienen en el mismo orden. */
  send: (events: SyncEvent[]): Promise<SyncResult[]> =>
    api<{ results: SyncResult[] }>('/sync/events', { method: 'POST', body: { events } }).then((r) => r.results),
};

export const availabilityApi = {
  get: (service: string, date: string, pax: number): Promise<AvailabilityResponse> =>
    api<AvailabilityResponse>('/availability', { query: { service, date, pax } }),
};

export const bookingsApi = {
  /** `idempotencyKey` se genera una vez por intento y se reutiliza en los reintentos. */
  create: (payload: CreateBookingPayload, idempotencyKey: string): Promise<Booking> =>
    api<{ data: Booking }>('/bookings', {
      method: 'POST',
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    }).then((r) => r.data),
  get: (code: string): Promise<Booking> =>
    api<{ data: Booking }>(`/bookings/${encodeURIComponent(code)}`).then((r) => r.data),
  cancel: (code: string, reason?: string): Promise<Booking> =>
    api<{ data: Booking }>(`/bookings/${encodeURIComponent(code)}/cancel`, {
      method: 'POST',
      body: { reason: reason || undefined },
    }).then((r) => r.data),
  addPayment: (code: string, payload: CreatePaymentPayload): Promise<Booking> =>
    api<{ data: Booking }>(`/bookings/${encodeURIComponent(code)}/payments`, {
      method: 'POST',
      body: payload,
    }).then((r) => r.data),
};
