<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/salidas/${id}`" text="" />
        </ion-buttons>
        <ion-title>Pase de lista</ion-title>
      </ion-toolbar>
      <ion-toolbar v-if="dep" class="sub">
        <div class="counts tg-num">
          <span
            ><b>{{ dep.pax.checked_in }}</b> {{ words.boarded.toLowerCase() }}</span
          >
          <span
            ><b>{{ dep.pax.booked - dep.pax.checked_in }}</b> faltan</span
          >
          <span
            ><b>{{ dep.pax.no_show }}</b> no se presentaron</span
          >
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="dep">
      <ion-refresher slot="fixed" @ion-refresh="pull($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="tg-stack">
        <SyncStatus :departure-id="dep.id" />
        <p v-if="dep.status === 'cancelled'" class="tg-card banner" role="alert">
          La salida fue cancelada; ya no se puede registrar abordaje.
        </p>
        <p v-if="!dep.manifest.length" class="tg-muted center">No hay pasajeros en esta salida.</p>

        <template v-for="g in groups" :key="g.key">
          <h3 class="group tg-eyebrow">
            {{ g.pickup ? g.pickup.name : 'Llegan por su cuenta' }}
            <a v-if="g.pickup && mapUrl(g.pickup)" :href="mapUrl(g.pickup)!" target="_blank" rel="noopener">Mapa</a>
          </h3>
          <p v-if="g.pickup?.notes || g.pickup?.address" class="small tg-muted pickup-notes">
            {{ [g.pickup.address, g.pickup.notes].filter(Boolean).join(' · ') }}
          </p>

          <article v-for="m in g.items" :key="m.id" class="tg-card pax" :class="m.boarding">
            <div class="head">
              <div>
                <h2>{{ m.customer.name }}</h2>
                <span class="tg-muted small">
                  {{ m.code }}<template v-if="m.customer.country"> · {{ m.customer.country }}</template> ·
                  {{ m.adults }} ad.<template v-if="m.children"> + {{ m.children }} niñ.</template>
                  <template v-if="m.unsynced"> · <b class="unsynced">sin enviar</b></template>
                </span>
              </div>
              <span class="n tg-num" :aria-label="`${m.pax} personas`">{{ m.pax }}</span>
            </div>

            <p v-if="m.cruise_ship" class="cruise">
              {{ m.cruise_ship
              }}<template v-if="m.all_aboard_local_time">
                · all aboard <b class="tg-num">{{ m.all_aboard_local_time }}</b></template
              >
            </p>
            <p v-if="m.balance_cents > 0" class="balance">
              Saldo por cobrar: <b class="tg-num">{{ money(m.balance_cents, m.currency) }}</b> (lo registra oficina)
            </p>
            <p v-if="m.notes" class="notes">{{ m.notes }}</p>
            <a v-if="m.customer.phone" class="small phone" :href="`tel:${m.customer.phone}`">
              {{ m.customer.phone }}
            </a>

            <ion-segment
              :value="m.boarding"
              :disabled="!editable(m)"
              :aria-label="`Estado de ${m.customer.name}`"
              @ion-change="change(m, $event.detail.value as BoardingState)"
            >
              <ion-segment-button value="pending"><ion-label>Falta</ion-label></ion-segment-button>
              <ion-segment-button value="boarded">
                <ion-label>{{ words.boarded }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="no_show"><ion-label>No vino</ion-label></ion-segment-button>
            </ion-segment>
          </article>
        </template>
      </div>
    </ion-content>

    <ion-content v-else>
      <div class="ion-padding tg-muted center">
        <ion-spinner v-if="loading" />
        <p v-else>{{ error ?? 'No se encontró la salida.' }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  IonBackButton,
  IonButtons,
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
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import type { PickupLocation } from '@/api/types';
import SyncStatus from '@/components/SyncStatus.vue';
import { eventQueue } from '@/lib/eventQueue';
import { money } from '@/lib/format';
import {
  cachedDetail,
  crew,
  departureView,
  loadDetail,
  setBoarding,
  type BoardingState,
  type ManifestView,
} from '@/stores/crew';

const route = useRoute();
const id = String(route.params.id);

const loading = ref(false);
const error = ref<string | null>(null);
const fatal = ref(false);

const dep = computed(() => {
  void eventQueue.pending.length;
  void crew.details[id];
  return fatal.value ? null : departureView(id);
});

/** El chofer registra que el pasajero subió al vehículo; el capitán, que abordó. */
const words = computed(() => ({ boarded: dep.value?.asset.kind === 'vehicle' ? 'Subió' : 'A bordo' }));

/** El manifiesto ya viene ordenado por punto de recogida y nombre. */
const groups = computed(() => {
  const out: { key: string; pickup: PickupLocation | null; items: ManifestView[] }[] = [];
  for (const m of dep.value?.manifest ?? []) {
    const key = m.pickup?.id ?? 'own';
    let g = out.find((x) => x.key === key);
    if (!g) out.push((g = { key, pickup: m.pickup, items: [] }));
    g.items.push(m);
  }
  return out;
});

/** Tras terminar la salida el backend rechaza deshacer abordajes; con la salida cancelada, todo. */
function editable(m: ManifestView): boolean {
  const s = dep.value?.status;
  if (s === 'cancelled') return false;
  if (s === 'completed') return m.boarding !== 'boarded';
  return true;
}

function mapUrl(p: PickupLocation): string | null {
  return p.latitude !== null && p.longitude !== null ? `https://maps.google.com/?q=${p.latitude},${p.longitude}` : null;
}

function change(m: ManifestView, to: BoardingState) {
  const d = dep.value;
  if (!d || !to || to === m.boarding) return;
  setBoarding(d, m, to);
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

async function load() {
  void cachedDetail(id); // en paralelo con la API: muestra lo guardado mientras responde
  loading.value = true;
  const r = await loadDetail(id);
  fatal.value = r.fatal;
  error.value = r.error;
  loading.value = false;
}

async function pull(ev: RefresherCustomEvent) {
  await load();
  await ev.target.complete();
}

onIonViewWillEnter(load);
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
.center {
  text-align: center;
  margin-top: 15vh;
}
.banner {
  margin: 0;
  color: var(--ion-color-danger);
  font-weight: 600;
}
.group {
  margin: 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.group a {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  color: var(--ion-color-primary);
}
.pickup-notes {
  margin: -6px 0 0;
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
.unsynced {
  color: var(--tg-warn-fg);
}
.cruise {
  font-size: 15px;
  color: var(--ion-color-danger);
  font-weight: 700;
}
.balance {
  font-size: 14px;
  color: var(--tg-warn-fg);
}
.notes {
  font-size: 14px;
  background: var(--tg-warn-bg);
  color: var(--tg-warn-fg);
  padding: 8px 10px;
  border-radius: 8px;
}
.phone {
  color: var(--ion-color-primary);
  align-self: flex-start;
  padding: 6px 0;
}
ion-segment-button {
  min-height: 44px;
}
</style>
