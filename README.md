# HYPE Producción — Directa

Primer módulo del sistema de producción de HYPE printlab, hecho a partir del circuito real de trabajo de la planilla "PRODUCCION 2026" (solapa DIRECTA), pero repensado por rol para que sea más automático y menos propenso a error que editar una fila compartida en Drive.

## Cómo está pensado

Cada renglón (`ordenes_directa`) es un diseño dentro de un pedido. Un mismo `nro_ot` puede repetirse en varios renglones (un pedido con varios diseños/telas).

El circuito por rol, tal como me lo describiste:

| Rol | Completa |
|---|---|
| **Diseño** | alta del pedido (fecha, equipo, perfil, tipo OT, nro OT, cliente, diseño, mts pedidos, tela) + aprobación (`aprob`) + si requiere postratado (`post`) |
| **Administración** | anticipo (pantalla propia, con lista de pendientes) |
| **Impresión / Preparación / Terminación** | todo lo demás (imp, mts impresos, prep, fijación, fecha fin, remito, bultos, entrega) se completa directamente en la tabla de **Producción**, que pueden ver y editar todos los roles |

Los paneles separados de Impresión y de Preparación/Terminación se eliminaron: como Producción ya permite que cualquier rol edite cualquier celda, esas dos pantallas quedaron redundantes.

### Qué cambié respecto a la planilla

- **"PROD" ya no se completa a mano.** Es una columna calculada (`puede_producir`) a partir de anticipo + aprobación + tela lista. La "celda auxiliar" que armabas para juntar esas 3 variables ya no hace falta.
- **Nro. OT automático y correlativo.** En vez de inferir "cliente distinto a la fila anterior", hay un botón explícito: "Nuevo pedido" (genera el próximo número) o "Agregar diseño a un pedido existente" (elegís de una lista).
- **Historial automático.** Cada aprobación, pago de anticipo, tela lista, impresión, fijación y entrega queda registrado solo (tabla `ordenes_directa_eventos`), sin que nadie tenga que anotarlo. Se puede filtrar por cliente o diseño.
- **Dashboard de excepciones**: qué está bloqueado y por qué falta exactamente (en vez de tener que mirar colores en miles de filas).

### Integración con Stock (ya activa)

Esta app y la de Stock comparten el mismo proyecto Supabase, así que:

- Al escribir el **Cliente** en el alta de Diseño, aparecen sugerencias tomadas de la tabla `clientes` de Stock.
- Al elegir un cliente, se buscan automáticamente las telas que tiene disponibles en Stock (`ingresos` − `egresos`, agrupado por `id_hype`) y se muestran como tarjetas para elegir — seleccionando una se completan sola `tela` y `cod_tela`.
- Si los metros pedidos superan el stock disponible de esa tela, se marca en rojo y pide confirmación antes de guardar.
- Cuando Impresión carga los **mts impresos**, se genera automáticamente un **egreso real en Stock** (tabla `egresos`, estado "A producción") por esa cantidad — el stock se descuenta solo, no hay que ir a cargarlo de nuevo en la app de Stock. Ese egreso queda vinculado a la OT (`orden_id`).
- Cuando Preparación/Terminación (o Producción) carga el **Nº de RTO** (remito de entrega), **quién entregó** o **quién recibió**, esos valores se escriben automáticamente en el/los egreso(s) de Stock generados para esa OT — no hace falta cargarlos dos veces.

Si en algún momento separan los proyectos de Supabase, esto deja de funcionar (el cliente y la tela vuelven a ser campos de texto libre) sin romper nada más.

**Requiere columnas nuevas en `egresos` (tabla de Stock):** correr una sola vez en el SQL Editor de Supabase:

```sql
alter table egresos add column if not exists orden_id bigint;
alter table egresos add column if not exists remito text;
alter table egresos add column if not exists entrego text;
alter table egresos add column if not exists recibio text;
create index if not exists idx_egresos_orden_id on egresos(orden_id);
```

Nota: los egresos que ya existían antes de este cambio no van a tener `orden_id`, así que el Nº de RTO no se les va a poder completar solo (solo aplica para egresos generados de acá en adelante).

### Pendiente

- Los operarios de Impresión (Tomás, Néstor, Cache, Ricky) y Fijación (Mati, Leo, Ciro, Lautaro) están como listas fijas en `lib/types.ts`. Si preferís que salgan de la tabla `empleados` de Stock (para no tocar código cada vez que cambia el equipo), lo cambiamos fácil.

## 1. Supabase

1. [supabase.com](https://supabase.com) → **New project**.
2. **SQL Editor** → correr `../supabase-schema.sql` (crea `ordenes_directa`, la secuencia/función de numeración de OT, y `ordenes_directa_eventos`).
3. Si es un proyecto separado del de Stock, además necesitás `usuarios` (login/roles) y `empleados` — el bloque comentado al final del SQL te da el mínimo para arrancar.
4. **Authentication → Users**: crear los usuarios que van a loguearse (mismo email que en `usuarios`).
5. **Project Settings → API**: copiar `Project URL` y `anon public key`.

## 2. Local

```bash
cd hype-produccion
npm install
cp .env.example .env.local
# completar con la URL y anon key de Supabase
npm run dev
```

## 3. Vercel

1. Subir esta carpeta a un repo de GitHub.
2. En Vercel → **Add New Project** → importar el repo.
3. Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Environment Variables.
4. Deploy.

## Roles esperados en `usuarios.rol`

`admin` (ve todo), `diseno`, `administrativo`, `operario`, `encargado` (Preparación/Terminación), más `logistica` y `comercial` que por ahora solo ven Dashboard e Historial.

## Próximos pasos

Sublimación y Muestras Directa todavía no están relevadas — cuando terminemos de mapear esos circuitos, se agregan como tablas equivalentes (`ordenes_sublimacion`, `muestras_directa`) siguiendo el mismo patrón.
