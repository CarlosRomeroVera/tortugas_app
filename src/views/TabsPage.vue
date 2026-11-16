<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button v-for="t in tabs" :key="t.tab" :tab="t.tab" :href="t.href">
          <ion-icon aria-hidden="true" :icon="t.icon" />
          <ion-label>{{ t.label }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { boatOutline, busOutline, calendarOutline, personCircleOutline, receiptOutline } from 'ionicons/icons';
import { computed } from 'vue';

import { OFFICE_ROLES, session } from '@/stores/session';

const tabs = computed(() => {
  const list: { tab: string; href: string; label: string; icon: string }[] = [];
  if (session.hasRole('capitan')) {
    list.push({ tab: 'salidas', href: '/tabs/salidas', label: 'Mis salidas', icon: boatOutline });
  }
  if (session.hasRole('chofer')) {
    list.push({ tab: 'recogidas', href: '/tabs/recogidas', label: 'Recogidas', icon: busOutline });
  }
  list.push({ tab: 'disponibilidad', href: '/tabs/disponibilidad', label: 'Disponibilidad', icon: calendarOutline });
  if (session.hasRole(...OFFICE_ROLES)) {
    list.push({ tab: 'reservas', href: '/tabs/reservas', label: 'Reservas', icon: receiptOutline });
  }
  list.push({ tab: 'perfil', href: '/tabs/perfil', label: 'Perfil', icon: personCircleOutline });
  return list;
});
</script>
