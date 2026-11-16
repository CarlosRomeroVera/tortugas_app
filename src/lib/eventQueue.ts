import { reactive } from 'vue';

import { uuid } from './format';

import { syncApi } from '@/api/endpoints';
import { ApiError, errorMessage } from '@/api/http';
import type { SyncEvent, SyncResult } from '@/api/types';
import { getJSON, setJSON } from '@/lib/storage';

/**
 * Cola de eventos de campo (etapas, abordaje, no presentados y fallas) → POST /sync/events.
 *
 * - Todo se guarda primero en el teléfono; se envía en lotes cuando hay señal.
 * - `client_uuid` se genera al crear el evento y no cambia en los reintentos: lo que ya había
 *   entrado regresa como `duplicate`.
 * - Se borra de la cola lo que regresa `applied`, `ignored`, `duplicate` o `rejected`
 *   (de los rechazados se muestra el mensaje). Con error de red, 5xx, 401 o 403 no se borra nada.
 */
export interface QueuedEvent {
  event: SyncEvent;
  /** Salida a la que pertenece, para la vista optimista y para refrescarla al sincronizar. No se envía. */
  departureId: string;
  /** Usuario que lo registró: solo se envía con su propio token. */
  userId: number;
}

export interface RejectedNotice {
  client_uuid: string;
  departureId: string;
  type: SyncEvent['type'];
  message: string;
}

const KEY = 'tortugas.syncQueue.v1';
const LEGACY_KEY = 'tortugas.pendingEvents'; // cola de la versión con datos de prueba
export const MAX_BATCH = 200;

export const eventQueue = reactive({
  pending: [] as QueuedEvent[],
  /** true cuando ya se leyó la cola guardada en el teléfono. */
  loaded: false,
  syncing: false,
  lastSyncAt: null as string | null,
  /** Último error de envío (sin señal, servidor caído…). Se limpia con el siguiente envío exitoso. */
  lastError: null as string | null,
});

interface SyncHooks {
  userId: () => number | null;
  /** Se llama con las salidas que cambiaron, antes de quitar sus eventos de la cola (para refrescarlas sin parpadeo). */
  onSynced?: (departureIds: string[]) => Promise<void>;
  onRejected?: (notices: RejectedNotice[]) => void;
}

let hooks: SyncHooks = { userId: () => null };

export function configureSync(h: SyncHooks): void {
  hooks = h;
}

/**
 * Lee la cola guardada (Preferences). Llamar una vez al arrancar, antes de montar la app.
 * Si ya se registró algo antes de terminar de leer, se conserva junto con lo guardado.
 */
export async function loadQueue(): Promise<void> {
  if (eventQueue.loaded) return;
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignorar
  }
  const saved = await getJSON<QueuedEvent[]>(KEY);
  const known = new Set(eventQueue.pending.map((p) => p.event.client_uuid));
  const restored = (Array.isArray(saved) ? saved : []).filter((p) => !known.has(p.event?.client_uuid));
  eventQueue.pending = [...restored, ...eventQueue.pending];
  eventQueue.loaded = true;
  if (eventQueue.pending.length) persist();
}

/**
 * Las escrituras van en orden (ver storage.ts); no hace falta esperarlas.
 * Antes de leer lo guardado no se escribe: se sobrescribiría la cola anterior. loadQueue guarda la mezcla.
 */
function persist(): Promise<void> {
  if (!eventQueue.loaded) return Promise.resolve();
  return setJSON(KEY, eventQueue.pending);
}

let lastStamp = 0;
/** Hora ISO estrictamente creciente: el servidor ordena por `occurred_at` y dos eventos seguidos no deben empatar. */
function stamp(): string {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return new Date(lastStamp).toISOString();
}

export type NewEvent = Omit<SyncEvent, 'client_uuid' | 'occurred_at'>;

/** Guarda un evento en el teléfono e intenta enviarlo en unos segundos. */
export function recordEvent(departureId: string, data: NewEvent): QueuedEvent {
  const userId = hooks.userId();
  if (userId === null) throw new Error('No hay sesión para registrar el evento.');
  const item: QueuedEvent = {
    event: { ...data, client_uuid: uuid(), occurred_at: stamp() },
    departureId,
    userId,
  };
  eventQueue.pending.push(item);
  persist();
  scheduleFlush();
  return item;
}

