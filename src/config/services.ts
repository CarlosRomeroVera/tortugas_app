/**
 * Catálogo fijo de servicios.
 * TODO: reemplazar por el endpoint de catálogo cuando exista en el backend (docs/API.md, sección 7).
 */
export interface ServiceOption {
  slug: string;
  name: string;
  shared: boolean;
}

export const SERVICES: ServiceOption[] = [
  { slug: 'snorkel-3-arrecifes', name: 'Snorkel 3 arrecifes', shared: true },
  { slug: 'parasailing', name: 'Parasailing', shared: true },
  { slug: 'jeep-tour', name: 'Jeep tour', shared: true },
  { slug: 'embarcacion-privada', name: 'Embarcación privada', shared: false },
];
