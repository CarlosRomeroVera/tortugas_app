import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { computed, reactive } from 'vue';

import { authApi, meApi } from '@/api/endpoints';
import { setAuthToken } from '@/api/http';
import type { Role, Staff, User } from '@/api/types';

/**
 * Sesión del usuario. El token vive en Keychain/Keystore (en web, el plugin cae a localStorage).
 * El token no caduca solo: dura hasta cerrar sesión o hasta que la API responda 401.
 */
const KEY = 'tortugas.session';

interface StoredSession {
  token: string;
  user: User;
  staff?: Staff | null;
}

const state = reactive<{ user: User | null; staff: Staff | null; ready: boolean }>({
  user: null,
  staff: null,
  ready: false,
});
let token: string | null = null;

async function save(): Promise<void> {
  if (!token || !state.user) return;
  const data: StoredSession = { token, user: state.user, staff: state.staff };
  await SecureStorage.setItem(KEY, JSON.stringify(data)).catch(() => undefined);
}

export const OFFICE_ROLES: Role[] = ['admin', 'coordinacion', 'ventas'];
export const CREW_ROLES: Role[] = ['capitan', 'chofer'];

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
        token = saved.token;
        setAuthToken(saved.token);
        state.user = saved.user;
        state.staff = saved.staff ?? null;
        // Revalida el token y los roles sin bloquear la apertura (puede no haber señal).
        void session.refresh();
      }
    } catch {
      // Almacenamiento corrupto o no disponible: se pide login otra vez.
    }
    state.ready = true;
  },

  async login(email: string, password: string): Promise<User> {
    const res = await authApi.login(email, password, await deviceName());
    token = res.token;
    setAuthToken(res.token);
    state.user = res.user;
    state.staff = null;
    await save();
    void session.refresh();
    return res.user;
  },

  /** GET /me: roles y ficha de personal actualizados. Un 401 lo maneja el interceptor (logout). */
  async refresh(): Promise<void> {
    try {
      const me = await meApi.get();
      if (!state.user) return;
      state.user = { id: me.id, name: me.name, roles: me.roles };
      state.staff = me.staff;
      await save();
    } catch {
      // Sin señal: se queda la sesión guardada.
    }
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
    token = null;
    setAuthToken(null);
    state.user = null;
    state.staff = null;
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
