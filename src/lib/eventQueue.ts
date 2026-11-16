import { reactive } from 'vue';

import { uuid } from './format';

/**
 * Cola de eventos de campo (etapas, abordaje, recogidas, incidentes, horómetro).
 * Cada evento lleva `client_uuid` y `occurred_at` para que el servidor lo inserte una sola vez
 * y lo ordene por la hora en que ocurrió, no por la hora en que llegó.
 *
 * TODO: enviar el lote a POST /sync/events cuando exista en el backend. Hasta entonces se quedan en el teléfono.
 */
export interface FieldEvent {
  client_uuid: string;
  type: 'stage' | 'boarding' | 'pickup' | 'incident' | 'engine_hours';
  ref_id: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}

const KEY = 'tortugas.pendingEvents';

function load(): FieldEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export const eventQueue = reactive({ pending: load() });

export function recordEvent(
  type: FieldEvent['type'],
  ref_id: string,
  payload: Record<string, unknown> = {},
): FieldEvent {
  const ev: FieldEvent = { client_uuid: uuid(), type, ref_id, payload, occurred_at: new Date().toISOString() };
  eventQueue.pending.push(ev);
  try {
    localStorage.setItem(KEY, JSON.stringify(eventQueue.pending));
  } catch {
    // Almacenamiento lleno o bloqueado: el evento queda solo en memoria.
  }
  return ev;
}
