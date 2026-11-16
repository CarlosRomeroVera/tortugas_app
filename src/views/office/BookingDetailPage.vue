<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/reservas" text="" />
        </ion-buttons>
        <ion-title>{{ code }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="loading && !booking" class="ion-padding ion-text-center"><ion-spinner /></div>

      <div v-else-if="loadError" class="ion-padding ion-text-center">
        <p class="tg-muted">{{ loadError }}</p>
        <ion-button fill="outline" @click="load">Reintentar</ion-button>
      </div>

      <template v-else-if="booking">
        <div class="tg-hero">
          <span class="tg-eyebrow">{{ booking.code }} · {{ CHANNEL_LABEL[booking.channel] }}</span>
          <h1>{{ booking.customer.name }}</h1>
          <p>{{ booking.departure.service }} · {{ booking.departure.asset }}</p>
          <p class="tg-num">{{ booking.departure.local_time }} hora de Cozumel</p>
          <div class="status">
            <ion-badge :color="BOOKING_STATUS[booking.status].color">{{
              BOOKING_STATUS[booking.status].label
            }}</ion-badge>
          </div>
        </div>

        <div class="tg-stack">
          <section class="tg-card money">
            <dl>
              <dt>Total</dt>
              <dd class="tg-num">{{ money(booking.total_cents, booking.currency) }}</dd>
              <dt>Pagado</dt>
              <dd class="tg-num ok">{{ money(booking.paid_cents, booking.currency) }}</dd>
              <dt class="strong">Saldo</dt>
              <dd class="tg-num strong" :class="{ due: booking.balance_cents > 0 }">
                {{ money(booking.balance_cents, booking.currency) }}
              </dd>
            </dl>
            <ion-button
              v-if="booking.status !== 'cancelled' && booking.balance_cents > 0"
              expand="block"
              class="tg-big-btn"
              @click="openPayment"
            >
              Registrar pago
            </ion-button>
          </section>

          <section class="tg-card">
            <h2 class="tg-eyebrow">Detalle</h2>
            <dl class="kv">
              <dt>Personas</dt>
              <dd>{{ booking.adults }} adultos{{ booking.children ? ` · ${booking.children} niños` : '' }}</dd>
              <template v-if="booking.customer.phone">
                <dt>Teléfono</dt>
                <dd>
                  <a :href="`tel:${booking.customer.phone}`">{{ booking.customer.phone }}</a>
                </dd>
              </template>
              <template v-if="booking.customer.email">
                <dt>Correo</dt>
                <dd>{{ booking.customer.email }}</dd>
              </template>
              <template v-if="booking.cruise_ship">
                <dt>Crucero</dt>
                <dd>
                  {{ booking.cruise_ship }}
                  <span v-if="booking.all_aboard_at"> · all aboard {{ localTime(booking.all_aboard_at) }}</span>
                </dd>
              </template>
            </dl>
          </section>

          <section class="tg-card">
            <h2 class="tg-eyebrow">Pagos</h2>
            <p v-if="!booking.payments.length" class="tg-muted none">Sin pagos registrados.</p>
            <ul v-else class="payments">
              <li v-for="(p, i) in booking.payments" :key="i">
                <div>
                  <b class="tg-num">{{ money(p.amount_cents, p.currency) }}</b>
                  <span class="tg-muted"> · {{ METHOD_LABEL[p.method] }}</span>
                  <div v-if="p.paid_at" class="tg-muted small tg-num">{{ localTime(p.paid_at) }}</div>
                </div>
                <ion-badge :color="p.status === 'paid' ? 'success' : 'medium'">{{
                  PAYMENT_STATUS[p.status]
                }}</ion-badge>
              </li>
            </ul>
          </section>

          <ion-button
            v-if="booking.status !== 'cancelled'"
            expand="block"
            fill="outline"
            color="danger"
            :disabled="cancelling"
            @click="confirmCancel"
          >
            Cancelar reserva
          </ion-button>
        </div>
      </template>

      <ion-modal
        :is-open="paymentOpen"
        :initial-breakpoint="1"
        :breakpoints="[0, 1]"
        @did-dismiss="paymentOpen = false"
      >
        <ion-header>
          <ion-toolbar>
            <ion-title>Registrar pago</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="paymentOpen = false">Cerrar</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <form class="tg-stack" novalidate @submit.prevent="savePayment">
            <ion-segment v-model="pay.currency">
              <ion-segment-button value="MXN"><ion-label>Pesos MXN</ion-label></ion-segment-button>
              <ion-segment-button value="USD"><ion-label>Dólares USD</ion-label></ion-segment-button>
            </ion-segment>
            <ion-input
              v-model="pay.amount"
              label="Monto"
              label-placement="stacked"
              fill="outline"
              inputmode="decimal"
              :placeholder="booking ? (booking.balance_cents / 100).toFixed(2) : ''"
              :error-text="payErr('amount_cents')"
              :class="{ 'ion-invalid ion-touched': !!payErr('amount_cents') }"
            />
            <ion-input
              v-if="pay.currency === 'USD'"
              v-model="pay.usdRate"
              label="Tipo de cambio (pesos por dólar)"
              label-placement="stacked"
              fill="outline"
              inputmode="decimal"
              :error-text="payErr('usd_rate')"
              :class="{ 'ion-invalid ion-touched': !!payErr('usd_rate') }"
            />
            <ion-select
              v-model="pay.method"
              label="Forma de pago"
              label-placement="stacked"
              fill="outline"
              interface="action-sheet"
            >
              <ion-select-option v-for="(label, key) in METHOD_LABEL" :key="key" :value="key">{{
                label
              }}</ion-select-option>
            </ion-select>
            <ion-input
              v-if="pay.method === 'card' || pay.method === 'transfer'"
              v-model="pay.reference"
              label="Referencia / autorización"
              label-placement="stacked"
              fill="outline"
            />
            <p v-if="payError" class="error" role="alert">{{ payError }}</p>
            <ion-button type="submit" expand="block" class="tg-big-btn" :disabled="savingPay">
              <ion-spinner v-if="savingPay" name="crescent" />
              <span v-else>Guardar pago</span>
            </ion-button>
          </form>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonLabel,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  toastController,
  type RefresherCustomEvent,
} from '@ionic/vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import { bookingsApi } from '@/api/endpoints';
import { ApiError, errorMessage } from '@/api/http';
import type { Booking, Currency, PaymentMethod } from '@/api/types';
import { localTime, money, parseCents } from '@/lib/format';
import { BOOKING_STATUS, CHANNEL_LABEL, METHOD_LABEL, PAYMENT_STATUS } from '@/lib/labels';
import { rememberBooking } from '@/stores/recentBookings';

