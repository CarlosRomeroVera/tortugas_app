<template>
  <div class="sync" :class="{ warn: count > 0 && !!eventQueue.lastError }" role="status" aria-live="polite">
    <ion-icon :icon="icon" aria-hidden="true" :class="{ spin: eventQueue.syncing }" />
    <span class="text">{{ text }}</span>
    <button v-if="count > 0 && !eventQueue.syncing" type="button" class="now" @click="flush()">Enviar ahora</button>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { cloudDoneOutline, cloudOfflineOutline, cloudUploadOutline, syncOutline } from 'ionicons/icons';
import { computed } from 'vue';

import { eventQueue, flush, pendingFor } from '@/lib/eventQueue';
import { online } from '@/lib/online';

const props = defineProps<{ departureId?: string }>();

const count = computed(() => {
  void eventQueue.pending.length; // dependencia reactiva
  return pendingFor(props.departureId).length;
});

const icon = computed(() => {
  if (eventQueue.syncing) return syncOutline;
  if (!online.value) return cloudOfflineOutline;
  return count.value ? cloudUploadOutline : cloudDoneOutline;
});

const text = computed(() => {
  const n = count.value;
  const pend = `${n} ${n === 1 ? 'registro' : 'registros'} sin enviar`;
  if (eventQueue.syncing) return `Enviando ${pend.replace(' sin enviar', '')}…`;
  if (!online.value) return n ? `Sin señal · ${pend}` : 'Sin señal · todo guardado en el teléfono';
  if (n) return eventQueue.lastError ? `${pend} · ${eventQueue.lastError}` : pend;
  return 'Todo enviado';
});
</script>

<style scoped>
.sync {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--tg-muted);
  min-height: 32px;
}
.sync.warn {
  color: var(--tg-warn-fg);
}
ion-icon {
  flex: none;
  font-size: 18px;
}
.text {
  flex: 1;
}
.now {
  font: inherit;
  font-weight: 600;
  background: none;
  border: 0;
  color: var(--ion-color-primary);
  padding: 10px 4px;
  min-height: 44px;
  cursor: pointer;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
