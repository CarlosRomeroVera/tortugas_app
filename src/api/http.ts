import { env } from '@/config/env';

/** Error de la API con el mensaje listo para mostrarse (409 y 422 vienen redactados para el usuario). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Primer mensaje de un campo, para pintarlo junto al input. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(value: string | null): void {
  token = value;
}

/** Se llama cuando la API responde 401: la sesión ya no vale. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

const FALLBACK: Record<number, string> = {
  0: 'Sin conexión con el servidor. Revisa tu señal e inténtalo de nuevo.',
  401: 'Tu sesión terminó. Inicia sesión de nuevo.',
  403: 'Tu usuario no tiene permiso para esta acción.',
  404: 'No se encontró lo que buscas.',
  429: 'Demasiados intentos. Espera un minuto.',
  500: 'Error del servidor. Inténtalo más tarde.',
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(env.apiUrl + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, FALLBACK[0]);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    // Nunca mostrar trazas de 500 (APP_DEBUG) en la interfaz.
    const message =
      res.status >= 500
        ? FALLBACK[500]
        : (data?.message as string | undefined) || FALLBACK[res.status] || FALLBACK[500];
    throw new ApiError(res.status, message, data?.errors ?? {});
  }

  return data as T;
}

/** Mensaje amigable para cualquier error capturado. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return FALLBACK[500];
}
