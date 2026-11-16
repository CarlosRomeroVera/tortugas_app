# API de Tortugas Ops para la app móvil (Ionic)

Notas para el código de la app. Backend: Laravel 12 + Sanctum, repo `tortugas_back`.
Estado: fase 1 (15-nov-2026). Todo lo de aquí está verificado contra el código y con llamadas reales.

## 1. Lo más importante

- Base URL: `{HOST}/api/v1`
- Autenticación: token Bearer (Sanctum). No hay cookies ni CSRF.
- Envía **siempre** `Accept: application/json`. Sin ese header, los errores pueden regresar HTML o redirecciones.
- Dinero en **centavos enteros** (`138000` = $1,380.00). Nunca uses flotantes.
- Fechas en **UTC ISO-8601** (`2026-11-16T13:30:00+00:00`). La hora local de operación es `America/Cancun` (UTC−5, sin horario de verano). Muchas respuestas ya traen `local_time` listo para mostrar.
- IDs en UUID (string). Excepción: `user.id`, que es entero.
- **Alcance actual:** hoy la API solo tiene login, logout, disponibilidad, reservas y pagos. Las reservas y los pagos son solo para personal de oficina. **Todavía no hay endpoints para capitán ni chofer** (ver sección 7).

## 2. Entornos

| Entorno | Base URL |
|---|---|
| Local, navegador en la misma Mac (`ionic serve`) | `http://localhost:8000/api/v1` |
| Emulador Android | `http://10.0.2.2:8000/api/v1` |
| Teléfono físico en la misma red | `http://<IP-de-la-Mac>:8000/api/v1`. El backend debe arrancar con `php artisan serve --host=0.0.0.0` |
| Producción | Por definir |

Guarda la base URL en `environment.ts`, no la escribas directamente en el código.

- **Android y HTTP:** Android bloquea el tráfico HTTP sin cifrar por defecto. En desarrollo hay que permitirlo (`android:usesCleartextTraffic="true"` o configurar `server.cleartext` en Capacitor). En producción se usará HTTPS.
- **CORS:** el backend usa la configuración por defecto de Laravel (`api/*`, cualquier origen). Como la app autentica con token Bearer y no con cookies, no hace falta configurar nada más.

## 3. Autenticación

### Iniciar sesión: `POST /auth/token`

Pública. Límite: 10 intentos por minuto (después responde 429).

```json
{ "email": "capitan@tortugas.test", "password": "password", "device_name": "iPhone de Rubén" }
```

`device_name` es obligatorio (máx. 100 caracteres). Úsalo para identificar el dispositivo, por ejemplo con el modelo de `@capacitor/device`.

**201**
```json
{
  "token": "1|rTZvRDYWfAXI37YB57HQtVnqhnZrkRHIe9vERRoV9a71360e",
  "user": { "id": 4, "name": "Rubén Canul", "roles": ["capitan"] }
}
```

**422** si las credenciales no son válidas:
```json
{ "message": "Correo o contraseña incorrectos.", "errors": { "email": ["Correo o contraseña incorrectos."] } }
```

- **Expiración:** el token no caduca solo. Dura hasta que se cierra sesión o alguien lo revoca.
- **Almacenamiento:** guárdalo en almacenamiento seguro (Keychain/Keystore, por ejemplo con `capacitor-secure-storage`), no en `localStorage`.
- **Uso:** envíalo en cada petición con `Authorization: Bearer <token>`. Lo más práctico es un interceptor HTTP.
- **401:** si cualquier llamada responde 401, borra el token y regresa al login.
- **Roles:** guarda `user.roles` para decidir qué pantallas mostrar. Los roles son: `admin`, `coordinacion`, `ventas`, `capitan`, `chofer`, `mantenimiento`.

### Cerrar sesión: `DELETE /auth/token`

Revoca solo el token del dispositivo actual y responde **204**.

### Usuarios de prueba (contraseña `password`)

`admin@tortugas.test`, `coordinacion@tortugas.test`, `ventas@tortugas.test`, `capitan@tortugas.test`, `chofer@tortugas.test`

## 4. Endpoints

Todos requieren el token. La columna "Quién" indica los roles que pueden usarlo; a los demás la API les responde 403.

