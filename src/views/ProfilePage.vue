<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Perfil</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="tg-stack">
        <section class="tg-card who">
          <div class="avatar" aria-hidden="true">{{ initials }}</div>
          <div>
            <h2>{{ user?.name }}</h2>
            <div class="chips">
              <ion-chip v-for="r in user?.roles" :key="r" color="primary">{{ ROLE_LABEL[r] }}</ion-chip>
            </div>
          </div>
        </section>

        <ion-list inset class="info">
          <ion-item>
            <ion-label>Servidor</ion-label>
            <ion-note slot="end" class="tg-num">{{ env.apiUrl }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Hora de operación</ion-label>
            <ion-note slot="end">America/Cancun · {{ now }}</ion-note>
          </ion-item>
          <ion-item v-if="hasFieldRole">
            <ion-label>Eventos sin enviar</ion-label>
            <ion-note slot="end" class="tg-num">{{ eventQueue.pending.length }}</ion-note>
          </ion-item>
        </ion-list>

        <ion-button expand="block" color="danger" fill="outline" class="tg-big-btn" @click="confirmLogout">
          Cerrar sesión
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { env } from '@/config/env';
import { eventQueue } from '@/lib/eventQueue';
import { localTime } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/labels';
import { session } from '@/stores/session';

const router = useRouter();
const user = computed(() => session.state.user);
const initials = computed(() =>
  (user.value?.name ?? '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase(),
);
const hasFieldRole = computed(() => session.hasRole('capitan', 'chofer'));
const now = localTime(new Date());

async function confirmLogout() {
  const pending = eventQueue.pending.length;
  const alert = await alertController.create({
    header: 'Cerrar sesión',
    message:
      hasFieldRole.value && pending
        ? `Hay ${pending} eventos guardados en este teléfono que aún no se envían. Se conservarán.`
        : '¿Seguro que quieres salir?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Salir',
        role: 'destructive',
        handler: async () => {
          await session.logout();
          router.replace('/login');
        },
      },
    ],
  });
  await alert.present();
}
</script>

<style scoped>
.who {
  display: flex;
  gap: 14px;
  align-items: center;
}
.who h2 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 800;
}
.avatar {
  width: 56px;
  height: 56px;
  flex: none;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 20px;
}
.chips ion-chip {
  margin: 0 4px 0 0;
}
.info {
  margin: 0;
}
ion-note {
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
