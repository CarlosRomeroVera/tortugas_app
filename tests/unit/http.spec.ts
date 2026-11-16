import { afterEach, describe, expect, test, vi } from 'vitest';

import { api, ApiError, setAuthToken, setUnauthorizedHandler } from '@/api/http';

const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(body === null ? null : JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthToken(null);
});

describe('api()', () => {
  test('envía Accept y Authorization', async () => {
    const fetchMock = reply(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);
    setAuthToken('tok');
    await api('/availability', { query: { service: 'parasailing', pax: 2 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/availability?service=parasailing&pax=2');
    expect(init.headers).toMatchObject({ Accept: 'application/json', Authorization: 'Bearer tok' });
  });

  test('un 401 con sesión dispara el cierre de sesión', async () => {
    vi.stubGlobal('fetch', reply(401, { message: 'Unauthenticated.' }));
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    setAuthToken('tok');
    await expect(api('/bookings/R-1')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalled();
  });

  test('un 422 expone los errores por campo', async () => {
    vi.stubGlobal(
      'fetch',
      reply(422, {
        message: 'Correo o contraseña incorrectos.',
        errors: { email: ['Correo o contraseña incorrectos.'] },
      }),
    );
    const err = (await api('/auth/token', { method: 'POST', body: {} }).catch((e) => e)) as ApiError;
    expect(err.status).toBe(422);
    expect(err.field('email')).toBe('Correo o contraseña incorrectos.');
  });

  test('un 500 nunca muestra el detalle del servidor', async () => {
    vi.stubGlobal('fetch', reply(500, { message: 'SQLSTATE[42S02] stack trace…' }));
    const err = (await api('/x').catch((e) => e)) as ApiError;
    expect(err.message).toBe('Error del servidor. Inténtalo más tarde.');
  });
});
