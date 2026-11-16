import { reactive } from 'vue';

import { recordEvent } from '@/lib/eventQueue';

/**
 * DATOS DE PRUEBA para capitán y chofer.
 * El backend todavía no tiene /me/departures, manifiesto, abordaje, etapas ni /me/runs (docs/API.md, sección 7).
 * Cuando existan, sustituir este módulo por llamadas reales manteniendo la misma forma de datos.
 */

export type BoardingStatus = 'pending' | 'boarded' | 'no_show';

export interface ManifestEntry {
  code: string;
  name: string;
  pax: number;
  origin: string;
  pickup: string | null;
  cruise_ship: string | null;
  all_aboard_local: string | null;
  notes: string | null;
  boarding: BoardingStatus;
}

export interface Stage {
  name: string;
  at: string | null; // hora local en que se marcó
  asksEngineHours?: boolean;
}

export interface Departure {
  id: string;
  service: string;
  asset: string;
  local_start: string;
  local_end: string;
  dock: string;
  crew: string[];
  stages: Stage[];
  current: number; // índice de la etapa actual; -1 = no iniciada
  manifest: ManifestEntry[];
  engine_hours: number | null;
}

export type PickupStatus = 'pending' | 'picked_up' | 'no_show';

export interface PickupStop {
  id: string;
  local_time: string;
  place: string;
  detail: string;
  booking_code: string;
  customer: string;
  pax: number;
  tour: string;
  status: PickupStatus;
}

export interface VehicleRun {
  id: string;
  vehicle: string;
  local_start: string;
  destination: string;
  stops: PickupStop[];
  delivered_at: string | null;
}

const snorkelStages = (): Stage[] => [
  { name: 'Check-in en muelle', at: null },
  { name: 'Pasajeros a bordo', at: null },
  { name: 'Zarpe', at: null },
  { name: 'Arrecife Palancar', at: null },
  { name: 'Arrecife Colombia', at: null },
  { name: 'Regreso a muelle', at: null },
  { name: 'Desembarque y cierre', at: null, asksEngineHours: true },
];

const privateStages = (): Stage[] => [
  { name: 'Check-in en muelle', at: null },
  { name: 'Pasajeros a bordo', at: null },
  { name: 'Zarpe', at: null },
  { name: 'El Cielo', at: null },
  { name: 'Regreso a muelle', at: null },
  { name: 'Desembarque y cierre', at: null, asksEngineHours: true },
];

const p = (
  code: string,
  name: string,
  pax: number,
  origin: string,
  pickup: string | null,
  extra: Partial<ManifestEntry> = {},
): ManifestEntry => ({
  code,
  name,
  pax,
  origin,
  pickup,
  cruise_ship: null,
  all_aboard_local: null,
  notes: null,
  boarding: 'pending',
  ...extra,
});

export const crewDemo = reactive<{ departures: Departure[]; runs: VehicleRun[] }>({
  departures: [
    {
      id: 'demo-dep-1',
      service: 'Snorkel 3 arrecifes',
      asset: 'Carey I',
      local_start: '11:30',
      local_end: '14:00',
      dock: 'Muelle Tortugas',
      crew: ['Rubén Canul (capitán)', 'Karla Ek (guía)'],
      stages: snorkelStages(),
      current: -1,
      engine_hours: null,
      manifest: [
        p('R-8812', 'Emily Carter', 4, 'Puerta Maya', 'Van 1 · 10:50', {
          cruise_ship: 'Icon of the Seas',
          all_aboard_local: '17:30',
        }),
        p('R-8815', 'Familia Gómez', 5, 'Presidente InterContinental', 'Van 2 · 10:45', {
          notes: 'Un niño de 6 años, necesita chaleco chico.',
        }),
        p('R-8820', 'Grupo Cozumel Travel', 8, 'Muelle Tortugas', null, { notes: 'Voucher CT-5521' }),
        p('R-8823', 'Daniel Ruiz', 3, 'Muelle de ferry', 'Van 1 · 11:05'),
      ],
    },
    {
      id: 'demo-dep-2',
      service: 'Privado Fam. Harris',
      asset: 'El Cielo',
      local_start: '15:30',
      local_end: '18:30',
      dock: 'Muelle Tortugas',
      crew: ['Rubén Canul (capitán)'],
      stages: privateStages(),
      current: -1,
      engine_hours: null,
      manifest: [
        p('R-8844', 'Familia Harris', 6, 'Puerta Maya', 'Van 2 · 15:00', {
          cruise_ship: 'Icon of the Seas',
          all_aboard_local: '19:30',
        }),
      ],
    },
  ],
  runs: [
    {
      id: 'demo-run-1',
      vehicle: 'Van 1 · Hiace YXW-21-44',
      local_start: '10:40',
      destination: 'Muelle Tortugas',
      delivered_at: null,
      stops: [
        {
          id: 'demo-stop-1',
          local_time: '10:50',
          place: 'Puerta Maya',
          detail: 'Crucero Icon · salida peatonal',
          booking_code: 'R-8812',
          customer: 'Emily Carter',
          pax: 4,
          tour: 'Snorkel 11:30',
          status: 'pending',
        },
        {
          id: 'demo-stop-2',
          local_time: '11:05',
          place: 'Muelle de ferry',
          detail: 'Frente a la taquilla',
          booking_code: 'R-8823',
          customer: 'Daniel Ruiz',
          pax: 3,
          tour: 'Snorkel 11:30',
          status: 'pending',
        },
      ],
    },
    {
      id: 'demo-run-2',
      vehicle: 'Van 1 · Hiace YXW-21-44',
      local_start: '12:30',
      destination: 'Muelle Tortugas',
      delivered_at: null,
      stops: [
        {
          id: 'demo-stop-3',
          local_time: '12:45',
          place: 'Hotel Presidente',
          detail: 'Lobby principal',
          booking_code: 'R-8840',
          customer: 'Mariana López',
          pax: 3,
          tour: 'Snorkel 13:30',
          status: 'pending',
        },
      ],
    },
  ],
});

const nowLocal = () =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Cancun',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());

export function findDeparture(id: string): Departure | undefined {
  return crewDemo.departures.find((d) => d.id === id);
}

export function advanceStage(dep: Departure, engineHours?: number): void {
  if (dep.current >= dep.stages.length - 1) return;
  dep.current += 1;
  const stage = dep.stages[dep.current];
  stage.at = nowLocal();
  if (engineHours !== undefined) {
    dep.engine_hours = engineHours;
    recordEvent('engine_hours', dep.id, { hours: engineHours });
  }
  recordEvent('stage', dep.id, { stage: stage.name, index: dep.current });
}

export function setBoarding(dep: Departure, entry: ManifestEntry, status: BoardingStatus): void {
  entry.boarding = status;
  recordEvent('boarding', dep.id, { booking_code: entry.code, status });
}

export function reportIncident(refId: string, text: string): void {
  recordEvent('incident', refId, { text });
}

export function setPickupStatus(stop: PickupStop, status: PickupStatus): void {
  stop.status = status;
  recordEvent('pickup', stop.id, { booking_code: stop.booking_code, status });
}

export function markDelivered(run: VehicleRun): void {
  run.delivered_at = nowLocal();
  recordEvent('pickup', run.id, { status: 'delivered' });
}
