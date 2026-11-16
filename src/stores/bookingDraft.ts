import { reactive } from 'vue';

import type { PrivateSlot, ServiceInfo, SharedSlot } from '@/api/types';
import { uuid } from '@/lib/format';

/**
 * Horario elegido en Disponibilidad que se lleva al formulario de reserva.
 * La `idempotencyKey` se genera al abrir el resumen y se reutiliza en cada reintento,
 * así una mala señal no crea dos reservas.
 */
export const bookingDraft = reactive<{
  service: ServiceInfo | null;
  date: string;
  slot: SharedSlot | PrivateSlot | null;
  adults: number;
  children: number;
  idempotencyKey: string;
}>({
  service: null,
  date: '',
  slot: null,
  adults: 1,
  children: 0,
  idempotencyKey: '',
});

export function startDraft(
  service: ServiceInfo,
  date: string,
  slot: SharedSlot | PrivateSlot,
  adults: number,
  children: number,
): void {
  Object.assign(bookingDraft, { service, date, slot, adults, children, idempotencyKey: uuid() });
}

export function clearDraft(): void {
  Object.assign(bookingDraft, { service: null, slot: null, idempotencyKey: '' });
}
