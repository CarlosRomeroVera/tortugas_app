<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/salidas" text="" />
        </ion-buttons>
        <ion-title>Mi salida</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="dep">
      <ion-refresher slot="fixed" @ion-refresh="pull($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="tg-hero">
        <span class="tg-eyebrow">{{ dep.asset.name }} · {{ dep.code }}</span>
        <h1>{{ dep.service.name }}</h1>
        <p class="tg-num">
          {{ dep.pax.booked }} pax · {{ dep.local_time }} – {{ dep.local_end_time }} · {{ longDate(dep.local_date) }}
        </p>
      </div>

      <div class="tg-stack">
        <p v-if="dep.status === 'cancelled'" class="tg-card banner danger" role="alert">
          Esta salida fue cancelada por coordinación.
        </p>
        <p v-if="error" class="stale small">{{ error }} Mostrando lo guardado a las {{ fetchedAt }}.</p>

        <section class="tg-card current" aria-live="polite">
          <span class="tg-eyebrow">
            {{ dep.current_stage ? `Etapa ${dep.currentPosition} de ${dep.stages.length}` : 'Por iniciar' }}
          </span>
          <span class="name">{{ dep.current_stage?.name ?? 'Salida sin iniciar' }}</span>
          <SyncStatus :departure-id="dep.id" />
        </section>

        <ol class="steps">
          <li v-for="s in dep.stages" :key="s.id" :class="{ done: s.done, now: s.position === dep.currentPosition }">
            <button type="button" class="step" :disabled="s.done || locked" @click="mark(s)">
              <span class="dot tg-num" aria-hidden="true">
                <ion-icon v-if="s.done" :icon="checkmark" />
                <template v-else>{{ s.position }}</template>
              </span>
              <span class="label">
                {{ s.name }}
                <small v-if="s.requires_reading" class="tg-muted"> · pide {{ reading.name }}</small>
              </span>
              <span class="at tg-num tg-muted">
                <ion-icon v-if="s.unsynced" :icon="cloudUploadOutline" aria-label="Sin enviar" />
                {{ s.reached_at ? localTime(s.reached_at) : s.done ? 'saltada' : '' }}
              </span>
            </button>
          </li>
        </ol>

        <div class="actions">
          <ion-button fill="outline" color="secondary" class="half" :router-link="`/tabs/salidas/${dep.id}/manifiesto`">
            Pase de lista {{ dep.pax.checked_in }}/{{ dep.pax.booked }}
          </ion-button>
          <ion-button fill="outline" color="danger" class="half" @click="fault">Reportar falla</ion-button>
        </div>

        <section class="tg-card info small">
          <div>
            <b>Tripulación:</b>
            <span v-for="(c, i) in dep.crew" :key="i">
              {{ i ? ', ' : ' ' }}{{ c.name }} ({{ STAFF_ROLE_LABEL[c.role].toLowerCase() }})
            </span>
          </div>
          <div class="tg-num">
            <b>{{ capitalize(reading.name) }}:</b>
            {{ dep.asset.reading.current ?? '—' }} {{ reading.unit }}
          </div>
          <div v-if="dep.notes"><b>Notas:</b> {{ dep.notes }}</div>
        </section>
      </div>
    </ion-content>

    <ion-footer v-if="dep">
      <div class="footer">
        <ion-button v-if="next && !locked" expand="block" color="tertiary" class="tg-big-btn" @click="mark(next)">
          Marcar: {{ next.name }}
        </ion-button>
        <ion-button v-else expand="block" color="primary" class="tg-big-btn" disabled>
          {{ dep.status === 'cancelled' ? 'Salida cancelada' : 'Salida finalizada' }}
        </ion-button>
        <span class="tg-muted small">Funciona sin señal: se envía al recuperar conexión.</span>
      </div>
    </ion-footer>

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
  actionSheetController,
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  type RefresherCustomEvent,
  toastController,
} from '@ionic/vue';
import { checkmark, cloudUploadOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import type { FaultSeverity } from '@/api/types';
import SyncStatus from '@/components/SyncStatus.vue';
import { eventQueue } from '@/lib/eventQueue';
import { localTime, longDate } from '@/lib/format';
import { READING, STAFF_ROLE_LABEL } from '@/lib/labels';
import { cachedDetail, crew, departureView, loadDetail, markStage, reportFault, type StageView } from '@/stores/crew';

const route = useRoute();
const id = String(route.params.id);

const loading = ref(false);
const error = ref<string | null>(null);
/** 403/404: ya no eres de la tripulación o la salida no existe; no se muestra la caché. */
const fatal = ref(false);

const dep = computed(() => {
  void eventQueue.pending.length;
  void crew.details[id];
  return fatal.value ? null : departureView(id);
});
const fetchedAt = computed(() => (crew.details[id] ? localTime(crew.details[id].fetchedAt) : ''));
const next = computed(() => dep.value?.stages.find((s) => !s.done));
const locked = computed(() => dep.value?.status === 'cancelled' || dep.value?.status === 'completed');
const reading = computed(() => READING[dep.value?.asset.reading.unit ?? 'hours']);
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

async function load() {
  void cachedDetail(id); // en paralelo con la API: muestra lo guardado mientras responde
  loading.value = true;
  const r = await loadDetail(id);
  fatal.value = r.fatal;
  error.value = r.fatal || !crew.details[id] ? r.error : r.error && 'No se pudo actualizar.';
  loading.value = false;
}

async function pull(ev: RefresherCustomEvent) {
  await load();
  await ev.target.complete();
}

onIonViewWillEnter(load);

const tap = () => void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);

