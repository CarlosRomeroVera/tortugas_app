import { App as CapApp } from '@capacitor/app';
import { IonicVue, toastController } from '@ionic/vue';
import { createApp } from 'vue';

import App from './App.vue';
import { setUnauthorizedHandler } from './api/http';
import { configureSync, loadQueue, startAutoSync } from './lib/eventQueue';
import router from './router';
import { clearCrewCache, refreshDepartures } from './stores/crew';
import { session } from './stores/session';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Ionic Dark Mode: sigue al sistema. */
import '@ionic/vue/css/palettes/dark.system.css';

/* Tipografía empaquetada (la app debe verse bien sin señal). */
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/600.css';
import '@fontsource/rubik/700.css';
import '@fontsource/rubik/800.css';

/* Theme variables */
import './theme/variables.css';

// Cualquier 401 borra la sesión y regresa al login. Los eventos sin enviar se conservan en el teléfono.
setUnauthorizedHandler(async () => {
  await session.clear();
  await clearCrewCache();
  router.replace('/login');
});

// Cola de eventos de capitán y chofer → POST /sync/events.
configureSync({
  userId: () => session.state.user?.id ?? null,
  onSynced: refreshDepartures,
  onRejected: (notices) => {
    for (const n of notices) {
      void toastController
        .create({ message: n.message, color: 'danger', duration: 6000, position: 'top', buttons: ['OK'] })
        .then((t) => t.present());
    }
  },
});

const app = createApp(App).use(IonicVue).use(router);

// La cola guardada se lee antes de montar: así ninguna pantalla ve (ni pisa) una cola vacía.
Promise.all([router.isReady(), loadQueue()]).then(() => {
  app.mount('#app');
  startAutoSync((cb) => {
    void CapApp.addListener('appStateChange', ({ isActive }) => isActive && cb()).catch(() => undefined);
  });
});
