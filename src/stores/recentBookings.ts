import { reactive } from 'vue';

import type { Booking } from '@/api/types';
import { getJSON, setJSON } from '@/lib/storage';

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

export const recentBookings = reactive({ items: [] as RecentBooking[] });

/** Se lee de Preferences al importar el módulo; las escrituras esperan a que termine para no pisar la lista. */
const hydrated = getJSON<RecentBooking[]>(KEY).then((saved) => {
  if (!Array.isArray(saved)) return;
  const seen = new Set(recentBookings.items.map((x) => x.code));
  recentBookings.items = [...recentBookings.items, ...saved.filter((x) => !seen.has(x.code))].slice(0, MAX);
});

export async function rememberBooking(b: Booking): Promise<void> {
  const entry: RecentBooking = {
    code: b.code,
    customer: b.customer.name,
    service: `${b.departure.service} · ${b.departure.asset}`,
    local_time: b.departure.local_time,
    status: b.status,
  };
  await hydrated;
  recentBookings.items = [entry, ...recentBookings.items.filter((x) => x.code !== b.code)].slice(0, MAX);
  await setJSON(KEY, recentBookings.items);
}
