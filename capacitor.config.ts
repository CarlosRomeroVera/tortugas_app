import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Tortugas Ops',
  webDir: 'dist',
  // Android bloquea HTTP sin cifrar. Solo en desarrollo se permite para hablar con `php artisan serve`.
  // Para producción (HTTPS) ejecuta `NODE_ENV=production npx cap sync`.
  ...(process.env.NODE_ENV !== 'production' && { server: { cleartext: true } }),
};

export default config;
