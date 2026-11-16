/**
 * Configuración por entorno. Los valores vienen de variables VITE_* (ver .env.example).
 */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/+$/, ''),
};

/** Zona horaria de operación. No usar la del teléfono: muchos clientes son turistas. */
export const OPS_TIMEZONE = 'America/Cancun';
