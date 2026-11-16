import { reactive } from 'vue';

import { servicesApi } from '@/api/endpoints';
import { getJSON, setJSON } from '@/lib/storage';

/**
 * Catálogo de servicios activos (GET /services), guardado en el teléfono.
 * La lista fija solo se usa si nunca se ha podido descargar (primer arranque sin señal).
 */
export interface ServiceOption {
  slug: string;
  name: string;
  shared: boolean;
}

const FALLBACK: ServiceOption[] = [
  { slug: 'snorkel-3-arrecifes', name: 'Snorkel 3 arrecifes', shared: true },
  { slug: 'parasailing', name: 'Parasailing', shared: true },
  { slug: 'jeep-tour', name: 'Jeep tour', shared: true },
  { slug: 'embarcacion-privada', name: 'Embarcación privada', shared: false },
];

const KEY = 'tortugas.services';

export const catalog = reactive({ services: FALLBACK });

/** Primero lo guardado en el teléfono, luego la API. Sin señal, se queda lo guardado (o la lista fija). */
export async function refreshCatalog(): Promise<void> {
  const saved = await getJSON<ServiceOption[]>(KEY);
  if (Array.isArray(saved) && saved.length) catalog.services = saved;
  try {
    const list = await servicesApi.list();
    if (!list.length) return;
    catalog.services = list.map(({ slug, name, shared }) => ({ slug, name, shared }));
    await setJSON(KEY, catalog.services);
  } catch {
    // ignorar
  }
}
