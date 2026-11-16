<template>
  <div class="stepper">
    <span class="label">{{ label }}</span>
    <div class="controls">
      <ion-button
        fill="outline"
        size="small"
        :aria-label="`Quitar ${label.toLowerCase()}`"
        :disabled="model <= min"
        @click="model = model - 1"
      >
        <ion-icon slot="icon-only" :icon="removeOutline" />
      </ion-button>
      <output class="value tg-num" :aria-label="label">{{ model }}</output>
      <ion-button
        fill="outline"
        size="small"
        :aria-label="`Agregar ${label.toLowerCase()}`"
        :disabled="model >= max"
        @click="model = model + 1"
      >
        <ion-icon slot="icon-only" :icon="addOutline" />
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue';
import { addOutline, removeOutline } from 'ionicons/icons';

withDefaults(defineProps<{ label: string; min?: number; max?: number }>(), { min: 0, max: 100 });
const model = defineModel<number>({ required: true });
</script>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.label {
  font-size: 15px;
  font-weight: 500;
}
.controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.controls ion-button {
  --border-radius: 10px;
  min-width: 44px;
  min-height: 44px;
  margin: 0;
}
.value {
  min-width: 32px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
}
</style>
