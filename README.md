# HYPE Producción — Directa

Primer módulo del sistema de producción de HYPE printlab, hecho a partir del circuito real de trabajo de la planilla "PRODUCCION 2026" (solapa DIRECTA), pero repensado por rol para que sea más automático y menos propenso a error que editar una fila compartida en Drive.

## Cómo está pensado

Cada renglón (`ordenes_directa`) es un diseño dentro de un pedido. Un mismo `nro_ot` puede repetirse en varios renglones (un pedido con varios diseños/telas).

El circuito por rol, tal como me lo describiste:

| Rol | Completa |
|---|---|
| **Diseño** | alta del pedido (fecha, equipo, perfil, tipo OT, nro OT, cliente, diseño, mts pedidos, tela) + aprobación (`aprob`) + si requiere postratado (`post`) |
| **Administración** | anticipo, ¿entregar?, tipo de remito |
| **Impresión** (operario) | quién imprimió + mts impresos, en el momento de imprimir |
| **Preparación/Terminación** | tela lista (`prep`), quién fijó + fecha fin, nº de remito, bultos, estado de entrega, quién entregó, quién recibió, fecha de entrega |

### Qué cambié respecto a la planilla

- **"PROD" ya no se completa a mano.** Es una columna calculada (`puede_producir`) a partir de anticipo + aprobación + tela lista. La "celda auxiliar" que armabas para juntar esas 3 variables ya no hace falta.
- **Nro. OT automático y correlativo.** En vez de inferir "cliente distinto a la fila anterior", hay un botón explícito: "Nuevo pedido" (genera el próximo número) o "Agregar diseño a un pedido existente" (elegís de una lista).
- **Pantallas separadas por rol.** Diseño, Administración, Impresión y Preparación/Terminación ven y editan solo lo que les corresponde, en vez de una planilla compartida donde cualquiera puede tocar cualquier columna.
- **Historial automático.** Cada aprobación, pago de anticipo, tela lista, impresión, fijación y entrega queda registrado solo (tabla `ordenes_directa_eventos`), sin que nadie tenga que anotarlo.
- **Dashboard de excepciones**: qué está bloqueado y por qué falta exactamente (en vez de tener que mirar colores en miles de filas).

### Integración con Stock (ya activa)

Esta app y la de Stock comparten el mismo proyecto Supabase, así que:

- Al escribir el **Cliente** en el alta de Diseño, aparecen sugerencias tomadas de la tabla `clientes` de Stock.
- Al elegir un cliente, se buscan automáticamente las telas que tiene disponibles en Stock (`ingresos` − `egresos`, agrupado por `id_hype`) y se muestran como tarjetas para elegir — seleccionando una se completan sola `tela` y `cod_tela`.
- Si los metros pedidos superan el stock disponible de esa tela, se marca en rojo y pide confirmación antes de guardar.
- Cuando Impresión carga los **mts impresos**, se genera automáticamente un **egreso real en Stock** (tabla `egresos`, estado "A producción") por esa cantidad — el stock se descuenta solo, no hay que ir a cargarlo de nuevo en la app de Stock.

Si en algún momento separan los proyectos de Supabase, esto deja de funcionar (el cliente y la tela vuelven a ser campos de texto libre) sin romper nada más.

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
