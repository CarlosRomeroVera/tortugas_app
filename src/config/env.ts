/**
 * Configuración por entorno. Los valores vienen de variables VITE_* (ver .env.example).
 */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/+$/, ''),
  /** Muestra las pantallas de capitán y chofer con datos de prueba (el backend aún no tiene esos endpoints). */
  crewDemo: (import.meta.env.VITE_CREW_DEMO ?? 'true') === 'true',
};

/** Zona horaria de operación. No usar la del teléfono: muchos clientes son turistas. */
export const OPS_TIMEZONE = 'America/Cancun';
