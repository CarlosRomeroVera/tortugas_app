import { Preferences } from '@capacitor/preferences';

/**
 * Almacenamiento persistente de la app (@capacitor/preferences, antes "Capacitor Storage").
 * En iOS usa UserDefaults y en Android SharedPreferences: el sistema no lo borra como puede
 * hacer con el localStorage del WebView. En web cae a localStorage.
 *
 * Es para datos chicos (cola de eventos, cachés). No guardes aquí el token: ese va en SecureStorage.
 */

/** Escrituras en orden: dos `set` seguidos de la misma clave nunca se invierten. */
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(op: () => Promise<T>): Promise<T> {
  const next = chain.then(op, op);
  chain = next.catch(() => undefined);
  return next;
}

export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const { value } = await Preferences.get({ key });
    if (value !== null) return JSON.parse(value) as T;
    return await migrateFromLocalStorage<T>(key);
  } catch {
    return null;
  }
}

export function setJSON(key: string, data: unknown): Promise<void> {
  return enqueue(() => Preferences.set({ key, value: JSON.stringify(data) })).catch(() => undefined);
}

export function remove(key: string): Promise<void> {
  return enqueue(() => Preferences.remove({ key })).catch(() => undefined);
}

/** Borra todas las claves que empiezan con `prefix`. */
export function removePrefix(prefix: string): Promise<void> {
  return enqueue(async () => {
    const { keys } = await Preferences.keys();
    await Promise.all(keys.filter((k) => k.startsWith(prefix)).map((key) => Preferences.remove({ key })));
  }).catch(() => undefined);
}

/** Versiones anteriores guardaban en localStorage: se copia una vez y se borra de ahí. */
async function migrateFromLocalStorage<T>(key: string): Promise<T | null> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const data = JSON.parse(raw) as T;
    await setJSON(key, data);
    localStorage.removeItem(key);
    return data;
  } catch {
    return null;
  }
}
