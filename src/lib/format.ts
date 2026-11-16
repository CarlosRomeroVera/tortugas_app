import { OPS_TIMEZONE } from '@/config/env';

/** Centavos enteros → "$1,380.00". */
export function money(cents: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100);
}

/** "1,380.50" o "1380.5" → 138050. Devuelve null si no es un monto válido. */
export function parseCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const n = Number(String(input).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** Fecha de hoy (YYYY-MM-DD) en hora de Cozumel. */
export function todayLocal(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: OPS_TIMEZONE }).format(now);
}

/** Hora "HH:mm" de un instante UTC, en hora de Cozumel. */
export function localTime(iso: string | Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: OPS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/** "dom 15 nov" de una fecha local YYYY-MM-DD. */
export function longDate(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * Fecha y hora locales de Cozumel → ISO UTC.
 * Cancún está en UTC−5 todo el año (sin horario de verano), así que el desfase es fijo.
 */
export function localToUtcIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00-05:00`).toISOString();
}

/** UUID v4. `crypto.randomUUID` no existe fuera de contextos seguros (p. ej. http://192.168.x.x). */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
