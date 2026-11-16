import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, test } from 'vitest';

import { getJSON, removePrefix, setJSON } from '@/lib/storage';

beforeEach(async () => {
  await Preferences.clear();
  localStorage.clear();
});

describe('storage (Preferences)', () => {
  test('guarda y lee JSON', async () => {
    await setJSON('tortugas.x', { a: 1 });
    expect(await getJSON('tortugas.x')).toEqual({ a: 1 });
  });

  test('migra una vez lo que había en localStorage y lo borra de ahí', async () => {
    localStorage.setItem('tortugas.syncQueue.v1', JSON.stringify([{ id: 1 }]));
    expect(await getJSON('tortugas.syncQueue.v1')).toEqual([{ id: 1 }]);
    expect(localStorage.getItem('tortugas.syncQueue.v1')).toBeNull();
    expect((await Preferences.get({ key: 'tortugas.syncQueue.v1' })).value).toBe('[{"id":1}]');
  });

  test('las escrituras seguidas quedan en orden', async () => {
    void setJSON('k', 1);
    void setJSON('k', 2);
    await setJSON('k', 3);
    expect(await getJSON('k')).toBe(3);
  });

  test('removePrefix solo borra las claves con ese prefijo', async () => {
    await setJSON('tortugas.crew.list.2026-11-17', []);
    await setJSON('tortugas.crew.departure.a', {});
    await setJSON('tortugas.services', []);
    await removePrefix('tortugas.crew.');
    expect((await Preferences.keys()).keys).toEqual(['tortugas.services']);
  });
});
