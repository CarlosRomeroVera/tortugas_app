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
| Capitán | Mis salidas, etapas del tour, pase de lista, incidentes, horómetro | **Datos de prueba** (`src/demo/crewDemo.ts`) |
| Chofer | Mis recogidas | **Datos de prueba** |

Las pantallas de capitán y chofer esperan los endpoints de la sección 7 de `docs/API.md`. Con `VITE_CREW_DEMO=false` muestran un aviso en lugar de los datos de prueba. Sus eventos se guardan en `src/lib/eventQueue.ts` con `client_uuid` y `occurred_at`, listos para `POST /sync/events`.
