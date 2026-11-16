<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/salidas/${route.params.id}`" text="" />
        </ion-buttons>
        <ion-title>Pase de lista</ion-title>
      </ion-toolbar>
      <ion-toolbar v-if="dep" class="sub">
        <div class="counts tg-num">
          <span
            ><b>{{ count('boarded') }}</b> a bordo</span
          >
          <span
            ><b>{{ count('pending') }}</b> faltan</span
          >
          <span
            ><b>{{ count('no_show') }}</b> no se presentaron</span
          >
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="dep">
      <DemoBanner />
      <div class="tg-stack">
        <article v-for="m in dep.manifest" :key="m.code" class="tg-card pax" :class="m.boarding">
          <div class="head">
            <div>
              <h2>{{ m.name }}</h2>
              <span class="tg-muted small">{{ m.code }} · {{ m.origin }}</span>
            </div>
            <span class="n tg-num" :aria-label="`${m.pax} personas`">{{ m.pax }}</span>
          </div>
          <p v-if="m.cruise_ship" class="cruise">
            {{ m.cruise_ship }} · all aboard <b class="tg-num">{{ m.all_aboard_local }}</b>
          </p>
          <p v-if="m.pickup" class="small tg-muted">Recogida: {{ m.pickup }}</p>
          <p v-if="m.notes" class="notes">{{ m.notes }}</p>

          <ion-segment
            :value="m.boarding"
            :aria-label="`Estado de ${m.name}`"
            @ion-change="setBoarding(dep, m, $event.detail.value as BoardingStatus)"
          >
            <ion-segment-button value="pending"><ion-label>Falta</ion-label></ion-segment-button>
            <ion-segment-button value="boarded"><ion-label>A bordo</ion-label></ion-segment-button>
            <ion-segment-button value="no_show"><ion-label>No vino</ion-label></ion-segment-button>
          </ion-segment>
        </article>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import DemoBanner from '@/components/DemoBanner.vue';
import { findDeparture, setBoarding, type BoardingStatus } from '@/demo/crewDemo';

const route = useRoute();
const dep = computed(() => findDeparture(String(route.params.id)));
const count = (s: BoardingStatus) =>
  dep.value?.manifest.filter((m) => m.boarding === s).reduce((n, m) => n + m.pax, 0) ?? 0;
</script>

<style scoped>
.sub {
  --background: var(--tg-surface);
  --color: var(--ion-text-color);
}
.counts {
  display: flex;
  justify-content: space-around;
  gap: 8px;
  font-size: 13px;
  padding: 4px 8px;
}
.counts b {
  font-size: 16px;
}
.pax {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-left: 4px solid var(--tg-line);
}
.pax.boarded {
  border-left-color: var(--ion-color-success);
}
.pax.no_show {
  border-left-color: var(--ion-color-medium);
  opacity: 0.8;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
.n {
  font-size: 24px;
  font-weight: 800;
  min-width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--tg-sea-bg);
  display: grid;
  place-items: center;
}
.small {
  font-size: 13px;
}
p {
  margin: 0;
}
.cruise {
  font-size: 14px;
  color: var(--ion-color-tertiary);
  font-weight: 600;
}
.notes {
  font-size: 14px;
  background: var(--tg-warn-bg);
  color: var(--tg-warn-fg);
  padding: 8px 10px;
  border-radius: 8px;
}
ion-segment-button {
  min-height: 44px;
}
</style>
