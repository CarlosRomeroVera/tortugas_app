import { reactive } from 'vue';

import { crewApi } from '@/api/endpoints';
import { ApiError } from '@/api/http';
import type {
  CrewDeparture,
  CrewDepartureDetail,
  DepartureStage,
  FaultSeverity,
  ManifestBooking,
  SyncEvent,
} from '@/api/types';
import { pendingFor, recordEvent, type QueuedEvent } from '@/lib/eventQueue';
import { getJSON, removePrefix, setJSON } from '@/lib/storage';

/**
 * Salidas del capitán o chofer (GET /me/departures) con caché local para abrir el manifiesto sin señal.
 * Lo que se registra va a la cola de eventos; las vistas muestran el estado del servidor
 * con los eventos pendientes ya aplicados (interfaz optimista).
 */

interface Cached<T> {
  data: T;
  fetchedAt: string;
}

const PREFIX = 'tortugas.crew.';
const LIST_KEY = (date: string) => `${PREFIX}list.${date}`;
const DETAIL_KEY = (id: string) => `${PREFIX}departure.${id}`;

/** Guarda en Preferences sin esperar (las escrituras van en orden) y regresa la entrada para la memoria. */
function write<T>(key: string, data: T): Cached<T> {
  const entry = { data, fetchedAt: new Date().toISOString() };
  void setJSON(key, entry);
  return entry;
}

export const crew = reactive({
  lists: {} as Record<string, Cached<CrewDeparture[]>>,
  details: {} as Record<string, Cached<CrewDepartureDetail>>,
});

export interface LoadResult {
  /** Mensaje si no se pudo actualizar (se muestran los datos guardados, si hay). */
  error: string | null;
  /** true si el error es definitivo (403/404) y no vale la pena mostrar la caché. */
  fatal: boolean;
}

function failure(e: unknown): LoadResult {
  const fatal = e instanceof ApiError && (e.status === 403 || e.status === 404);
  return { error: e instanceof Error ? e.message : String(e), fatal };
}

/** Sube a memoria la lista guardada en el teléfono (llamar al abrir la pantalla, no dentro de un computed). */
export async function cachedList(date: string): Promise<Cached<CrewDeparture[]> | null> {
  if (!crew.lists[date]) {
    const c = await getJSON<Cached<CrewDeparture[]>>(LIST_KEY(date));
    // Si mientras tanto llegó la respuesta del servidor, gana esa.
    if (c && !crew.lists[date]) crew.lists[date] = c;
  }
  return crew.lists[date] ?? null;
}

/** Igual que cachedList, para el detalle de una salida. */
export async function cachedDetail(id: string): Promise<Cached<CrewDepartureDetail> | null> {
  if (!crew.details[id]) {
    const c = await getJSON<Cached<CrewDepartureDetail>>(DETAIL_KEY(id));
    if (c && !crew.details[id]) crew.details[id] = c;
  }
  return crew.details[id] ?? null;
}

export async function loadList(date: string): Promise<LoadResult> {
  try {
    crew.lists[date] = write(LIST_KEY(date), await crewApi.departures(date));
    return { error: null, fatal: false };
  } catch (e) {
    await cachedList(date);
    return failure(e);
  }
}

export async function loadDetail(id: string): Promise<LoadResult> {
  try {
    const detail = await crewApi.departure(id);
    crew.details[id] = write(DETAIL_KEY(id), detail);
    patchListItem(detail);
    return { error: null, fatal: false };
  } catch (e) {
    await cachedDetail(id);
    return failure(e);
  }
}

/** Mantiene la tarjeta de la lista al día con el detalle recién descargado. */
function patchListItem(detail: CrewDepartureDetail): void {
  const list = crew.lists[detail.local_date];
  if (!list) return;
  const i = list.data.findIndex((d) => d.id === detail.id);
  if (i < 0) return;
  const { stages: _s, manifest: _m, ...item } = detail;
  list.data[i] = item;
  void setJSON(LIST_KEY(detail.local_date), list);
}

/** Se usa desde la cola: refresca las salidas cuyos eventos se acaban de aplicar. */
export async function refreshDepartures(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => loadDetail(id)));
  // Las listas abiertas también cambian (estado, etapa actual, pax).
  await Promise.all(Object.keys(crew.lists).map((date) => loadList(date)));
}

/** Borra la caché local (al cerrar sesión). */
export async function clearCrewCache(): Promise<void> {
  crew.lists = {};
  crew.details = {};
  await removePrefix(PREFIX);
}

// ─── Vista optimista ─────────────────────────────────────────────────

export type BoardingState = 'pending' | 'boarded' | 'no_show';

export interface StageView extends DepartureStage {
  /** Marcada en el teléfono, todavía sin confirmar por el servidor. */
  unsynced: boolean;
}

export interface ManifestView extends ManifestBooking {
  boarding: BoardingState;
  unsynced: boolean;
}

export interface DepartureView extends Omit<CrewDepartureDetail, 'stages' | 'manifest'> {
  stages: StageView[];
  manifest: ManifestView[];
  /** Posición de la última etapa hecha (0 = sin iniciar). */
  currentPosition: number;
  unsyncedCount: number;
}

