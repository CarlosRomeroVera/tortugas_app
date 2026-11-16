import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

import type { Role } from '@/api/types';
import { OFFICE_ROLES, session } from '@/stores/session';
import TabsPage from '@/views/TabsPage.vue';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    roles?: Role[];
  }
}

/** Pestaña de inicio según el rol del usuario. */
export function homeFor(roles: Role[]): string {
  if (roles.some((r) => OFFICE_ROLES.includes(r))) return '/tabs/disponibilidad';
  if (roles.includes('capitan')) return '/tabs/salidas';
  if (roles.includes('chofer')) return '/tabs/recogidas';
  return '/tabs/disponibilidad';
}

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: () => (session.state.user ? homeFor(session.state.user.roles) : '/login') },
  { path: '/login', component: () => import('@/views/LoginPage.vue'), meta: { public: true } },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      { path: '', redirect: '/' },
      { path: 'disponibilidad', component: () => import('@/views/AvailabilityPage.vue') },

      // Oficina: reservas y pagos (API real).
      {
        path: 'reservas',
        component: () => import('@/views/office/BookingsPage.vue'),
        meta: { roles: OFFICE_ROLES },
      },
      {
        path: 'reservas/nueva',
        component: () => import('@/views/office/NewBookingPage.vue'),
        meta: { roles: OFFICE_ROLES },
      },
      {
        path: 'reservas/:code',
        component: () => import('@/views/office/BookingDetailPage.vue'),
        meta: { roles: OFFICE_ROLES },
      },

      // Capitán (datos de prueba hasta que existan los endpoints).
      { path: 'salidas', component: () => import('@/views/crew/MyDeparturesPage.vue'), meta: { roles: ['capitan'] } },
      { path: 'salidas/:id', component: () => import('@/views/crew/DeparturePage.vue'), meta: { roles: ['capitan'] } },
      {
        path: 'salidas/:id/manifiesto',
        component: () => import('@/views/crew/ManifestPage.vue'),
        meta: { roles: ['capitan'] },
      },

      // Chofer (datos de prueba).
      { path: 'recogidas', component: () => import('@/views/driver/MyRunsPage.vue'), meta: { roles: ['chofer'] } },

      { path: 'perfil', component: () => import('@/views/ProfilePage.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  await session.restore();
  const user = session.state.user;

  if (to.meta.public) return user ? homeFor(user.roles) : true;
  if (!user) return '/login';

  const roles = to.matched.flatMap((r) => r.meta.roles ?? []);
  if (roles.length && !session.hasRole(...roles)) return homeFor(user.roles);
  return true;
});

export default router;