async function confirm(header: string, message: string, ok: string, cancel = 'Cancelar'): Promise<boolean> {
  const alert = await alertController.create({
    header,
    message,
    buttons: [
      { text: cancel, role: 'cancel' },
      { text: ok, role: 'confirm' },
    ],
  });
  await alert.present();
  return (await alert.onDidDismiss()).role === 'confirm';
}

async function mark(stage: StageView) {
  const d = dep.value;
  if (!d || stage.done || locked.value) return;

  const skipped = d.stages.filter((s) => !s.done && s.position < stage.position);
  if (
    skipped.length &&
    !(await confirm(
      'Saltar etapas',
      `Se marcará «${stage.name}» y quedarán saltadas: ${skipped.map((s) => s.name).join(', ')}. Las etapas no se pueden regresar.`,
      'Marcar',
    ))
  )
    return;

  const missing = d.pax.booked - d.pax.checked_in;
  if (
    stage.position > 1 &&
    d.currentPosition <= 1 &&
    missing > 0 &&
    !(await confirm(
      'Pase de lista incompleto',
      `Faltan ${missing} de ${d.pax.booked} pasajeros. ¿Marcar «${stage.name}» de todos modos?`,
      'Marcar',
      'Volver',
    ))
  )
    return;

  if (stage.requires_reading) {
    const value = await askReading(stage);
    if (value === null) return;
    markStage(d, stage, value);
  } else {
    markStage(d, stage);
  }
  tap();
}

async function askReading(stage: StageView): Promise<number | null> {
  const d = dep.value!;
  const r = reading.value;
  const current = d.asset.reading.current;
  const base = `Anota la lectura del ${r.name} de ${d.asset.name}.${current !== null ? ` Última registrada: ${current} ${r.unit}.` : ''}`;

  let value: number | null = null;
  const alert = await alertController.create({
    header: stage.name,
    message: base,
    inputs: [{ name: 'v', type: 'number', placeholder: r.placeholder, min: 0, attributes: { inputmode: 'decimal' } }],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Guardar',
        handler: (data: { v?: string }) => {
          const n = Number(String(data.v ?? '').replace(',', '.'));
          if (!data.v || !Number.isFinite(n) || n < 0) return false;
          if (current !== null && n < current) {
            alert.message = `${base} La lectura no puede ser menor que ${current} ${r.unit}.`;
            return false; // mantiene el diálogo abierto
          }
          value = n;
        },
      },
    ],
  });
  await alert.present();
  await alert.onDidDismiss();
  return value;
}

async function fault() {
  const d = dep.value;
  if (!d) return;

  const sheet = await actionSheetController.create({
    header: `Falla en ${d.asset.name}`,
    subHeader: 'Coordinación lo verá en la ficha de la unidad.',
    buttons: [
      { text: 'Puede operar (menor)', data: 'minor' },
      { text: 'No debe salir (bloqueante)', role: 'destructive', data: 'blocking' },
      { text: 'Cancelar', role: 'cancel' },
    ],
  });
  await sheet.present();
  const severity = (await sheet.onDidDismiss()).data as FaultSeverity | undefined;
  if (!severity) return;

  const alert = await alertController.create({
    header: severity === 'blocking' ? 'Falla bloqueante' : 'Falla menor',
    message: '¿Qué falla? Sé específico: pieza, síntoma, desde cuándo.',
    inputs: [
      {
        name: 'text',
        type: 'textarea',
        placeholder: 'La bomba de achique no arranca…',
        attributes: { maxlength: 2000 },
      },
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Reportar',
        handler: (v: { text?: string }) => {
          const text = v.text?.trim();
          if (!text) return false;
          reportFault(d, severity, text);
          tap();
          void toastController
            .create({
              message: 'Falla registrada. Se enviará a coordinación.',
              duration: 2500,
              color: 'medium',
              position: 'top',
            })
            .then((t) => t.present());
        },
      },
    ],
  });
  await alert.present();
}
</script>

<style scoped>
.current {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.current .name {
  font-size: 22px;
  font-weight: 800;
}
.small {
  font-size: 13px;
}
.center {
  text-align: center;
  margin-top: 15vh;
}
.banner {
  margin: 0;
  font-weight: 600;
}
.banner.danger {
  color: var(--ion-color-danger);
}
.stale {
  margin: 0;
  color: var(--tg-warn-fg);
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.step {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px;
  min-height: 44px;
  font-size: 15px;
  color: var(--tg-muted);
  cursor: pointer;
}
.step:disabled {
  cursor: default;
}
.step:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  border-radius: 8px;
}
.done .step,
.now .step {
  color: var(--ion-text-color);
}
.now .label {
  font-weight: 800;
}
.dot {
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--tg-line);
  color: var(--ion-text-color);
}
.done .dot {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.now .dot {
  background: var(--ion-color-tertiary);
  color: var(--ion-color-tertiary-contrast);
}
.label {
  flex: 1;
}
.at {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.half {
  --border-radius: 12px;
  min-height: 52px;
  margin: 0;
}
.info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.footer {
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--tg-surface);
  border-top: 1px solid var(--tg-line);
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
}
</style>