const route = useRoute();
const code = computed(() => String(route.params.code));
const booking = ref<Booking | null>(null);
const loading = ref(false);
const loadError = ref('');
const cancelling = ref(false);

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    booking.value = await bookingsApi.get(code.value);
    rememberBooking(booking.value);
  } catch (e) {
    loadError.value =
      e instanceof ApiError && e.status === 404 ? `No existe la reserva ${code.value}.` : errorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function refresh(ev: RefresherCustomEvent) {
  await load();
  ev.target.complete();
}

const toast = async (message: string, color = 'success') =>
  (await toastController.create({ message, duration: 2500, color, position: 'top' })).present();

// ---- Pago ----
const paymentOpen = ref(false);
const savingPay = ref(false);
const payApiError = ref<ApiError | null>(null);
const payError = ref('');
const pay = reactive({
  currency: 'MXN' as Currency,
  amount: '',
  usdRate: '18.00',
  method: 'cash' as PaymentMethod,
  reference: '',
});
const payErr = (f: string) => payApiError.value?.field(f);

function openPayment() {
  if (!booking.value) return;
  Object.assign(pay, { currency: booking.value.currency, amount: '', method: 'cash', reference: '' });
  payApiError.value = null;
  payError.value = '';
  paymentOpen.value = true;
}

async function savePayment() {
  if (!booking.value) return;
  payApiError.value = null;
  payError.value = '';
  const cents = parseCents(pay.amount);
  if (cents === null) {
    payApiError.value = new ApiError(422, '', { amount_cents: ['Escribe un monto mayor a cero.'] });
    return;
  }
  const rate = Number(pay.usdRate);
  if (pay.currency === 'USD' && !(rate > 0)) {
    payApiError.value = new ApiError(422, '', { usd_rate: ['Escribe el tipo de cambio.'] });
    return;
  }
  savingPay.value = true;
  try {
    booking.value = await bookingsApi.addPayment(booking.value.code, {
      amount_cents: cents,
      currency: pay.currency,
      method: pay.method,
      usd_rate: pay.currency === 'USD' ? rate : undefined,
      provider_reference: pay.reference.trim() || null,
    });
    rememberBooking(booking.value);
    paymentOpen.value = false;
    toast('Pago registrado');
  } catch (e) {
    if (e instanceof ApiError && Object.keys(e.errors).length) payApiError.value = e;
    payError.value = errorMessage(e);
  } finally {
    savingPay.value = false;
  }
}

// ---- Cancelación ----
async function confirmCancel() {
  if (!booking.value) return;
  const alert = await alertController.create({
    header: 'Cancelar reserva',
    message: 'Si el servicio es privado, la unidad queda libre para otra venta.',
    inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Motivo (opcional)', attributes: { maxlength: 500 } }],
    buttons: [
      { text: 'Volver', role: 'cancel' },
      {
        text: 'Cancelar reserva',
        role: 'destructive',
        handler: (v: { reason?: string }) => {
          void doCancel(v.reason);
        },
      },
    ],
  });
  await alert.present();
}

async function doCancel(reason?: string) {
  if (!booking.value) return;
  cancelling.value = true;
  try {
    booking.value = await bookingsApi.cancel(booking.value.code, reason?.trim());
    rememberBooking(booking.value);
    toast('Reserva cancelada', 'medium');
  } catch (e) {
    toast(errorMessage(e), 'danger');
  } finally {
    cancelling.value = false;
  }
}
</script>

<style scoped>
.status {
  margin-top: 6px;
}
.money dl,
.kv {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
  margin: 0 0 4px;
}
dt {
  color: var(--tg-muted);
}
dd {
  margin: 0;
  text-align: right;
  font-weight: 600;
}
.kv dd {
  text-align: left;
}
.strong {
  font-size: 18px;
  font-weight: 800;
  color: var(--ion-text-color);
}
.ok {
  color: var(--ion-color-success);
}
.due {
  color: var(--ion-color-tertiary);
}
.money ion-button {
  margin-top: 14px;
}
h2.tg-eyebrow {
  margin: 0 0 10px;
}
.payments {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.payments li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.small {
  font-size: 12px;
}
.none {
  margin: 0;
}
.error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--tg-bad-bg);
  color: var(--tg-bad-fg);
}
</style>
