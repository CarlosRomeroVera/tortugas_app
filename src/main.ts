import { IonicVue } from '@ionic/vue';
import { createApp } from 'vue';

import App from './App.vue';
import { setUnauthorizedHandler } from './api/http';
import router from './router';
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

// Cualquier 401 borra la sesión y regresa al login.
setUnauthorizedHandler(async () => {
  await session.clear();
  router.replace('/login');
});

const app = createApp(App).use(IonicVue).use(router);

router.isReady().then(() => {
  app.mount('#app');
});
