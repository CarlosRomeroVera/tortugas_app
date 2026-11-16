<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/disponibilidad" text="" />
        </ion-buttons>
        <ion-title>Nueva reserva</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="draft.service && draft.slot">
      <div class="tg-hero">
        <span class="tg-eyebrow">{{ longDate(draft.date) }} · {{ draft.slot.local_time }} hora de Cozumel</span>
        <h1>{{ draft.service.name }}</h1>
        <p>{{ assetLine }} · {{ draft.adults }} adultos{{ draft.children ? ` · ${draft.children} niños` : '' }}</p>
      </div>

      <form class="tg-stack" novalidate @submit.prevent="submit">
        <section v-if="privateSlot && privateSlot.assets.length > 1" class="tg-card group">
          <h2 class="tg-eyebrow">Unidad</h2>
          <ion-radio-group v-model="assetId">
            <ion-item lines="none">
              <ion-radio value="">Asignar automáticamente (la más chica que alcance)</ion-radio>
            </ion-item>
            <ion-item v-for="a in privateSlot.assets" :key="a.id" lines="none">
              <ion-radio :value="a.id">{{ a.name }} · hasta {{ a.capacity }} pax</ion-radio>
            </ion-item>
          </ion-radio-group>
        </section>

        <section class="tg-card group">
          <h2 class="tg-eyebrow">Cliente</h2>
          <ion-input
            v-model="form.name"
            label="Nombre *"
            label-placement="stacked"
            fill="outline"
            autocomplete="name"
            :error-text="err('customer.name')"
            :class="invalid('customer.name')"
          />
          <ion-input
            v-model="form.phone"
            label="Teléfono"
            label-placement="stacked"
            fill="outline"
            type="tel"
            inputmode="tel"
            placeholder="+52 987 123 4567"
            :error-text="err('customer.phone')"
            :class="invalid('customer.phone')"
          />
          <ion-input
            v-model="form.email"
            label="Correo"
            label-placement="stacked"
            fill="outline"
            type="email"
            inputmode="email"
            autocapitalize="off"
            :error-text="err('customer.email')"
            :class="invalid('customer.email')"
          />
          <ion-input
            v-model="form.country"
            label="País (código de 2 letras)"
            label-placement="stacked"
            fill="outline"
            :maxlength="2"
            placeholder="MX, US, CA…"
            autocapitalize="characters"
            :error-text="err('customer.country')"
            :class="invalid('customer.country')"
          />
        </section>

        <section class="tg-card group">
          <h2 class="tg-eyebrow">Venta</h2>
          <ion-select
            v-model="form.channel"
            label="Canal *"
            label-placement="stacked"
            fill="outline"
            interface="action-sheet"
            :error-text="err('channel')"
            :class="invalid('channel')"
          >
            <ion-select-option v-for="(label, key) in CHANNEL_LABEL" :key="key" :value="key">{{
              label
            }}</ion-select-option>
          </ion-select>
          <ion-input
            v-if="form.channel === 'agency'"
            v-model="form.agencyRef"
            label="Referencia de agencia / voucher"
            label-placement="stacked"
            fill="outline"
            :error-text="err('agency_reference')"
            :class="invalid('agency_reference')"
          />
        </section>

        <section class="tg-card group">
          <h2 class="tg-eyebrow">Crucero (opcional)</h2>
          <ion-input
            v-model="form.cruise"
            label="Barco"
            label-placement="stacked"
            fill="outline"
            placeholder="Icon of the Seas"
            :error-text="err('cruise_ship')"
            :class="invalid('cruise_ship')"
          />
          <ion-input
            v-model="form.allAboard"
            type="time"
            label="All aboard (hora de Cozumel)"
            label-placement="stacked"
            fill="outline"
            :error-text="err('all_aboard_at')"
            :class="invalid('all_aboard_at')"
          />
          <p v-if="cruiseWarning" class="warn" role="status">{{ cruiseWarning }}</p>
        </section>

        <section class="tg-card group">
          <ion-textarea
            v-model="form.notes"
            label="Notas"
            label-placement="stacked"
            fill="outline"
            :auto-grow="true"
            :error-text="err('notes')"
            :class="invalid('notes')"
          />
        </section>

        <p class="tg-muted fine">
          El total lo calcula el servidor al crear la reserva. Queda pendiente hasta el primer pago.
        </p>
        <p v-if="generalError" class="error" role="alert">{{ generalError }}</p>

        <ion-button type="submit" expand="block" color="tertiary" class="tg-big-btn" :disabled="saving">
          <ion-spinner v-if="saving" name="crescent" />
          <span v-else>Crear reserva</span>
        </ion-button>
      </form>
    </ion-content>

    <ion-content v-else>
      <div class="ion-padding ion-text-center tg-muted">
        <p>Primero elige un horario en Disponibilidad.</p>
        <ion-button router-link="/tabs/disponibilidad" router-direction="back">Ver horarios</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { bookingsApi } from '@/api/endpoints';
