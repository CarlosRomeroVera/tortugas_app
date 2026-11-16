import { ref } from 'vue';

/** ¿Hay red? Aproximado: `navigator.onLine` no garantiza que el servidor responda. */
export const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);

if (typeof window !== 'undefined') {
  const update = () => (online.value = navigator.onLine);
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}
