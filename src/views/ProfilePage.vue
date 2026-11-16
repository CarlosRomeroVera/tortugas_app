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
          <template v-if="hasFieldRole">
            <ion-item v-if="staff">
              <ion-label>Ficha de personal</ion-label>
              <ion-note slot="end">{{ STAFF_ROLE_LABEL[staff.role] }}</ion-note>
            </ion-item>
            <ion-item v-else>
              <ion-label class="ion-text-wrap tg-muted">
                Tu usuario no está ligado a una ficha de personal. Pide a coordinación que lo vincule.
              </ion-label>
            </ion-item>
            <ion-item v-if="staff?.license_expires_on">
              <ion-label>Licencia vence</ion-label>
              <ion-note slot="end" class="tg-num">{{ staff.license_expires_on }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Registros sin enviar</ion-label>
              <ion-note slot="end" class="tg-num">{{ pendingCount }}</ion-note>
            </ion-item>
            <ion-item v-if="eventQueue.lastSyncAt">
              <ion-label>Último envío</ion-label>
              <ion-note slot="end" class="tg-num">{{ localTime(eventQueue.lastSyncAt) }}</ion-note>
            </ion-item>
          </template>
        </ion-list>

        <ion-button
          v-if="hasFieldRole && pendingCount"
          expand="block"
          fill="outline"
          :disabled="eventQueue.syncing"
          @click="flush()"
        >
          {{ eventQueue.syncing ? 'Enviando…' : 'Enviar ahora' }}
        </ion-button>

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
import { eventQueue, flush, pendingFor } from '@/lib/eventQueue';
import { localTime } from '@/lib/format';
import { ROLE_LABEL, STAFF_ROLE_LABEL } from '@/lib/labels';
import { clearCrewCache } from '@/stores/crew';
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
const staff = computed(() => session.state.staff);
const hasFieldRole = computed(() => session.hasRole('capitan', 'chofer'));
const pendingCount = computed(() => {
  void eventQueue.pending.length;
  return pendingFor().length;
});
const now = localTime(new Date());

async function confirmLogout() {
  if (hasFieldRole.value && pendingCount.value) await flush();
  const pending = pendingCount.value;
  const alert = await alertController.create({
    header: 'Cerrar sesión',
    message:
      hasFieldRole.value && pending
        ? `Hay ${pending} registros que no se pudieron enviar. Se conservan en este teléfono y se enviarán cuando vuelvas a entrar con tu usuario.`
        : '¿Seguro que quieres salir?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Salir',
        role: 'destructive',
        handler: async () => {
          await session.logout();
          await clearCrewCache();
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
