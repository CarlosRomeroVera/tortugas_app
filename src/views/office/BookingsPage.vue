<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Reservas</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="tg-stack">
        <form class="tg-card search" role="search" @submit.prevent="open">
          <ion-input
            v-model="code"
            label="Código de reserva"
            label-placement="stacked"
            fill="outline"
            placeholder="R-7KQ2MX"
            autocapitalize="characters"
            :error-text="error"
            :class="{ 'ion-invalid ion-touched': !!error }"
          />
          <ion-button type="submit" :disabled="!code.trim()">Buscar</ion-button>
        </form>

        <ion-button expand="block" color="tertiary" class="tg-big-btn" router-link="/tabs/disponibilidad">
          <ion-icon slot="start" :icon="addOutline" aria-hidden="true" />
          Nueva reserva
        </ion-button>

        <section v-if="recentBookings.items.length">
          <h2 class="tg-eyebrow heading">Abiertas en este teléfono</h2>
          <ion-list inset class="list">
            <ion-item v-for="b in recentBookings.items" :key="b.code" :router-link="`/tabs/reservas/${b.code}`" detail>
              <ion-label>
                <h3>{{ b.customer }}</h3>
                <p>{{ b.code }} · {{ b.service }}</p>
                <p class="tg-num">{{ b.local_time }}</p>
              </ion-label>
              <ion-badge slot="end" :color="BOOKING_STATUS[b.status].color">{{
                BOOKING_STATUS[b.status].label
              }}</ion-badge>
            </ion-item>
          </ion-list>
        </section>
        <p v-else class="tg-muted ion-text-center empty">
          Aquí aparecerán las reservas que crees o consultes desde este teléfono.
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { addOutline } from 'ionicons/icons';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { BOOKING_STATUS } from '@/lib/labels';
import { recentBookings } from '@/stores/recentBookings';

const router = useRouter();
const code = ref('');
const error = ref('');

function open() {
  const c = code.value.trim().toUpperCase();
  error.value = '';
  if (!/^R-?[A-Z0-9]+$/.test(c)) {
    error.value = 'El código empieza con R, por ejemplo R-7KQ2MX.';
    return;
  }
  router.push(`/tabs/reservas/${c.startsWith('R-') ? c : `R-${c.slice(1)}`}`);
}
</script>

<style scoped>
.search {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.search ion-input {
  flex: 1;
}
.search ion-button {
  margin: 6px 0 0;
  min-height: 52px;
}
.heading {
  margin: 8px 4px;
}
.list {
  margin: 0;
}
.empty {
  font-size: 14px;
}
</style>
