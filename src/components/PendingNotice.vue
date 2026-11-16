<template>
  <div class="ion-padding pending">
    <ion-icon :icon="constructOutline" aria-hidden="true" />
    <h2>{{ title }}</h2>
    <p>Esta pantalla depende de un endpoint que aún no existe en el backend (ver docs/API.md, sección 7).</p>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { constructOutline } from 'ionicons/icons';

defineProps<{ title: string }>();
</script>

<style scoped>
.pending {
  text-align: center;
  color: var(--tg-muted);
  margin-top: 15vh;
}
ion-icon {
  font-size: 48px;
  color: var(--ion-color-primary);
}
h2 {
  color: var(--ion-text-color);
  font-weight: 700;
}
</style>
