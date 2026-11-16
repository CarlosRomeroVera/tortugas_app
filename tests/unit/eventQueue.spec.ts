import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { setAuthToken } from '@/api/http';
import type { CrewDepartureDetail } from '@/api/types';
import { configureSync, eventQueue, flush, loadQueue, MAX_BATCH, pendingFor, recordEvent } from '@/lib/eventQueue';
import { getJSON, setJSON } from '@/lib/storage';
import { applyPending, setBoarding } from '@/stores/crew';

const DEP = '00000000-0000-4000-8000-000000000001';
const BK = '00000000-0000-4000-8000-0000000000b1';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** Responde a /sync/events con el status que diga `decide` para cada evento. */
function syncServer(decide: (e: { type: string }) => object = () => ({ status: 'applied' })) {
  return vi.fn(async (_url: URL, init: RequestInit) => {
    const { events } = JSON.parse(String(init.body));
    return json(200, {
      results: events.map((e: { client_uuid: string; type: string }) => ({ client_uuid: e.client_uuid, ...decide(e) })),
    });
  });
}

const onSynced = vi.fn(async () => undefined);
const onRejected = vi.fn();

beforeEach(() => {
  eventQueue.pending = [];
  eventQueue.lastError = null;
  configureSync({ userId: () => 4, onSynced, onRejected });
  setAuthToken('tok');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('cola de eventos', () => {
  test('borra applied, ignored, duplicate y rejected; avisa los rechazados', async () => {
    const statuses = ['applied', 'ignored', 'duplicate', 'rejected'];
    let i = 0;
    vi.stubGlobal(
      'fetch',
      syncServer(() => {
        const status = statuses[i++];
        return status === 'rejected'
          ? { status, reason: 'reading_required', message: 'Captura el horómetro.' }
          : { status };
      }),
    );
    for (let n = 0; n < 4; n++) recordEvent(DEP, { type: 'check_in', booking_id: BK });

    await flush();

    expect(eventQueue.pending).toHaveLength(0);
    expect(onSynced).toHaveBeenCalledWith([DEP]);
    expect(onRejected).toHaveBeenCalledWith([expect.objectContaining({ message: 'Captura el horómetro.' })]);
  });

  test('sin red o con 5xx no borra nada y reenvía los mismos client_uuid', async () => {
    recordEvent(DEP, { type: 'no_show', booking_id: BK });
    const uuid = eventQueue.pending[0].event.client_uuid;

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await flush();
    expect(eventQueue.pending).toHaveLength(1);
    expect(eventQueue.lastError).toMatch(/Sin conexión/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(503, {})));
    await flush();
    expect(eventQueue.pending).toHaveLength(1);

    const server = syncServer(() => ({ status: 'duplicate' }));
    vi.stubGlobal('fetch', server);
    await flush();
    expect(JSON.parse(String(server.mock.calls[0][1].body)).events[0].client_uuid).toBe(uuid);
    expect(eventQueue.pending).toHaveLength(0);
  });

  test('un 422 aparta solo los eventos señalados', async () => {
    recordEvent(DEP, { type: 'check_in', booking_id: BK });
    recordEvent(DEP, { type: 'check_in', booking_id: 'no-es-uuid' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(422, { message: 'x', errors: { 'events.1.booking_id': ['inválido'] } })),
    );
    await flush();
    expect(eventQueue.pending.map((p) => p.event.booking_id)).toEqual([BK]);
    expect(onRejected).toHaveBeenCalledTimes(1);
  });

  test(`manda lotes de máximo ${MAX_BATCH}`, async () => {
    const server = syncServer();
    vi.stubGlobal('fetch', server);
    for (let n = 0; n < MAX_BATCH + 5; n++) recordEvent(DEP, { type: 'check_in', booking_id: BK });
    await flush();
    expect(server).toHaveBeenCalledTimes(2);
    expect(eventQueue.pending).toHaveLength(0);
  });

  test('solo envía los eventos del usuario actual', async () => {
    recordEvent(DEP, { type: 'check_in', booking_id: BK });
    configureSync({ userId: () => 9, onSynced, onRejected });
    const server = syncServer();
    vi.stubGlobal('fetch', server);
    await flush();
    expect(server).not.toHaveBeenCalled();
    expect(pendingFor()).toHaveLength(0);
    expect(eventQueue.pending).toHaveLength(1);
  });

  test('occurred_at es estrictamente creciente', () => {
    for (let n = 0; n < 3; n++) recordEvent(DEP, { type: 'check_in', booking_id: BK });
    const t = eventQueue.pending.map((p) => p.event.occurred_at);
    expect([...t].sort()).toEqual(t);
    expect(new Set(t).size).toBe(3);
  });
});

describe('persistencia de la cola', () => {
  test('un evento registrado antes de leer la cola no borra lo guardado', async () => {
    eventQueue.loaded = false;
    const saved = {
      event: { client_uuid: 'viejo', type: 'no_show', occurred_at: 'x', booking_id: BK },
      departureId: DEP,
      userId: 4,
    };
    await setJSON('tortugas.syncQueue.v1', [saved]);

    recordEvent(DEP, { type: 'check_in', booking_id: BK });
    await loadQueue();

    expect(eventQueue.pending.map((p) => p.event.type)).toEqual(['no_show', 'check_in']);
    const stored = await getJSON<{ event: { type: string } }[]>('tortugas.syncQueue.v1');
    expect(stored?.map((p) => p.event.type)).toEqual(['no_show', 'check_in']);
  });
});

describe('vista optimista', () => {
  const detail = (): CrewDepartureDetail =>
    ({
      id: DEP,
      status: 'scheduled',
      asset: { id: 'a', kind: 'boat', reading: { unit: 'hours', current: 10 } },
      stages: [1, 2, 3].map((position) => ({
        id: `s${position}`,
        position,
        name: `Etapa ${position}`,
        requires_reading: position === 3,
        reached_at: null,
        done: false,
      })),
      manifest: [{ id: BK, status: 'confirmed', pax: 3, checked_in_at: null }],
    }) as unknown as CrewDepartureDetail;

  test('una etapa saltada marca como hechas las anteriores y pone la salida en curso', () => {
    recordEvent(DEP, { type: 'stage', departure_id: DEP, stage_id: 's2' });
    const v = applyPending(detail(), pendingFor(DEP));
    expect(v.stages.map((s) => s.done)).toEqual([true, true, false]);
    expect(v.stages[0].reached_at).toBeNull();
    expect(v.status).toBe('in_progress');
    expect(v.current_stage?.id).toBe('s2');
  });

  test('a bordo → no vino genera check_in_undo + no_show', () => {
    const d = detail();
    d.manifest[0].checked_in_at = '2026-11-17T13:00:00Z';
    const before = applyPending(d, []);
    setBoarding(before, before.manifest[0], 'no_show');
    expect(pendingFor(DEP).map((p) => p.event.type)).toEqual(['check_in_undo', 'no_show']);
    const after = applyPending(d, pendingFor(DEP));
    expect(after.manifest[0].boarding).toBe('no_show');
    expect(after.pax).toEqual({ booked: 0, checked_in: 0, no_show: 3 });
  });

  test('no vino → falta usa check_in + check_in_undo', () => {
    const d = detail();
    d.manifest[0].status = 'no_show';
    const before = applyPending(d, []);
    setBoarding(before, before.manifest[0], 'pending');
    expect(pendingFor(DEP).map((p) => p.event.type)).toEqual(['check_in', 'check_in_undo']);
    expect(applyPending(d, pendingFor(DEP)).manifest[0].boarding).toBe('pending');
  });
});
