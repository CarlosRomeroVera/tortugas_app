import type {
  BookingStatus,
  Channel,
  DepartureStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
  StaffRole,
} from '@/api/types';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administración',
  coordinacion: 'Coordinación',
  ventas: 'Ventas',
  capitan: 'Capitán',
  chofer: 'Chofer',
  mantenimiento: 'Mantenimiento',
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  counter: 'Mostrador',
  whatsapp: 'WhatsApp',
  phone: 'Teléfono',
  agency: 'Agencia',
  website: 'Sitio web',
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  online: 'En línea',
  agency_credit: 'Crédito agencia',
};

/** Etiqueta y color de Ionic para cada estado. */
export const BOOKING_STATUS: Record<BookingStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente de pago', color: 'warning' },
  confirmed: { label: 'Confirmada', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'danger' },
  no_show: { label: 'No se presentó', color: 'medium' },
  completed: { label: 'Completada', color: 'primary' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  captain: 'Capitán',
  driver: 'Chofer',
  guide: 'Guía',
  mechanic: 'Mecánico',
};

export const DEPARTURE_STATUS: Record<DepartureStatus, { label: string; color: string }> = {
  scheduled: { label: 'Por iniciar', color: 'medium' },
  in_progress: { label: 'En curso', color: 'tertiary' },
  completed: { label: 'Finalizada', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'danger' },
};

/** Lectura de la unidad: horómetro (embarcación) u odómetro (vehículo). */
export const READING = {
  hours: { name: 'horómetro', unit: 'h', placeholder: 'Horas de motor' },
  km: { name: 'odómetro', unit: 'km', placeholder: 'Kilómetros' },
} as const;
