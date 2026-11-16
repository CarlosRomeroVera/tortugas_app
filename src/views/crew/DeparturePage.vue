<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/salidas" text="" />
        </ion-buttons>
        <ion-title>Mi tour</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="dep">
      <div class="tg-hero">
        <span class="tg-eyebrow">Mi tour · {{ dep.asset }}</span>
        <h1>{{ dep.service }}</h1>
        <p class="tg-num">{{ pax }} pax · {{ dep.local_start }} – {{ dep.local_end }} · {{ dep.dock }}</p>
      </div>
      <DemoBanner
        text="Las etapas se guardan en este teléfono; se enviarán cuando exista la sincronización en el backend."
      />

      <div class="tg-stack">
        <section class="tg-card current" aria-live="polite">
          <span class="tg-eyebrow">
            {{ dep.current < 0 ? 'Por iniciar' : `Etapa actual · ${dep.current + 1} de ${dep.stages.length}` }}
          </span>
          <span class="name">{{ dep.current < 0 ? 'Salida sin iniciar' : dep.stages[dep.current].name }}</span>
          <span class="tg-muted small">
            <template v-if="dep.current >= 0">Marcado {{ dep.stages[dep.current].at }} · </template>
            {{ online ? 'Con señal' : 'Sin señal' }} · {{ eventQueue.pending.length }}
            {{ eventQueue.pending.length === 1 ? 'evento' : 'eventos' }} en el teléfono
          </span>
        </section>

        <ol class="steps">
          <li v-for="(s, i) in dep.stages" :key="s.name" :class="{ done: i < dep.current, now: i === dep.current }">
            <span class="dot tg-num" aria-hidden="true">
              <ion-icon v-if="i < dep.current" :icon="checkmark" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="label">{{ s.name }}</span>
            <span class="at tg-num tg-muted">{{ s.at ?? '' }}</span>
          </li>
        </ol>

        <div class="actions">
          <ion-button fill="outline" color="secondary" class="half" :router-link="`/tabs/salidas/${dep.id}/manifiesto`">
            Pase de lista {{ boarded }}/{{ pax }}
          </ion-button>
          <ion-button fill="outline" color="tertiary" class="half" @click="incident">Incidente</ion-button>
        </div>
      </div>
    </ion-content>

    <ion-footer v-if="dep">
      <div class="footer">
        <ion-button v-if="nextStage" expand="block" color="tertiary" class="tg-big-btn" @click="advance">
          Marcar: {{ nextStage.name }}
        </ion-button>
        <ion-button v-else expand="block" color="primary" class="tg-big-btn" disabled>
          Tour finalizado{{ dep.engine_hours ? ` · horómetro ${dep.engine_hours} h` : '' }}
        </ion-button>
        <span class="tg-muted small">Funciona sin señal: se sincroniza al recuperar conexión.</span>
      </div>
    </ion-footer>

    <ion-content v-else>
      <p class="ion-padding tg-muted">No se encontró la salida.</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  toastController,
} from '@ionic/vue';
import { checkmark } from 'ionicons/icons';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import DemoBanner from '@/components/DemoBanner.vue';
import { advanceStage, findDeparture, reportIncident } from '@/demo/crewDemo';
import { eventQueue } from '@/lib/eventQueue';

const route = useRoute();
const dep = computed(() => findDeparture(String(route.params.id)));
const pax = computed(() => dep.value?.manifest.reduce((n, m) => n + m.pax, 0) ?? 0);
const boarded = computed(
  () => dep.value?.manifest.filter((m) => m.boarding === 'boarded').reduce((n, m) => n + m.pax, 0) ?? 0,
);
const nextStage = computed(() => (dep.value ? dep.value.stages[dep.value.current + 1] : undefined));

const online = ref(navigator.onLine);
const setOnline = () => (online.value = navigator.onLine);
onMounted(() => {
  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOnline);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', setOnline);
  window.removeEventListener('offline', setOnline);
});

async function advance() {
  const d = dep.value;
  const next = nextStage.value;
  if (!d || !next) return;

  if (next.asksEngineHours) {
    const alert = await alertController.create({
      header: 'Cierre de la salida',
      message: 'Anota la lectura del horómetro para el mantenimiento preventivo.',
      inputs: [
        { name: 'hours', type: 'number', placeholder: 'Horas de motor', min: 0, attributes: { inputmode: 'decimal' } },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar salida',
          handler: (v: { hours?: string }) => {
            const hours = Number(v.hours);
            if (!v.hours || !(hours >= 0)) return false; // mantiene el diálogo abierto
            advanceStage(d, hours);
            void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
          },
        },
      ],
    });
    await alert.present();
    return;
  }

  if (d.current === 0 && boarded.value < pax.value) {
    const alert = await alertController.create({
      header: 'Pase de lista incompleto',
      message: `Abordaron ${boarded.value} de ${pax.value} pasajeros. ¿Marcar «${next.name}» de todos modos?`,
      buttons: [
        { text: 'Ir al pase de lista', role: 'cancel' },
        { text: 'Marcar', handler: () => advanceStage(d) },
      ],
    });
    await alert.present();
    return;
  }

  advanceStage(d);
  void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
}

async function incident() {
  const d = dep.value;
  if (!d) return;
  const alert = await alertController.create({
    header: 'Reportar incidente',
    message: 'Falla mecánica, pasajero lesionado, clima… Coordinación lo verá al sincronizar.',
    inputs: [{ name: 'text', type: 'textarea', placeholder: '¿Qué pasó?' }],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Enviar',
        handler: (v: { text?: string }) => {
          if (!v.text?.trim()) return false;
          reportIncident(d.id, v.text.trim());
          void toastController
            .create({ message: 'Incidente guardado en el teléfono', duration: 2500, color: 'medium', position: 'top' })
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
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.steps li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px;
  font-size: 15px;
  color: var(--tg-muted);
}
.steps li.done,
.steps li.now {
  color: var(--ion-text-color);
}
.steps li.now .label {
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
