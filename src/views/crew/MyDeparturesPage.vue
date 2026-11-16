<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Mis salidas</ion-title>
      </ion-toolbar>
      <ion-toolbar class="sub">
        <ion-segment :value="day" aria-label="Día" @ion-change="day = $event.detail.value as Day">
          <ion-segment-button value="today"><ion-label>Hoy</ion-label></ion-segment-button>
          <ion-segment-button value="tomorrow"><ion-label>Mañana</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="pull($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="tg-stack">
        <div class="tg-eyebrow">{{ longDate(date) }} · hora de Cozumel</div>
        <SyncStatus />

        <p v-if="error && (fatal || !list)" class="tg-card msg" role="alert">{{ error }}</p>
        <p v-else-if="error" class="stale small">
          No se pudo actualizar. Mostrando lo guardado a las {{ localTime(list!.fetchedAt) }}.
        </p>

        <template v-if="!fatal && list">
          <ion-card
            v-for="d in items"
            :key="d.id"
            button
            :router-link="`/tabs/salidas/${d.id}`"
            class="dep"
            :class="{ cancelled: d.status === 'cancelled' }"
          >
            <ion-card-header>
              <div class="top">
                <span class="time tg-num">{{ d.local_time }}</span>
                <ion-badge :color="badge(d).color">{{ badge(d).label }}</ion-badge>
              </div>
              <ion-card-title>{{ d.service.name }}</ion-card-title>
              <ion-card-subtitle>
                {{ d.asset.name }}<template v-if="d.asset.registration"> · {{ d.asset.registration }}</template>
                <template v-if="d.my_role"> · {{ STAFF_ROLE_LABEL[d.my_role] }}</template>
              </ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <div class="meta tg-num">
                <span>{{ d.pax.booked }} pax · {{ d.pax.checked_in }} a bordo</span>
                <span>regreso {{ d.local_end_time }}</span>
                <span v-if="d.unsyncedCount" class="unsynced">{{ d.unsyncedCount }} sin enviar</span>
              </div>
              <div v-if="d.stages_total" class="stages" aria-hidden="true">
                <i
                  v-for="n in d.stages_total"
                  :key="n"
                  :class="{ d: n < pos(d), c: n === pos(d) && d.status !== 'completed', f: d.status === 'completed' }"
                />
              </div>
            </ion-card-content>
          </ion-card>

          <div v-if="!items.length && !loading" class="empty">
            <p>No tienes salidas asignadas {{ day === 'today' ? 'hoy' : 'mañana' }}.</p>
            <ion-button v-if="day === 'today'" fill="clear" @click="day = 'tomorrow'">Ver las de mañana</ion-button>
          </div>
        </template>

        <div v-if="loading && !list" class="empty"><ion-spinner /></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  type RefresherCustomEvent,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';

import type { CrewDeparture } from '@/api/types';
import SyncStatus from '@/components/SyncStatus.vue';
import { eventQueue } from '@/lib/eventQueue';
import { localTime, longDate, todayLocal } from '@/lib/format';
import { DEPARTURE_STATUS, STAFF_ROLE_LABEL } from '@/lib/labels';
import { cachedList, crew, listItemView, loadList } from '@/stores/crew';

type Day = 'today' | 'tomorrow';
const day = ref<Day>('today');
const date = computed(() => todayLocal(new Date(Date.now() + (day.value === 'tomorrow' ? 86_400_000 : 0))));

const loading = ref(false);
const error = ref<string | null>(null);
const fatal = ref(false);

const list = computed(() => crew.lists[date.value] ?? null);
const items = computed(() => {
  void eventQueue.pending.length;
  return (list.value?.data ?? []).map(listItemView);
});

const pos = (d: CrewDeparture) => d.current_stage?.position ?? 0;

function badge(d: CrewDeparture) {
  if (d.status === 'in_progress' && d.current_stage) return { label: d.current_stage.name, color: 'tertiary' };
  return DEPARTURE_STATUS[d.status];
}

async function load() {
  void cachedList(date.value); // en paralelo con la API: muestra lo guardado mientras responde
  loading.value = true;
  const r = await loadList(date.value);
  error.value = r.error;
  fatal.value = r.fatal;
  loading.value = false;
}

async function pull(ev: RefresherCustomEvent) {
  await load();
  await ev.target.complete();
}

watch(date, load);
onIonViewWillEnter(load);
</script>

<style scoped>
.sub {
  --background: var(--tg-surface);
  padding: 0 12px 6px;
}
.dep {
  margin: 0;
  border-radius: 16px;
}
.dep.cancelled {
  opacity: 0.6;
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
.unsynced {
  color: var(--tg-warn-fg);
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
.stages i.d,
.stages i.f {
  background: var(--ion-color-primary);
}
.stages i.c {
  background: var(--ion-color-tertiary);
}
.msg {
  margin: 0;
  color: var(--tg-warn-fg);
  background: var(--tg-warn-bg);
}
.stale {
  margin: 0;
  color: var(--tg-warn-fg);
}
.small {
  font-size: 13px;
}
.empty {
  text-align: center;
  color: var(--tg-muted);
  padding: 32px 0;
}
</style>
