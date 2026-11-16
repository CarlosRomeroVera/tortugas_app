<template>
  <div class="demo-banner" role="note">
    <ion-icon :icon="flaskOutline" aria-hidden="true" />
    <span><b>Datos de prueba.</b> {{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { flaskOutline } from 'ionicons/icons';

withDefaults(defineProps<{ text?: string }>(), {
  text: 'El backend aún no tiene este endpoint; los cambios se guardan solo en este teléfono.',
});
</script>

<style scoped>
.demo-banner {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 12px 16px 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px dashed var(--ion-color-warning-shade);
  background: var(--tg-warn-bg);
  color: var(--tg-warn-fg);
  font-size: 13px;
  line-height: 1.35;
}
ion-icon {
  flex: none;
  font-size: 18px;
  margin-top: 1px;
}
</style>
