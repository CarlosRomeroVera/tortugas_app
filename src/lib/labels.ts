import type { BookingStatus, Channel, PaymentMethod, PaymentStatus, Role } from '@/api/types';

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
