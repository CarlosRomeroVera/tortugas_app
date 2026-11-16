import { api } from './http';
import type { AvailabilityResponse, Booking, CreateBookingPayload, CreatePaymentPayload, LoginResponse } from './types';

export const authApi = {
  login: (email: string, password: string, device_name: string): Promise<LoginResponse> =>
    api<LoginResponse>('/auth/token', { method: 'POST', body: { email, password, device_name } }),
  logout: (): Promise<void> => api<void>('/auth/token', { method: 'DELETE' }),
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