/** Eventos sin enviar del usuario actual, opcionalmente de una salida. */
export function pendingFor(departureId?: string): QueuedEvent[] {
  const uid = hooks.userId();
  return eventQueue.pending.filter((i) => i.userId === uid && (!departureId || i.departureId === departureId));
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Junta los toques seguidos (pase de lista) en un solo lote. */
export function scheduleFlush(delayMs = 1500): void {
  clearTimeout(timer);
  timer = setTimeout(() => void flush(), delayMs);
}

let inflight: Promise<void> | null = null;

/** Envía la cola del usuario actual. Seguro de llamar varias veces: si ya hay un envío, espera ese. */
export function flush(): Promise<void> {
  inflight ??= doFlush().finally(() => (inflight = null));
  return inflight;
}

async function doFlush(): Promise<void> {
  await loadQueue(); // nunca enviar (ni sobrescribir) antes de leer lo guardado
  const mine = pendingFor();
  if (!mine.length) return;

  eventQueue.syncing = true;
  try {
    for (let i = 0; i < mine.length; i += MAX_BATCH) {
      const batch = mine.slice(i, i + MAX_BATCH);
      let results: SyncResult[];
      try {
        results = await syncApi.send(batch.map((b) => b.event));
      } catch (e) {
        if (e instanceof ApiError && e.status === 422) {
          // Lote mal formado: es un error de la app. Se apartan los eventos señalados para no atascar la cola.
          dropMalformed(batch, e);
        }
        eventQueue.lastError = errorMessage(e);
        return; // red, 5xx, 401, 403: no se borra nada; se reintenta después
      }
      await settle(batch, results);
    }
    eventQueue.lastError = null;
    eventQueue.lastSyncAt = new Date().toISOString();
  } finally {
    eventQueue.syncing = false;
  }
}

async function settle(batch: QueuedEvent[], results: SyncResult[]): Promise<void> {
  const byUuid = new Map(batch.map((b) => [b.event.client_uuid, b]));
  const done = new Set<string>();
  const rejected: RejectedNotice[] = [];

  for (const r of results) {
    const item = byUuid.get(r.client_uuid);
    if (!item) continue;
    done.add(r.client_uuid);
    if (r.status === 'rejected') {
      rejected.push({
        client_uuid: r.client_uuid,
        departureId: item.departureId,
        type: item.event.type,
        message: r.message ?? 'El servidor no aceptó un registro.',
      });
    }
  }

  const touched = [...new Set(batch.filter((b) => done.has(b.event.client_uuid)).map((b) => b.departureId))];
  await hooks.onSynced?.(touched).catch(() => undefined);

  eventQueue.pending = eventQueue.pending.filter((p) => !done.has(p.event.client_uuid));
  persist();
  if (rejected.length) hooks.onRejected?.(rejected);
}

function dropMalformed(batch: QueuedEvent[], e: ApiError): void {
  const bad = new Set<string>();
  for (const key of Object.keys(e.errors)) {
    const m = /^events\.(\d+)\./.exec(key);
    if (m && batch[Number(m[1])]) bad.add(batch[Number(m[1])].event.client_uuid);
  }
  if (!bad.size) return;
  const notices = batch
    .filter((b) => bad.has(b.event.client_uuid))
    .map((b) => ({
      client_uuid: b.event.client_uuid,
      departureId: b.departureId,
      type: b.event.type,
      message: 'Un registro tenía datos inválidos y se descartó. Captúralo otra vez.',
    }));
  eventQueue.pending = eventQueue.pending.filter((p) => !bad.has(p.event.client_uuid));
  persist();
  hooks.onRejected?.(notices);
}

/** Envío automático: al recuperar señal, al volver a primer plano y cada minuto mientras haya pendientes. */
export function startAutoSync(onResume?: (cb: () => void) => void): void {
  window.addEventListener('online', () => void flush());
  onResume?.(() => void flush());
  void loadQueue();
  setInterval(() => {
    if (pendingFor().length && navigator.onLine) void flush();
  }, 60_000);
  void flush();
}