| Método | Ruta | Quién |
|---|---|---|
| GET | `/availability` | Cualquier usuario autenticado |
| POST | `/bookings` | admin, coordinacion, ventas |
| GET | `/bookings/{code}` | admin, coordinacion, ventas |
| POST | `/bookings/{code}/cancel` | admin, coordinacion, ventas |
| POST | `/bookings/{code}/payments` | admin, coordinacion, ventas |

`{code}` es el código legible de la reserva (empieza con `R`), no el UUID.

### GET `/availability?service=&date=&pax=`

- `service`: slug o UUID de un servicio activo. Slugs de prueba: `snorkel-3-arrecifes`, `parasailing`, `jeep-tour` (compartidos) y `embarcacion-privada` (privado).
- `date`: fecha local en formato `YYYY-MM-DD`.
- `pax`: número de personas, de 1 a 100.

Si el servicio no existe responde 404.

**Servicio compartido:** cada horario es una salida ya programada con lugares que se venden por persona.
```json
{
  "service": { "id": "…", "slug": "snorkel-3-arrecifes", "name": "Snorkel 3 arrecifes", "shared": true,
               "duration_minutes": 150, "currency": "MXN", "price_adult_cents": 138000, "price_child_cents": 99000 },
  "date": "2026-11-16",
  "timezone": "America/Cancun",
  "slots": [
    { "departure_id": "…", "starts_at": "2026-11-16T13:30:00+00:00", "local_time": "08:30",
      "asset": "Carey I", "capacity": 24, "seats_left": 23, "available": true }
  ]
}
```
`available: false` significa que no alcanzan los lugares para `pax`. Muestra el horario deshabilitado.

**Servicio privado** (`shared: false`): la embarcación o el vehículo se reserva completo. Los horarios son horas de inicio cada 30 minutos, entre 08:00 y 18:00 hora local, en las que hay alguna unidad libre:
```json
{ "starts_at": "2026-11-16T14:00:00+00:00", "local_time": "09:00",
  "assets": [ { "id": "…", "name": "Laúd", "capacity": 8 } ], "available": true }
```
Esta consulta no aparta nada. El lugar solo queda asegurado cuando se crea la reserva.

### POST `/bookings`

Envía el header `Idempotency-Key: <uuid v4>` (máx. 100 caracteres). Genera una clave por cada intento de reserva y reutilízala en los reintentos. Si la petición se repite con la misma clave, la API devuelve la misma reserva con **200** en lugar de crear otra (la primera vez responde **201**). Esto evita reservas dobles cuando la señal es mala.

```json
{
  "departure_id": "…",
  "adults": 2,
  "children": 1,
  "channel": "counter",
  "customer": { "name": "Ana López", "email": "ana@example.com", "phone": "+529871234567", "country": "MX" },
  "cruise_ship": "Symphony of the Seas",
  "all_aboard_at": "2026-11-16T22:30:00Z",
  "pickup_location_id": null,
  "agency_reference": null,
  "notes": null
}
```

- **Compartido:** manda `departure_id`, que viene en los horarios de `/availability`.
- **Privado:** en lugar de `departure_id`, manda `service_id` + `starts_at` (UTC). `asset_id` es opcional; si no lo mandas, se asigna la unidad más chica que alcance.
- **Obligatorios:** `adults` (mínimo 1), `channel` y `customer.name`. `customer.country` va en código ISO de 2 letras.
- **`channel`:** `website` | `whatsapp` | `agency` | `counter` | `phone`.
- **Precio:** lo calcula el servidor. No mandes montos.
- **Estado:** la reserva se crea como `pending` y pasa a `confirmed` con el primer pago.

Respuesta: objeto `data` con el formato de reserva (abajo).

### GET `/bookings/{code}`

Devuelve `data` con el formato de reserva.

### POST `/bookings/{code}/cancel`

Cuerpo: `{ "reason": "Clima" }` (opcional, máx. 500 caracteres). Si el servicio es privado, también libera la unidad. Responde 200 con `data`.

### POST `/bookings/{code}/payments`

```json
{ "amount_cents": 50000, "currency": "MXN", "method": "cash", "usd_rate": 18.0, "provider": null, "provider_reference": null }
```

