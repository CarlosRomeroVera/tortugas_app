import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { computed, reactive } from 'vue';

import { authApi } from '@/api/endpoints';
import { setAuthToken } from '@/api/http';
import type { Role, User } from '@/api/types';

/**
 * Sesión del usuario. El token vive en Keychain/Keystore (en web, el plugin cae a localStorage).
 * El token no caduca solo: dura hasta cerrar sesión o hasta que la API responda 401.
 */
const KEY = 'tortugas.session';

interface StoredSession {
  token: string;
  user: User;
}

const state = reactive<{ user: User | null; ready: boolean }>({ user: null, ready: false });

export const OFFICE_ROLES: Role[] = ['admin', 'coordinacion', 'ventas'];

export const session = {
  state,
  isLoggedIn: computed(() => state.user !== null),
  hasRole: (...roles: Role[]): boolean => !!state.user?.roles.some((r) => roles.includes(r)),

  /** Recupera la sesión guardada al abrir la app. */
  async restore(): Promise<void> {
    if (state.ready) return;
    try {
      const raw = await SecureStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StoredSession;
        setAuthToken(saved.token);
        state.user = saved.user;
      }
    } catch {
      // Almacenamiento corrupto o no disponible: se pide login otra vez.
    }
    state.ready = true;
  },

  async login(email: string, password: string): Promise<User> {
    const { token, user } = await authApi.login(email, password, await deviceName());
    setAuthToken(token);
    state.user = user;
    await SecureStorage.setItem(KEY, JSON.stringify({ token, user } satisfies StoredSession));
    return user;
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // Sin señal o token ya revocado: la sesión local se borra igual.
    }
    await session.clear();
  },

  /** Borra la sesión local sin llamar a la API (p. ej. tras un 401). */
  async clear(): Promise<void> {
    setAuthToken(null);
    state.user = null;
    await SecureStorage.removeItem(KEY).catch(() => undefined);
  },
};

async function deviceName(): Promise<string> {
  try {
    const info = await Device.getInfo();
    const name = info.name || [info.manufacturer, info.model].filter(Boolean).join(' ');
    return (name || `${Capacitor.getPlatform()} ${info.operatingSystem}`).slice(0, 100);
  } catch {
    return `App ${Capacitor.getPlatform()}`.slice(0, 100);
  }
}
