<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Disponibilidad</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="tg-stack">
        <section class="tg-card filters">
          <ion-select
            v-model="serviceSlug"
            label="Servicio"
            label-placement="stacked"
            fill="outline"
            interface="action-sheet"
          >
            <ion-select-option v-for="s in SERVICES" :key="s.slug" :value="s.slug">{{ s.name }}</ion-select-option>
          </ion-select>
          <ion-input v-model="date" type="date" label="Fecha" label-placement="stacked" fill="outline" :min="today" />
          <PaxStepper v-model="adults" label="Adultos" :min="1" />
          <PaxStepper v-model="children" label="Niños" />
        </section>

        <div v-if="data" class="summary">
          <div>
            <div class="tg-eyebrow">{{ longDate(data.date) }} · hora de Cozumel</div>
            <h2>{{ data.service.name }}</h2>
          </div>
          <div v-if="data.service.shared" class="price tg-num">
            {{ money(data.service.price_adult_cents, data.service.currency) }}
            <span class="tg-muted">por adulto</span>
          </div>
          <ion-chip v-else color="secondary" outline>Privado · unidad completa</ion-chip>
        </div>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <div v-if="loading && !data" class="slots">
          <ion-skeleton-text v-for="i in 6" :key="i" animated class="slot-skeleton" />
        </div>

        <p v-else-if="data && !data.slots.length" class="empty tg-muted">No hay horarios para esta fecha.</p>

        <div v-else-if="data" class="slots" role="list">
          <button
            v-for="slot in data.slots"
            :key="slot.starts_at + slotLabel(slot)"
            type="button"
            role="listitem"
            class="slot"
            :class="{ off: !slot.available }"
            :disabled="!slot.available || !canBook"
            :aria-label="`${slot.local_time}, ${slotLabel(slot)}, ${slotDetail(slot)}`"
            @click="pick(slot)"
          >
            <span class="time tg-num">{{ slot.local_time }}</span>
            <span class="asset">{{ slotLabel(slot) }}</span>
            <span class="detail" :class="{ low: isLow(slot) }">{{ slotDetail(slot) }}</span>
          </button>
        </div>

        <p v-if="data && !canBook" class="tg-muted note">
          Solo administración, coordinación y ventas pueden crear reservas.
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonChip,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  type RefresherCustomEvent,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { availabilityApi } from '@/api/endpoints';
import { errorMessage } from '@/api/http';
import { isSharedSlot, type AvailabilityResponse, type PrivateSlot, type SharedSlot } from '@/api/types';
import PaxStepper from '@/components/PaxStepper.vue';
import { SERVICES } from '@/config/services';
import { longDate, money, todayLocal } from '@/lib/format';
import { startDraft } from '@/stores/bookingDraft';
import { OFFICE_ROLES, session } from '@/stores/session';

const router = useRouter();
const today = todayLocal();
const serviceSlug = ref(SERVICES[0].slug);
const date = ref(today);
const adults = ref(2);
const children = ref(0);
const data = ref<AvailabilityResponse | null>(null);
const loading = ref(false);
const error = ref('');
const canBook = computed(() => session.hasRole(...OFFICE_ROLES));
const pax = computed(() => adults.value + children.value);

let seq = 0;
async function load() {
  if (!date.value) return;
  const mine = ++seq;
  loading.value = true;
  error.value = '';
  try {
    const res = await availabilityApi.get(serviceSlug.value, date.value, pax.value);
    if (mine === seq) data.value = res;
  } catch (e) {
    if (mine === seq) {
      data.value = null;
      error.value = errorMessage(e);
    }
  } finally {
    if (mine === seq) loading.value = false;
  }
}

watch([serviceSlug, date, pax], load);
// Al volver (p. ej. tras un 409 en la reserva) se consulta otra vez: alguien pudo ocupar el lugar.
onIonViewWillEnter(load);

async function refresh(ev: RefresherCustomEvent) {
  await load();
  ev.target.complete();
}

const slotLabel = (s: SharedSlot | PrivateSlot) =>
  isSharedSlot(s) ? s.asset : s.assets.length === 1 ? s.assets[0].name : `${s.assets.length} unidades`;

const slotDetail = (s: SharedSlot | PrivateSlot) => {
  if (isSharedSlot(s))
    return s.available
      ? `${s.seats_left} libres de ${s.capacity}`
      : s.seats_left
        ? `Solo ${s.seats_left} libres`
        : 'Lleno';
  if (!s.available) return 'Sin unidad para este grupo';
  return `Hasta ${Math.max(...s.assets.map((a) => a.capacity))} pax`;
};

const isLow = (s: SharedSlot | PrivateSlot) => isSharedSlot(s) && s.available && s.seats_left - pax.value <= 2;

function pick(slot: SharedSlot | PrivateSlot) {
  if (!data.value || !slot.available || !canBook.value) return;
  startDraft(data.value.service, data.value.date, slot, adults.value, children.value);
  router.push('/tabs/reservas/nueva');
}
</script>

<style scoped>
.filters {
  display: grid;
  gap: 14px;
}
.summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 0 4px;
}
.summary h2 {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 800;
}
.price {
  font-weight: 700;
  font-size: 16px;
  text-align: right;
}
.price span {
  display: block;
  font-size: 12px;
  font-weight: 500;
}
.slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.slot {
  font: inherit;
  text-align: left;
  color: var(--ion-text-color);
  background: var(--tg-surface);
  border: 1px solid var(--tg-line);
  border-radius: 14px;
  padding: 12px;
  min-height: 88px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
}
.slot:not(:disabled):active {
  border-color: var(--ion-color-primary);
  background: var(--tg-sea-bg);
}
.slot:focus-visible {
  outline: 2px solid var(--ion-color-tertiary);
  outline-offset: 2px;
}
.slot.off {
  opacity: 0.55;
}
.slot:disabled {
  cursor: default;
}
.time {
  font-size: 22px;
  font-weight: 800;
}
.asset {
  font-size: 14px;
  font-weight: 600;
}
.detail {
  font-size: 13px;
  color: var(--tg-muted);
}
.detail.low {
  color: var(--ion-color-warning);
  font-weight: 600;
}
.slot-skeleton {
  height: 88px;
  border-radius: 14px;
  margin: 0;
}
.error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--tg-bad-bg);
  color: var(--tg-bad-fg);
}
.empty,
.note {
  text-align: center;
  margin: 8px 0;
  font-size: 14px;
}
</style>