- **`currency`:** `MXN` | `USD`.
- **`method`:** `cash` | `card` | `transfer` | `online` | `agency_credit`.
- **`usd_rate`:** pesos por dólar. Solo se usa si pagan en USD; si no se manda, el servidor usa 18.00.
- **Restricción:** no se puede registrar un pago en una reserva cancelada.

Responde **201** con `data`, la reserva actualizada.

### Formato de reserva (`data`)

```json
{
  "id": "…", "code": "R-7KQ2MX", "status": "confirmed", "channel": "counter",
  "adults": 2, "children": 1, "pax": 3,
  "currency": "MXN", "total_cents": 375000, "paid_cents": 50000, "balance_cents": 325000,
  "cruise_ship": null, "all_aboard_at": null,
  "customer": { "name": "Ana López", "email": "ana@example.com", "phone": "+529871234567" },
  "departure": { "id": "…", "code": "…", "service": "Snorkel 3 arrecifes", "asset": "Carey I",
                 "starts_at": "2026-11-16T13:30:00+00:00", "local_time": "2026-11-16 08:30" },
  "payments": [ { "amount_cents": 50000, "currency": "MXN", "method": "cash", "status": "paid", "paid_at": "…" } ]
}
```

- **`status` de la reserva:** `pending` | `confirmed` | `cancelled` | `no_show` | `completed`.
- **`status` de un pago:** `pending` | `paid` | `failed` | `refunded`.
- **Saldos:** `paid_cents` y `balance_cents` ya vienen convertidos a la moneda de la reserva. No los recalcules en la app.

## 5. Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 401 | Sin token o token revocado | `{ "message": "Unauthenticated." }` → regresar al login |
| 403 | El rol no tiene permiso | `{ "message": "This action is unauthorized." }` |
| 404 | La reserva o el servicio no existe | `{ "message": "…" }` |
| 409 | Conflicto de negocio: sin lugares, unidad ocupada o fuera de servicio | `{ "message": "<texto en español para el usuario>" }` |
| 422 | Datos inválidos o regla de negocio (salida ya no admite reservas, reserva cancelada…) | `{ "message": "…", "errors": { "campo": ["…"] } }`. Las reglas de negocio no traen `errors` |
| 429 | Demasiados intentos de login | Espera un minuto |

- **Mensajes:** los de 409 y 422 están escritos para mostrarse tal cual al usuario.
- **409:** ante un 409, vuelve a consultar `/availability`, porque otro vendedor pudo haber ocupado el lugar.
- **Formulario:** si viene `errors`, pinta cada mensaje junto a su campo.
- **Errores 500:** en desarrollo (`APP_DEBUG=true`) la respuesta trae el stack trace. No lo muestres en la interfaz.

## 6. Recomendaciones para la app

- **Interceptor HTTP único:** que agregue la base URL, `Accept: application/json` y `Authorization`, y que maneje 401 → logout.
- **Horas:** muestra `local_time` cuando venga. Si tienes que convertir tú, usa `America/Cancun`, no la zona horaria del teléfono, porque muchos clientes son turistas o cruceristas con el reloj en otra zona.
- **Montos:** usa `Intl.NumberFormat('es-MX', { style: 'currency', currency })` sobre `cents / 100`.
- **Idempotencia:** genera la `Idempotency-Key` al abrir el resumen de la reserva y no la cambies en los reintentos.

## 7. Pendiente en el backend (aún no existe)

Para el uso de capitán y chofer, hoy solo funcionan el login y la disponibilidad. Faltan, entre otros:

- **Mis salidas del día:** salidas donde el usuario es tripulación, con embarcación o vehículo, horario y punto de recogida.
- **Manifiesto de una salida:** pasajeros, pax, crucero y hora de `all_aboard`, notas.
- **Abordaje y no-show:** marcar a los pasajeros en la app.
- **Avance de la salida:** iniciar y terminar la salida, y registrar sus etapas. El modelo ya tiene `service_stages`.
- **Mantenimiento:** reportar fallas y lecturas de horómetro u odómetro.
- **Catálogo de servicios:** listar servicios activos con slug y precios. Hoy la app tendría que tener los slugs fijos en el código.
- **Perfil:** `GET /me` para revalidar el token y obtener los roles al abrir la app.

Mientras esos endpoints no existan, no los simules: deja las pantallas detrás de una bandera o con datos de prueba en la app.