export function boardingOf(b: Pick<ManifestBooking, 'status' | 'checked_in_at'>): BoardingState {
  if (b.checked_in_at) return 'boarded';
  if (b.status === 'no_show') return 'no_show';
  return 'pending';
}

const byTime = (a: QueuedEvent, b: QueuedEvent) => a.event.occurred_at.localeCompare(b.event.occurred_at);

/** Estado del servidor + eventos pendientes aplicados con las mismas reglas que el backend. */
export function applyPending(detail: CrewDepartureDetail, pending: QueuedEvent[]): DepartureView {
  const events = [...pending].sort(byTime).map((p) => p.event);

  let current = detail.stages.filter((s) => s.done).reduce((n, s) => Math.max(n, s.position), 0);
  const reachedLocally = new Map<string, string>();
  for (const e of events) {
    if (e.type !== 'stage') continue;
    const st = detail.stages.find((s) => s.id === e.stage_id);
    if (st && st.position > current) {
      current = st.position;
      reachedLocally.set(st.id, e.occurred_at);
    }
  }

  const stages: StageView[] = detail.stages.map((s) => {
    const local = reachedLocally.get(s.id);
    const done = s.position <= current;
    return { ...s, done, reached_at: local ?? s.reached_at, unsynced: done && !s.done };
  });

  const manifest: ManifestView[] = detail.manifest.map((b) => {
    const mine = events.filter((e) => e.booking_id === b.id);
    let { status, checked_in_at } = b;
    for (const e of mine) {
      if (e.type === 'check_in') {
        checked_in_at ??= e.occurred_at;
        if (status === 'no_show') status = 'confirmed';
      } else if (e.type === 'check_in_undo') {
        checked_in_at = null;
      } else if (e.type === 'no_show' && !checked_in_at) {
        status = 'no_show';
      }
    }
    const view = { ...b, status, checked_in_at };
    return { ...view, boarding: boardingOf(view), unsynced: mine.length > 0 };
  });

  const sum = (f: (m: ManifestView) => boolean) => manifest.filter(f).reduce((n, m) => n + m.pax, 0);
  const last = [...stages].reverse().find((s) => s.done);
  const completed = detail.status === 'completed' || (stages.length > 0 && current >= stages.at(-1)!.position);

  return {
    ...detail,
    stages,
    manifest,
    currentPosition: current,
    current_stage: last ? { id: last.id, position: last.position, name: last.name } : null,
    status:
      detail.status === 'cancelled'
        ? 'cancelled'
        : completed
          ? 'completed'
          : current > 0
            ? 'in_progress'
            : detail.status,
    pax: {
      booked: sum((m) => m.boarding !== 'no_show'),
      checked_in: sum((m) => m.boarding === 'boarded'),
      no_show: sum((m) => m.boarding === 'no_show'),
    },
    unsyncedCount: pending.length,
  };
}

export function departureView(id: string): DepartureView | null {
  const cached = crew.details[id];
  return cached ? applyPending(cached.data, pendingFor(id)) : null;
}

/** Tarjeta de la lista con las etapas marcadas sin señal ya aplicadas (si el detalle está en caché). */
export function listItemView(d: CrewDeparture): CrewDeparture & { unsyncedCount: number } {
  const detail = crew.details[d.id]?.data;
  const pending = pendingFor(d.id);
  if (!detail || !pending.length) return { ...d, unsyncedCount: pending.length };
  const v = applyPending(detail, pending);
  return { ...d, status: v.status, current_stage: v.current_stage, pax: v.pax, unsyncedCount: pending.length };
}

// ─── Acciones (todas pasan por la cola) ──────────────────────────────

export function markStage(dep: DepartureView, stage: StageView, reading?: number): void {
  const e: Omit<SyncEvent, 'client_uuid' | 'occurred_at'> = {
    type: 'stage',
    departure_id: dep.id,
    stage_id: stage.id,
  };
  if (reading !== undefined) e.reading = reading;
  recordEvent(dep.id, e);
}

/**
 * Cambia el estado de abordaje con los eventos que pide el backend:
 * - a bordo → falta: `check_in_undo`
 * - a bordo → no vino: `check_in_undo` + `no_show`
 * - no vino → falta: `check_in` + `check_in_undo` (el check-in lo regresa a confirmada/pendiente)
 */
export function setBoarding(dep: DepartureView, b: ManifestView, to: BoardingState): void {
  const from = b.boarding;
  if (from === to) return;
  const ev = (type: 'check_in' | 'check_in_undo' | 'no_show') => recordEvent(dep.id, { type, booking_id: b.id });

  if (to === 'boarded') ev('check_in');
  else if (to === 'no_show') {
    if (from === 'boarded') ev('check_in_undo');
    ev('no_show');
  } else {
    if (from === 'no_show') ev('check_in');
    ev('check_in_undo');
  }
}

export function reportFault(dep: DepartureView, severity: FaultSeverity, description: string): void {
  recordEvent(dep.id, {
    type: 'fault',
    asset_id: dep.asset.id,
    departure_id: dep.id,
    severity,
    description: description.slice(0, 2000),
  });
}
