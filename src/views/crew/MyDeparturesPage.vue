<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Mis salidas</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <PendingNotice v-if="!env.crewDemo" title="Tus salidas del día" />
      <template v-else>
        <DemoBanner />
        <div class="tg-stack">
          <div class="tg-eyebrow">{{ longDate(today) }} · hora de Cozumel</div>
          <ion-card
            v-for="d in crewDemo.departures"
            :key="d.id"
            button
            :router-link="`/tabs/salidas/${d.id}`"
            class="dep"
          >
            <ion-card-header>
              <div class="top">
                <span class="time tg-num">{{ d.local_start }}</span>
                <ion-badge :color="badge(d).color">{{ badge(d).label }}</ion-badge>
              </div>
              <ion-card-title>{{ d.service }}</ion-card-title>
              <ion-card-subtitle>{{ d.asset }} · {{ d.dock }}</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <div class="meta">
                <span class="tg-num">{{ paxOf(d) }} pax · regreso {{ d.local_end }}</span>
                <span v-if="cruiseOf(d)" class="cruise">Crucero · all aboard {{ cruiseOf(d) }}</span>
              </div>
              <div class="stages" aria-hidden="true">
                <i v-for="(s, i) in d.stages" :key="s.name" :class="{ d: i < d.current, c: i === d.current }" />
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';

import DemoBanner from '@/components/DemoBanner.vue';
import PendingNotice from '@/components/PendingNotice.vue';
import { env } from '@/config/env';
import { crewDemo, type Departure } from '@/demo/crewDemo';
import { longDate, todayLocal } from '@/lib/format';

const today = todayLocal();
const paxOf = (d: Departure) => d.manifest.reduce((n, m) => n + m.pax, 0);
const cruiseOf = (d: Departure) =>
  d.manifest
    .map((m) => m.all_aboard_local)
    .filter(Boolean)
    .sort()[0];

function badge(d: Departure) {
  if (d.current < 0) return { label: 'Por iniciar', color: 'medium' };
  if (d.current >= d.stages.length - 1) return { label: 'Finalizada', color: 'success' };
  return { label: d.stages[d.current].name, color: 'tertiary' };
}
</script>

<style scoped>
.dep {
  margin: 0;
  border-radius: 16px;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.time {
  font-size: 26px;
  font-weight: 800;
  color: var(--ion-text-color);
}
ion-card-title {
  font-weight: 800;
  font-size: 20px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 14px;
}
.cruise {
  color: var(--ion-color-tertiary);
  font-weight: 600;
}
.stages {
  display: flex;
  gap: 3px;
  margin-top: 10px;
}
.stages i {
  height: 6px;
  flex: 1;
  border-radius: 3px;
  background: var(--tg-line);
}
.stages i.d {
  background: var(--ion-color-primary);
}
.stages i.c {
  background: var(--ion-color-tertiary);
}
</style>
