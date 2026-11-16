<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Mis recogidas</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <PendingNotice v-if="!env.crewDemo" title="Tus corridas del día" />
      <template v-else>
        <DemoBanner />
        <div class="tg-stack">
          <div class="tg-eyebrow">{{ longDate(today) }} · hora de Cozumel</div>

          <section v-for="run in crewDemo.runs" :key="run.id" class="tg-card run">
            <header class="run-head">
              <div>
                <span class="time tg-num">{{ run.local_start }}</span>
                <span class="tg-muted"> · {{ run.vehicle }}</span>
              </div>
              <ion-badge :color="run.delivered_at ? 'success' : 'medium'">
                {{ run.delivered_at ? `Entregada ${run.delivered_at}` : `${done(run)}/${run.stops.length} paradas` }}
              </ion-badge>
            </header>

            <ol class="stops">
              <li v-for="(s, i) in run.stops" :key="s.id" class="stop" :class="s.status">
                <span class="k tg-num" aria-hidden="true">{{ i + 1 }}</span>
                <div class="body">
                  <div class="row">
                    <b>{{ s.local_time }} · {{ s.place }}</b>
                    <span class="pax tg-num">{{ s.pax }} pax</span>
                  </div>
                  <div class="tg-muted small">{{ s.detail }}</div>
                  <div class="small">{{ s.customer }} · {{ s.booking_code }} · {{ s.tour }}</div>

                  <div v-if="s.status === 'pending' && !run.delivered_at" class="btns">
                    <ion-button size="default" color="primary" @click="setPickupStatus(s, 'picked_up')"
                      >Recogido</ion-button
                    >
                    <ion-button size="default" fill="outline" color="medium" @click="noShow(s)"
                      >No se presentó</ion-button
                    >
                  </div>
                  <div v-else class="state small">
                    <ion-icon :icon="s.status === 'picked_up' ? checkmarkCircle : closeCircle" aria-hidden="true" />
                    {{ s.status === 'picked_up' ? 'Recogido' : 'No se presentó' }}
                    <button v-if="!run.delivered_at" type="button" class="undo" @click="setPickupStatus(s, 'pending')">
                      Deshacer
                    </button>
                  </div>
                </div>
              </li>
            </ol>

            <ion-button
              v-if="!run.delivered_at"
              expand="block"
              color="tertiary"
              class="tg-big-btn"
              :disabled="done(run) < run.stops.length"
              @click="markDelivered(run)"
            >
              Entregados en {{ run.destination }}
            </ion-button>
          </section>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { checkmarkCircle, closeCircle } from 'ionicons/icons';

import DemoBanner from '@/components/DemoBanner.vue';
import PendingNotice from '@/components/PendingNotice.vue';
import { env } from '@/config/env';
import { crewDemo, markDelivered, setPickupStatus, type PickupStop, type VehicleRun } from '@/demo/crewDemo';
import { longDate, todayLocal } from '@/lib/format';

const today = todayLocal();
const done = (r: VehicleRun) => r.stops.filter((s) => s.status !== 'pending').length;

async function noShow(s: PickupStop) {
  const alert = await alertController.create({
    header: 'No se presentó',
    message: `¿Confirmas que ${s.customer} no llegó a ${s.place}? Coordinación será avisada.`,
    buttons: [
      { text: 'Seguir esperando', role: 'cancel' },
      { text: 'Confirmar', role: 'destructive', handler: () => setPickupStatus(s, 'no_show') },
    ],
  });
  await alert.present();
}
</script>

<style scoped>
.run {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.run-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.time {
  font-size: 22px;
  font-weight: 800;
}
.stops {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.stop {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
}
.k {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--tg-line);
}
.picked_up .k {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.pax {
  font-weight: 700;
  white-space: nowrap;
}
.small {
  font-size: 13px;
}
.btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 6px;
}
.btns ion-button {
  margin: 0;
  min-height: 48px;
  --border-radius: 10px;
}
.state {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  margin-top: 4px;
}
.picked_up .state {
  color: var(--ion-color-success);
}
.no_show .state {
  color: var(--tg-muted);
}
.undo {
  margin-left: auto;
  font: inherit;
  background: none;
  border: 0;
  color: var(--ion-color-primary);
  padding: 10px 4px;
  min-height: 44px;
  cursor: pointer;
}
</style>