import { ApiError, errorMessage } from '@/api/http';
import { isSharedSlot, type Channel, type CreateBookingPayload, type PrivateSlot } from '@/api/types';
import { localToUtcIso, longDate } from '@/lib/format';
import { CHANNEL_LABEL } from '@/lib/labels';
import { bookingDraft as draft, clearDraft } from '@/stores/bookingDraft';
import { rememberBooking } from '@/stores/recentBookings';

const router = useRouter();

const form = reactive({
  name: '',
  phone: '',
  email: '',
  country: 'MX',
  channel: 'counter' as Channel,
  agencyRef: '',
  cruise: '',
  allAboard: '',
  notes: '',
});
const assetId = ref('');
const saving = ref(false);
const apiError = ref<ApiError | null>(null);
const generalError = ref('');

const privateSlot = computed(() => (draft.slot && !isSharedSlot(draft.slot) ? (draft.slot as PrivateSlot) : null));
const assetLine = computed(() => {
  const s = draft.slot;
  if (!s) return '';
  if (isSharedSlot(s)) return `${s.asset} · ${s.seats_left} lugares libres`;
  return s.assets.length === 1 ? s.assets[0].name : 'Embarcación por asignar';
});

/** Aviso si el tour termina menos de 60 min antes del all aboard. */
const cruiseWarning = computed(() => {
  if (!form.allAboard || !draft.slot || !draft.service) return '';
  const end = new Date(draft.slot.starts_at).getTime() + draft.service.duration_minutes * 60_000;
  const aboard = new Date(localToUtcIso(draft.date, form.allAboard)).getTime();
  const margin = Math.round((aboard - end) / 60_000);
  if (margin < 0) return 'El tour termina después del all aboard. El cliente perdería su barco.';
  if (margin < 60) return `El tour termina solo ${margin} min antes del all aboard.`;
  return '';
});

const err = (f: string) => apiError.value?.field(f);
const invalid = (f: string) => ({ 'ion-invalid ion-touched': !!err(f) });
const orNull = (v: string) => v.trim() || null;

async function submit() {
  if (!draft.service || !draft.slot) return;
  apiError.value = null;
  generalError.value = '';
  if (!form.name.trim()) {
    apiError.value = new ApiError(422, '', { 'customer.name': ['Escribe el nombre del cliente.'] });
    return;
  }

  const slot = draft.slot;
  const payload: CreateBookingPayload = {
    adults: draft.adults,
    children: draft.children,
    channel: form.channel,
    customer: {
      name: form.name.trim(),
      email: orNull(form.email),
      phone: orNull(form.phone),
      country: orNull(form.country.toUpperCase()),
    },
    cruise_ship: orNull(form.cruise),
    all_aboard_at: form.allAboard ? localToUtcIso(draft.date, form.allAboard) : null,
    agency_reference: form.channel === 'agency' ? orNull(form.agencyRef) : null,
    notes: orNull(form.notes),
  };
  if (isSharedSlot(slot)) payload.departure_id = slot.departure_id;
  else {
    payload.service_id = draft.service.id;
    payload.starts_at = slot.starts_at;
    if (assetId.value) payload.asset_id = assetId.value;
  }

  saving.value = true;
  try {
    // Misma clave en cada reintento: si la primera llegó, la API devuelve esa reserva y no crea otra.
    const booking = await bookingsApi.create(payload, draft.idempotencyKey);
    rememberBooking(booking);
    clearDraft();
    router.replace(`/tabs/reservas/${booking.code}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const alert = await alertController.create({
        header: 'Ya no hay lugar',
        message: e.message,
        buttons: [{ text: 'Ver horarios', handler: () => router.back() }],
      });
      await alert.present();
    } else if (e instanceof ApiError && Object.keys(e.errors).length) {
      apiError.value = e;
      generalError.value = 'Revisa los campos marcados.';
    } else {
      generalError.value = errorMessage(e);
    }
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.group {
  display: grid;
  gap: 12px;
}
.group h2 {
  margin: 0;
}
.group ion-item {
  --padding-start: 0;
  --background: transparent;
}
.fine {
  margin: 0;
  font-size: 13px;
  text-align: center;
}
.warn {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--tg-warn-bg);
  color: var(--tg-warn-fg);
  font-size: 14px;
  font-weight: 500;
}
.error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--tg-bad-bg);
  color: var(--tg-bad-fg);
}
</style>
