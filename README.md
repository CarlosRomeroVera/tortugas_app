# tortugas_app

App móvil de Tortugas Ops (Ionic Vue + Capacitor) para oficina, capitanes y choferes. Consume la API de `tortugas_back`; el contrato está en [docs/API.md](docs/API.md).

## Arranque

```bash
cp .env.example .env.local   # ajusta VITE_API_URL según el entorno
npm install
npm run dev
```

Usuarios de prueba (contraseña `password`): `ventas@`, `coordinacion@`, `admin@`, `capitan@`, `chofer@tortugas.test`.

## Qué pantallas usan la API real

| Rol | Pantallas | Estado |
|---|---|---|
| Todos | Login, Disponibilidad, Perfil / cerrar sesión | API real |
| admin, coordinación, ventas | Nueva reserva, detalle, pagos, cancelación | API real |
| Capitán | Mis salidas, etapas, pase de lista, fallas, horómetro | API real (`/me/departures`, `/sync/events`) |
| Chofer | Mis salidas, etapas, quién subió, fallas, odómetro | API real (mismos endpoints) |

Capitán y chofer trabajan sin señal: todo se guarda en la cola de `src/lib/eventQueue.ts` y se envía en lotes a `POST /sync/events` al recuperar conexión, al volver a primer plano y cada minuto. Las salidas y el manifiesto se guardan en el teléfono (`src/stores/crew.ts`). Ver `docs/API.md`, sección 7. Las corridas de traslado del chofer todavía no existen en el backend (sección 8).
