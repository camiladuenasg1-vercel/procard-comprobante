# PROCARD · Comprobante público

Landing pública, de una sola pantalla, que muestra el comprobante de una
operación de cobro de PROCARD. Existe para estandarizar cómo se ve un
comprobante fuera de la SuperApp: el comercio muestra su teléfono con el
recibo de un cobro por Tap2Phone, el cliente escanea el QR chico que aparece
ahí, y este sitio le muestra el mismo comprobante en su propio celular.

Repo aparte del resto del ecosistema PROCARD (`procard-infra`,
`procard-backoffice`, `procard-superapp`, `procard-portal`) porque es la
única superficie pensada para ser vista por alguien que **no** es el
comercio ni el equipo de PROCARD — no necesita login, no necesita el marco
de dispositivo (`DevicePreview`) de la SuperApp, y se despliega como
proyecto de Vercel independiente.

## Cómo funciona (sin backend)

Todos los datos del comprobante viajan codificados como query params en la
URL que lleva el QR — no hay base de datos ni API detrás:

```
https://<este-deploy>.vercel.app/?ref=OP-ABC123&monto=150000&canal=tap2phone&marca=Visa&tarjeta=4321&fecha=2026-09-24T15:30:00.000Z
```

| Param | Significado |
|---|---|
| `ref` | N.º de operación (`purchaseNumber` en la transacción real de RedPontis) |
| `monto` | Importe en guaraníes, sin decimales |
| `canal` | `tap2phone` / `pago_link` / `qr` |
| `marca` | Marca de la tarjeta (Visa, Mastercard) — sólo Tap2Phone |
| `tarjeta` | Últimos 4 dígitos — sólo Tap2Phone |
| `fecha` | ISO 8601, momento del cobro |

Es el mismo criterio que ya usaba `procard-superapp/src/app/(app)/comprobante`
antes de este repo (esa pantalla no tiene backend de pagos real todavía —
ver `procard-infra/docs/REGLAS-DE-NEGOCIO.md` — así que codificar el
comprobante en la URL es coherente con el resto del prototipo, no un atajo
propio de este repo).

**Límite conocido, explícito**: cualquiera que arme una URL con estos params
puede generar un comprobante "válido" en apariencia — no hay firma ni
verificación contra una transacción real. Aceptable para un prototipo de
demostración; **no** usar este mecanismo si se integra un adquirente real
sin agregar autenticación de la URL (ej. un hash firmado del lado del
servidor, o resolver por ID contra una tabla real en vez de por query
params).

## De dónde sale el QR

`procard-superapp`, en el comprobante que se muestra después de un cobro
por Tap2Phone (`src/app/(app)/movimientos/page.tsx`, `ReceiptContent`),
arma esa misma URL con los datos de la operación y la codifica en un QR
chico dentro del propio recibo. Sólo Tap2Phone: es el único canal con
tarjeta presente, donde "escanear el comprobante" es un gesto conocido de
cualquier POS real. Pago Link y QR estático ya tienen su propio mecanismo
de comprobante/comparte dentro de la app.

## Stack

Next.js 16 + Tailwind v4, sin Supabase, sin autenticación, sin
`DevicePreview`. Paleta de marca (`--primary #1e5c3f`, `--success #227a4a`)
tomada de `procard-superapp/src/app/brand.css` para que el comprobante se
vea igual aunque el dominio sea distinto.

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy

Vercel, proyecto propio (`procard-comprobante`), deploy automático al hacer
push a `main`. Repo público en GitHub — no requiere las variables de
entorno de Supabase que sí necesitan los otros 4 repos del ecosistema.
