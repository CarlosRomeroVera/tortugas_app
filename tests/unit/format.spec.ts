import { describe, expect, test } from 'vitest';

import { localTime, localToUtcIso, money, parseCents, todayLocal, uuid } from '@/lib/format';

describe('format', () => {
  test('money formatea centavos en pesos', () => {
    expect(money(138000)).toBe('$1,380.00');
  });

  test('parseCents convierte texto a centavos enteros', () => {
    expect(parseCents('1,380.50')).toBe(138050);
    expect(parseCents('0.1')).toBe(10);
    expect(parseCents('abc')).toBeNull();
    expect(parseCents('0')).toBeNull();
  });

  test('las horas se muestran en America/Cancun, no en la zona del teléfono', () => {
    expect(localTime('2026-11-16T13:30:00+00:00')).toBe('08:30');
  });

  test('todayLocal usa la fecha de Cozumel', () => {
    // 03:00 UTC del 16 = 22:00 del 15 en Cozumel.
    expect(todayLocal(new Date('2026-11-16T03:00:00Z'))).toBe('2026-11-15');
  });

  test('localToUtcIso aplica UTC−5 fijo', () => {
    expect(localToUtcIso('2026-11-16', '17:30')).toBe('2026-11-16T22:30:00.000Z');
  });

  test('uuid genera v4', () => {
    expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
