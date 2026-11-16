import { reactive } from 'vue';

import type { Booking } from '@/api/types';

/**
 * Reservas abiertas recientemente en este teléfono, para volver a ellas rápido.
 * La API aún no tiene un listado de reservas; esto es solo un atajo local (sin datos de pago).
 */
export interface RecentBooking {
  code: string;
  customer: string;
  service: string;
  local_time: string;
  status: Booking['status'];
}

const KEY = 'tortugas.recentBookings';
const MAX = 15;

function load(): RecentBooking[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export const recentBookings = reactive({ items: load() });

export function rememberBooking(b: Booking): void {
  const entry: RecentBooking = {
    code: b.code,
    customer: b.customer.name,
    service: `${b.departure.service} · ${b.departure.asset}`,
    local_time: b.departure.local_time,
    status: b.status,
  };
  recentBookings.items = [entry, ...recentBookings.items.filter((x) => x.code !== b.code)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(recentBookings.items));
  } catch {
    // Sin almacenamiento: el atajo solo vive en memoria.
  }
}
