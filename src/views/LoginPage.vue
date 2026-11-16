<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="login">
        <header class="brand">
          <svg width="56" height="56" viewBox="0 0 34 34" fill="none" aria-hidden="true">
            <circle cx="17" cy="17" r="15" stroke="#5FD3EE" stroke-width="2" />
            <path
              d="M10 19c2-6 12-6 14 0M12 19c0 3 2 5 5 5s5-2 5-5M17 9v4M13 12l-2-2M21 12l2-2"
              stroke="#FFFFFF"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <div>
            <div class="name">TORTUGAS</div>
            <div class="sub">OPERACIONES</div>
          </div>
        </header>

        <form class="tg-card form" novalidate @submit.prevent="submit">
          <h1>Iniciar sesión</h1>

          <ion-input
            v-model="email"
            label="Correo"
            label-placement="stacked"
            fill="outline"
            type="email"
            inputmode="email"
            autocomplete="username"
            autocapitalize="off"
            :error-text="fieldError('email')"
            :class="{ 'ion-invalid ion-touched': !!fieldError('email') }"
            required
          />
          <ion-input
            v-model="password"
            label="Contraseña"
            label-placement="stacked"
            fill="outline"
            type="password"
            autocomplete="current-password"
            :error-text="fieldError('password')"
            :class="{ 'ion-invalid ion-touched': !!fieldError('password') }"
            required
          >
            <ion-input-password-toggle slot="end" />
          </ion-input>

          <p v-if="generalError" class="error" role="alert">{{ generalError }}</p>

          <ion-button type="submit" expand="block" class="tg-big-btn" :disabled="loading">
            <ion-spinner v-if="loading" name="crescent" />
            <span v-else>Entrar</span>
          </ion-button>
        </form>

        <p class="hint">Si olvidaste tu contraseña, pide a coordinación que la restablezca.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonInput, IonInputPasswordToggle, IonPage, IonSpinner } from '@ionic/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { ApiError, errorMessage } from '@/api/http';
import { homeFor } from '@/router';
import { session } from '@/stores/session';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<ApiError | null>(null);
const generalError = ref('');

const fieldError = (name: string) => error.value?.field(name);

async function submit() {
  error.value = null;
  generalError.value = '';
  if (!email.value || !password.value) {
    generalError.value = 'Escribe tu correo y tu contraseña.';
    return;
  }
  loading.value = true;
  try {
    const user = await session.login(email.value.trim(), password.value);
    password.value = '';
    router.replace(homeFor(user.roles));
  } catch (e) {
    if (e instanceof ApiError && Object.keys(e.errors).length) error.value = e;
    else generalError.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
ion-content {
  --background: var(--tg-navy);
}
.login {
  min-height: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: calc(48px + env(safe-area-inset-top)) 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #ffffff;
}
.brand .name {
  font-weight: 800;
  font-size: 28px;
  letter-spacing: 0.5px;
  line-height: 1;
}
.brand .sub {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 3px;
  color: #8fe0f3;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}
.form h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}
.error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--tg-bad-bg);
  color: var(--tg-bad-fg);
  font-size: 14px;
}
.hint {
  margin: 0;
  color: #cde7f1;
  font-size: 13px;
  text-align: center;
}
</style>
